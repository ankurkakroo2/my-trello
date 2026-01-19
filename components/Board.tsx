"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { Task, TaskStatus } from "@/lib/types";
import { fetchWithRetry } from "@/lib/utils";
import { signOut } from "next-auth/react";
import {
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Done" },
];

// Clean theme colors
const WHITE = "#ffffff";
const GRAY_50 = "#f9fafb";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_300 = "#d1d5db";
const GRAY_400 = "#9ca3af";
const GRAY_500 = "#6b7280";
const GRAY_600 = "#4b5563";
const GRAY_700 = "#374151";
const GRAY_800 = "#1f2937";
const GRAY_900 = "#111827";
const BLUE_500 = "#3b82f6";
const BLUE_50 = "#eff6ff";
const BLUE_100 = "#dbeafe";
const GREEN_500 = "#22c55e";
const GREEN_50 = "#f0fdf4";
const RED_500 = "#ef4444";
const RED_50 = "#fef2f2";

const styles = {
  page: { minHeight: '100vh', backgroundColor: WHITE, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { position: 'sticky' as const, top: 0, zIndex: 40, backgroundColor: WHITE, borderBottom: `1px solid ${GRAY_200}`, padding: '16px 24px' },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  title: { fontSize: '20px', fontWeight: 600, color: GRAY_900, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  searchBox: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  searchInput: { width: '240px', paddingLeft: '36px', paddingRight: '12px', padding: '8px 12px 8px 36px', backgroundColor: WHITE, border: `1px solid ${GRAY_200}`, borderRadius: '8px', fontSize: '14px', color: GRAY_700, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  searchIcon: { position: 'absolute', left: '12px', color: GRAY_400, width: '16px', height: '16px', pointerEvents: 'none' },
  button: { padding: '8px 14px', backgroundColor: WHITE, border: `1px solid ${GRAY_200}`, color: GRAY_700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', borderRadius: '8px' },
  buttonHover: { backgroundColor: GRAY_50, borderColor: GRAY_300 },
  main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  boardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' },
  column: { backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, borderRadius: '12px', display: 'flex', flexDirection: 'column' as const, minHeight: '400px' },
  columnHeader: { padding: '16px', borderBottom: `1px solid ${GRAY_200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  columnTitle: { fontSize: '15px', fontWeight: 600, color: GRAY_700, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  taskCount: { fontSize: '13px', padding: '2px 8px', backgroundColor: GRAY_200, color: GRAY_600, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500, borderRadius: '12px' },
  columnContent: { padding: '12px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  addTaskInline: { padding: '12px', border: `1px solid ${GRAY_200}`, borderRadius: '8px', backgroundColor: WHITE },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: WHITE, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
};

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetchWithRetry("/api/tasks");
      if (response.ok) setTasks(await response.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetchWithRetry("/api/tags");
      if (response.ok) setTags(await response.json());
    } catch {}
  };

  useEffect(() => { fetchTasks(); fetchTags(); }, [fetchTasks]);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    not_started: filteredTasks.filter(t => t.status === "not_started"),
    in_progress: filteredTasks.filter(t => t.status === "in_progress"),
    complete: filteredTasks.filter(t => t.status === "complete"),
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(parseInt(event.active.id as string));
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = parseInt(active.id as string);
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overStatus = over?.data?.current?.status as TaskStatus | undefined;
    const newStatus = overStatus || activeTask.status;

    const updatedTasks = tasks.map(t => t.id === activeId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      await fetchWithRetry(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activeTask, status: newStatus, title: activeTask.title, description: activeTask.description || "", tags: activeTask.tags.map(t => t.name) }),
      });
    } catch {
      fetchTasks();
    }
  };

  const handleCreateTask = async (status: TaskStatus, data: { title: string; description: string; tags: string[] }) => {
    try {
      const response = await fetchWithRetry("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (!response.ok) throw new Error("Failed to create");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      setAddingToColumn(null);
    } catch {
      // Silent error handling
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span style={{ color: GRAY_500, fontSize: '14px' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>TicTac</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={styles.searchBox}>
              <MagnifyingGlassIcon style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              style={styles.button}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: WHITE, borderColor: GRAY_200 })}
            >
              <ArrowRightOnRectangleIcon style={{ width: '16px', height: '16px' }} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={styles.boardGrid}>
            {STATUSES.map((status) => (
              <Column
                key={status.value}
                status={status.value}
                label={status.label}
                tasks={tasksByStatus[status.value]}
                availableTags={tags}
                isAdding={addingToColumn === status.value}
                onAddStart={() => setAddingToColumn(status.value)}
                onAddCancel={() => setAddingToColumn(null)}
                onCreateTask={(data) => handleCreateTask(status.value, data)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div style={{ opacity: 0.8, transform: 'rotate(1deg)', width: '284px' }}>
                <TaskCard task={activeTask} availableTags={tags} onUpdate={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Column Component with Clean Inline Task Creation
function Column({
  status,
  label,
  tasks,
  availableTags,
  isAdding,
  onAddStart,
  onAddCancel,
  onCreateTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  isAdding: boolean;
  onAddStart: () => void;
  onAddCancel: () => void;
  onCreateTask: (data: { title: string; description: string; tags: string[] }) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } });
  const taskIds = tasks.map(t => t.id.toString());

  return (
    <div ref={setNodeRef} style={styles.column}>
      <div style={styles.columnHeader}>
        <span style={styles.columnTitle}>{label}</span>
        <span style={styles.taskCount}>{tasks.length}</span>
      </div>

      <div style={styles.columnContent}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              availableTags={availableTags}
              onUpdate={async (id, data) => {
                await fetch(`/api/tasks/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
              }}
              onDelete={async (id) => {
                await fetch(`/api/tasks/${id}`, { method: "DELETE" });
                window.location.reload();
              }}
            />
          ))}
        </SortableContext>

        {isAdding ? (
          <InlineTaskCreate availableTags={availableTags} onSave={onCreateTask} onCancel={onAddCancel} />
        ) : (
          <button
            onClick={onAddStart}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px dashed ${GRAY_300}`,
              backgroundColor: 'transparent',
              color: GRAY_400,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              borderRadius: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, { borderColor: GRAY_400, color: GRAY_600, backgroundColor: GRAY_50 })}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { borderColor: GRAY_300, color: GRAY_400, backgroundColor: 'transparent' })}
          >
            + New task
          </button>
        )}
      </div>
    </div>
  );
}

// Clean Inline Task Creation
function InlineTaskCreate({
  availableTags,
  onSave,
  onCancel,
}: {
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onSave: (data: { title: string; description: string; tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onSave({ title: title.trim(), description: description.trim(), tags: [] });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div style={styles.addTaskInline}>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        style={{
          width: '100%',
          padding: '8px 10px',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${GRAY_200}`,
          fontSize: '14px',
          color: GRAY_900,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          outline: 'none',
          marginBottom: '8px',
        }}
        onKeyDown={handleKeyDown}
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a description..."
        style={{
          width: '100%',
          padding: '8px 0',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${GRAY_200}`,
          fontSize: '13px',
          color: GRAY_600,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          outline: 'none',
          marginBottom: '12px',
        }}
        onKeyDown={handleKeyDown}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: GRAY_500,
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { color: GRAY_700, backgroundColor: GRAY_100 })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { color: GRAY_500, backgroundColor: 'transparent' })}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          style={{
            padding: '6px 12px',
            backgroundColor: BLUE_500,
            color: WHITE,
            border: 'none',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '6px',
            opacity: (!title.trim() || isSubmitting) ? 0.5 : 1,
          }}
          onMouseEnter={(e) => (title.trim() && !isSubmitting) && Object.assign(e.currentTarget.style, { backgroundColor: '#2563eb' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: BLUE_500 })}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}

// Sortable Task Card Wrapper
function SortableTaskCard({
  task,
  availableTags,
  onUpdate,
  onDelete,
}: {
  task: Task;
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onUpdate: (id: number, data: { title: string; description: string; status: TaskStatus; tags: string[] }) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString(), data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} availableTags={availableTags} onUpdate={onUpdate} onDelete={onDelete} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
}

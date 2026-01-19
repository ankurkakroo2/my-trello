"use client";

import { useEffect, useState, useCallback, useRef, MouseEvent } from "react";
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
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  TagIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Done" },
];

// Bold dark theme - shades of grey to black
const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404040";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const GRAY_300 = "#a3a3a3";
const GRAY_200 = "#d4d4d4";
const GRAY_100 = "#e5e5e5";
const GRAY_50 = "#f5f5f5";
const WHITE = "#ffffff";

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: BLACK,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    color: WHITE,
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '16px 24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: WHITE,
    letterSpacing: '-0.02em',
  },
  controlsRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  searchBox: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '200px',
    padding: '8px 12px 8px 36px',
    backgroundColor: GRAY_900,
    border: '1px solid transparent',
    borderRadius: '8px',
    fontSize: '14px',
    color: WHITE,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  searchInputFocus: {
    backgroundColor: GRAY_800,
    borderColor: GRAY_600,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    color: GRAY_500,
    width: '16px',
    height: '16px',
    pointerEvents: 'none' as const,
    transition: 'color 0.2s ease',
  },
  iconButton: {
    padding: '8px',
    backgroundColor: GRAY_900,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: GRAY_400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  iconButtonActive: {
    backgroundColor: GRAY_700,
    borderColor: GRAY_600,
    color: WHITE,
  },
  iconButtonHover: {
    backgroundColor: GRAY_800,
    borderColor: GRAY_600,
    color: WHITE,
    transform: 'translateY(-1px)',
  },
  tagFilterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: GRAY_900,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
  },
  tagBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },
  tagBadgeRemove: {
    cursor: 'pointer' as const,
    padding: '2px',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  tagBadgeRemoveHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  main: {
    padding: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    animation: 'fadeIn 0.4s ease-out',
  },
  column: {
    backgroundColor: GRAY_900,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '500px',
    transition: 'all 0.3s ease',
  },
  columnHover: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  columnHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_300,
    letterSpacing: '-0.01em',
  },
  taskCount: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: GRAY_800,
    color: GRAY_400,
    fontWeight: 500,
    borderRadius: '20px',
  },
  columnContent: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: BLACK,
  },
  // List view styles
  listView: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    animation: 'fadeIn 0.4s ease-out',
  },
  listGroup: {
    marginBottom: '24px',
  },
  listGroupHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: GRAY_500,
    padding: '8px 16px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: GRAY_900,
    border: '1px solid transparent',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
  },
  listRowHover: {
    backgroundColor: GRAY_800,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  listRowTitle: {
    flex: 1,
    fontSize: '14px',
    color: GRAY_200,
  },
  listRowStatus: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: GRAY_800,
    color: GRAY_400,
    borderRadius: '6px',
  },
  newTaskPlaceholder: {
    padding: '12px',
    color: GRAY_500,
    fontSize: '14px',
    cursor: 'text',
    border: '1px solid transparent',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  newTaskPlaceholderHover: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: GRAY_400,
  },
  inlineInput: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    fontSize: '14px',
    color: WHITE,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  inlineInputFocus: {
    borderBottomColor: WHITE,
  },
};

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterTag) params.append("tagId", filterTag.toString());
      const response = await fetchWithRetry(`/api/tasks?${params}`);
      if (response.ok) setTasks(await response.json());
    } finally {
      setIsLoading(false);
    }
  }, [filterTag]);

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
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: WHITE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>TicTac</h1>
          <div style={styles.controlsRow}>
            <div style={styles.searchBox}>
              <MagnifyingGlassIcon style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => Object.assign(e.currentTarget.style, styles.searchInputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, borderColor: 'transparent' })}
              />
            </div>

            {filterTag && (
              <div style={styles.tagFilterContainer}>
                <span style={styles.tagBadge}>
                  <span style={{ background: tags.find(t => t.id === filterTag)?.color || GRAY_600, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    {tags.find(t => t.id === filterTag)?.name}
                  </span>
                  <XMarkIcon
                    style={{ width: '14px', height: '14px', ...styles.tagBadgeRemove }}
                    onClick={() => setFilterTag(null)}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.tagBadgeRemoveHover)}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
                  />
                </span>
              </div>
            )}

            <button
              onClick={() => setView(view === "board" ? "list" : "board")}
              style={{ ...styles.iconButton, ...(view === "board" ? styles.iconButtonActive : {}) }}
              onMouseEnter={(e) => view !== "board" && Object.assign(e.currentTarget.style, styles.iconButtonHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, view === "board" ? styles.iconButtonActive : { backgroundColor: GRAY_900, borderColor: 'rgba(255, 255, 255, 0.08)', transform: 'none' })}
              title="Toggle view"
            >
              {view === "board" ? <Squares2X2Icon style={{ width: '18px', height: '18px' }} /> : <ListBulletIcon style={{ width: '18px', height: '18px' }} />}
            </button>

            <button
              style={styles.iconButton}
              onClick={() => setFilterTag(null)}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.iconButtonHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, borderColor: 'rgba(255, 255, 255, 0.08)', transform: 'none' })}
              title="Filter by tag"
            >
              <TagIcon style={{ width: '18px', height: '18px' }} />
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              style={styles.iconButton}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.iconButtonHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, borderColor: 'rgba(255, 255, 255, 0.08)', transform: 'none' })}
              title="Sign out"
            >
              <ArrowRightOnRectangleIcon style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
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
          ) : (
            <ListView tasks={filteredTasks} tags={tags} onUpdate={async (id, data) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }} onDelete={async (id) => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); }} />
          )}
        </DndContext>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// Column Component
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
    <div
      ref={setNodeRef}
      style={styles.column}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.columnHover)}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255, 255, 255, 0.06)' })}
    >
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
          <div
            onClick={onAddStart}
            style={styles.newTaskPlaceholder}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.newTaskPlaceholderHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { borderColor: 'transparent', color: GRAY_500 })}
          >
            + New task
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Task Creation - No submit button, saves on enter or click outside
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
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (title.trim()) {
      onSave({ title: title.trim(), description: description.trim(), tags: [] });
    }
  }, [title, description, onSave]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      if (title.trim()) {
        handleSubmit();
      } else {
        onCancel();
      }
    }
  }, [title, handleSubmit, onCancel]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [handleClickOutside]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab' && !e.shiftKey && title.trim() && !description) {
      e.preventDefault();
      // Focus description
    }
  };

  return (
    <div ref={containerRef} style={{ padding: '12px', animation: 'slideIn 0.2s ease-out' }}>
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        style={styles.inlineInput}
        onKeyDown={handleKeyDown}
        onFocus={(e) => Object.assign(e.currentTarget.style, styles.inlineInputFocus)}
        onBlur={(e) => Object.assign(e.currentTarget.style, { borderBottomColor: 'rgba(255, 255, 255, 0.15)' })}
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add description (optional)..."
        style={{ ...styles.inlineInput, fontSize: '13px', color: GRAY_400 }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => Object.assign(e.currentTarget.style, styles.inlineInputFocus)}
        onBlur={(e) => Object.assign(e.currentTarget.style, { borderBottomColor: 'rgba(255, 255, 255, 0.15)' })}
      />
      <div style={{ fontSize: '11px', color: GRAY_500, marginTop: '8px' }}>
        Enter to save · Esc to cancel
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

// List View Component
function ListView({
  tasks,
  tags,
  onUpdate,
  onDelete,
}: {
  tasks: Task[];
  tags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onUpdate: (id: number, data: { title: string; description: string; status: TaskStatus; tags: string[] }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const groupedTasks = [
    { label: "To Do", tasks: tasks.filter(t => t.status === "not_started") },
    { label: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "Done", tasks: tasks.filter(t => t.status === "complete") },
  ].filter(g => g.tasks.length > 0);

  return (
    <div style={styles.listView}>
      {groupedTasks.map(group => (
        <div key={group.label} style={styles.listGroup}>
          <div style={styles.listGroupHeader}>{group.label} · {group.tasks.length}</div>
          {group.tasks.map(task => (
            <div
              key={task.id}
              style={styles.listRow}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.listRowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, borderColor: 'transparent' })}
              onClick={() => {/* Handle edit */}}
            >
              <span style={styles.listRowTitle}>{task.title}</span>
              <span style={styles.listRowStatus}>{group.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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

// Bold dark theme
const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404040";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const GRAY_300 = "#a3a3a3";
const GRAY_200 = "#d4d4d4";
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
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '14px 20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  controls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  searchBox: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '180px',
    padding: '8px 10px 8px 32px',
    backgroundColor: GRAY_900,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    color: WHITE,
    outline: 'none',
  },
  searchInputFocus: {
    backgroundColor: GRAY_800,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '10px',
    color: GRAY_500,
    width: '14px',
    height: '14px',
    pointerEvents: 'none' as const,
  },
  iconBtn: {
    padding: '8px',
    backgroundColor: 'transparent',
    color: GRAY_500,
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
  iconBtnHover: {
    backgroundColor: GRAY_900,
    color: WHITE,
  },
  iconBtnActive: {
    backgroundColor: GRAY_800,
    color: WHITE,
  },
  dropdown: {
    position: 'relative' as const,
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: GRAY_800,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '8px',
    minWidth: '160px',
    zIndex: 50,
  },
  dropdownItem: {
    padding: '8px 12px',
    fontSize: '13px',
    color: GRAY_300,
    cursor: 'pointer',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dropdownItemHover: {
    backgroundColor: GRAY_700,
    color: WHITE,
  },
  main: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  column: {
    backgroundColor: 'transparent',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '400px',
  },
  columnHeader: {
    padding: '12px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: GRAY_500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  taskCount: {
    fontSize: '11px',
    color: GRAY_600,
  },
  columnContent: {
    padding: '4px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  // Minimal input styles
  minimalInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: WHITE,
    outline: 'none',
    fontFamily: 'inherit',
  },
  minimalInputPlaceholder: {
    color: GRAY_600,
  },
  // List view
  listView: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: GRAY_900,
    borderRadius: '8px',
    transition: 'background-color 0.15s',
  },
  listRowHover: {
    backgroundColor: GRAY_800,
  },
  listTitle: {
    flex: 1,
    fontSize: '14px',
    color: GRAY_200,
  },
  listStatus: {
    fontSize: '11px',
    padding: '3px 8px',
    backgroundColor: GRAY_800,
    color: GRAY_500,
    borderRadius: '4px',
  },
  tagFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px 4px 4px',
    backgroundColor: GRAY_800,
    borderRadius: '6px',
    fontSize: '12px',
  },
  tagFilterText: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, []);

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
        <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: WHITE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>TicTac</h1>
          <div style={styles.controls}>
            <div style={styles.searchBox}>
              <MagnifyingGlassIcon style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => Object.assign(e.currentTarget.style, styles.searchInputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}
              />
            </div>

            {filterTag && (
              <div style={styles.tagFilter}>
                <span style={{ ...styles.tagFilterText, background: tags.find(t => t.id === filterTag)?.color || GRAY_600 }}>
                  {tags.find(t => t.id === filterTag)?.name}
                </span>
                <XMarkIcon
                  style={{ width: '14px', height: '14px', cursor: 'pointer', color: GRAY_400 }}
                  onClick={() => setFilterTag(null)}
                />
              </div>
            )}

            <button
              onClick={() => setView(view === "board" ? "list" : "board")}
              style={{ ...styles.iconBtn, ...(view === "board" ? styles.iconBtnActive : {}) }}
              onMouseEnter={(e) => view !== "board" && Object.assign(e.currentTarget.style, styles.iconBtnHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}
              title="Toggle view"
            >
              {view === "board" ? <Squares2X2Icon style={{ width: '18px', height: '18px' }} /> : <ListBulletIcon style={{ width: '18px', height: '18px' }} />}
            </button>

            <div ref={filterRef} style={styles.dropdown}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{ ...styles.iconBtn, ...(showFilterDropdown ? styles.iconBtnActive : {}) }}
                onMouseEnter={(e) => !showFilterDropdown && Object.assign(e.currentTarget.style, styles.iconBtnHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}
              >
                <TagIcon style={{ width: '18px', height: '18px' }} />
              </button>
              {showFilterDropdown && (
                <div style={styles.dropdownMenu}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }}
                      style={styles.dropdownItem}
                      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.dropdownItemHover)}
                      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_300 })}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color }}></span>
                      {tag.name}
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <div style={{ ...styles.dropdownItem, color: GRAY_500, cursor: 'default' }}>No tags</div>
                  )}
                  {filterTag && (
                    <div
                      onClick={() => setFilterTag(null)}
                      style={{ ...styles.dropdownItem, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '12px' }}
                      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.dropdownItemHover)}
                      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_300 })}
                    >
                      Clear filter
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              style={styles.iconBtn}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.iconBtnHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}
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
            <ListView tasks={filteredTasks} tags={tags} />
          )}
        </DndContext>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          <MinimalTaskCreate availableTags={availableTags} onSave={onCreateTask} onCancel={onAddCancel} />
        ) : (
          <div
            onClick={onAddStart}
            style={{
              padding: '10px 12px',
              color: GRAY_600,
              fontSize: '13px',
              cursor: 'text',
              borderRadius: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, color: GRAY_500 })}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_600 })}
          >
            + Add task...
          </div>
        )}
      </div>
    </div>
  );
}

// MINIMAL Task Creation - Single input, reveals description only after title
function MinimalTaskCreate({
  onSave,
  onCancel,
}: {
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onSave: (data: { title: string; description: string; tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (e.target.value && !showDescription) {
      setShowDescription(true);
    }
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
    <div
      ref={containerRef}
      style={{
        padding: '8px 0',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <input
        ref={titleInputRef}
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Task name..."
        style={{
          ...styles.minimalInput,
          ...(title ? {} : styles.minimalInputPlaceholder),
        }}
        onKeyDown={handleKeyDown}
      />
      {showDescription && (
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description..."
          style={{
            ...styles.minimalInput,
            fontSize: '13px',
            marginTop: '4px',
            ...(description ? {} : { color: GRAY_600 }),
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => Object.assign(e.currentTarget.style, { color: WHITE })}
          onBlur={(e) => !description && Object.assign(e.currentTarget.style, { color: GRAY_600 })}
        />
      )}
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

// List View
function ListView({
  tasks,
  tags,
}: {
  tasks: Task[];
  tags: Array<{ id: number; name: string; color: string; taskCount: number }>;
}) {
  const grouped = [
    { label: "To Do", tasks: tasks.filter(t => t.status === "not_started") },
    { label: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "Done", tasks: tasks.filter(t => t.status === "complete") },
  ].filter(g => g.tasks.length > 0);

  return (
    <div style={styles.listView}>
      {grouped.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: GRAY_600, padding: '8px 16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {group.label} · {group.tasks.length}
          </div>
          {group.tasks.map(task => (
            <div
              key={task.id}
              style={styles.listRow}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.listRowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}
            >
              <span style={styles.listTitle}>{task.title}</span>
              <span style={styles.listStatus}>{group.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

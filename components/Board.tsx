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
  page: { minHeight: '100vh', backgroundColor: BLACK, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' },
  header: {
    position: 'sticky' as const, top: 0, zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 20px',
  },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: 700 },
  controls: { display: 'flex', gap: '8px', alignItems: 'center' },
  searchBox: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  searchInput: { width: '160px', padding: '6px 10px 6px 30px', backgroundColor: GRAY_900, border: 'none', borderRadius: '6px', fontSize: '13px', color: WHITE, outline: 'none' },
  searchIcon: { position: 'absolute' as const, left: '8px', color: GRAY_500, width: '14px', height: '14px', pointerEvents: 'none' as const },
  iconBtn: {
    padding: '6px', backgroundColor: 'transparent', color: GRAY_500,
    cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
  },
  dropdown: { position: 'relative' as const },
  dropdownMenu: {
    position: 'absolute' as const, top: '100%', right: 0, marginTop: '4px',
    backgroundColor: GRAY_800, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '4px', zIndex: 50,
  },
  dropdownItem: { padding: '6px 10px', fontSize: '13px', color: GRAY_300, cursor: 'pointer', borderRadius: '4px' },
  main: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  boardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' },
  column: { backgroundColor: 'transparent', borderRadius: '12px', display: 'flex', flexDirection: 'column' as const },
  columnHeader: { padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  columnTitle: { fontSize: '11px', fontWeight: 600, color: GRAY_500, letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  columnContent: { padding: '2px', display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  newTaskTrigger: { padding: '8px 12px', color: GRAY_600, fontSize: '13px', cursor: 'text', borderRadius: '6px', transition: 'all 0.15s' },
  inlineCreate: { padding: '8px 12px' },
  inlineInput: {
    width: '100%', padding: '8px 0', backgroundColor: 'transparent', border: 'none',
    fontSize: '14px', color: WHITE, outline: 'none', fontFamily: 'inherit',
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterTag) params.append("tagId", filterTag.toString());
      const response = await fetchWithRetry(`/api/tasks?${params}`);
      if (response.ok) setTasks(await response.json());
    } finally { setIsLoading(false); }
  }, [filterTag]);

  const fetchTags = async () => {
    try { const response = await fetchWithRetry("/api/tags"); if (response.ok) setTags(await response.json()); }
    catch {}
  };

  useEffect(() => { fetchTasks(); fetchTags(); }, [fetchTasks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
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

  const handleDragStart = (e: DragStartEvent) => setActiveId(parseInt(e.active.id as string));
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = parseInt(active.id as string);
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;
    const overStatus = over?.data?.current?.status as TaskStatus | undefined;
    const newStatus = overStatus || activeTask.status;
    setTasks(tasks.map(t => t.id === activeId ? { ...t, status: newStatus } : t));
    try {
      await fetchWithRetry(`/api/tasks/${activeId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activeTask, status: newStatus, title: activeTask.title, description: activeTask.description || "", tags: activeTask.tags.map(t => t.name) }),
      });
    } catch { fetchTasks(); }
  };

  const handleCreateTask = async (status: TaskStatus, data: { title: string; description: string; tags: string[] }) => {
    try {
      const response = await fetchWithRetry("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (!response.ok) throw new Error("Failed");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      setAddingToColumn(null);
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) return <div style={styles.loading}><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: WHITE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div></div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>TicTac</h1>
          <div style={styles.controls}>
            <div style={styles.searchBox}>
              <MagnifyingGlassIcon style={styles.searchIcon} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={styles.searchInput} />
            </div>
            {filterTag && (
              <div onClick={() => setFilterTag(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: GRAY_800, borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                <span style={{ padding: '2px 4px', borderRadius: '3px', background: tags.find(t => t.id === filterTag)?.color || GRAY_700 }}>
                  {tags.find(t => t.id === filterTag)?.name}
                </span>
                <XMarkIcon style={{ width: '12px', height: '12px', color: GRAY_400 }} />
              </div>
            )}
            <button onClick={() => setView(view === "board" ? "list" : "board")} style={{ ...styles.iconBtn, ...(view === "board" ? { color: WHITE, backgroundColor: GRAY_800 } : {}) }} title="Toggle view">
              {view === "board" ? <Squares2X2Icon style={{ width: '16px', height: '16px' }} /> : <ListBulletIcon style={{ width: '16px', height: '16px' }} />}
            </button>
            <div ref={filterRef} style={styles.dropdown}>
              <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} style={{ ...styles.iconBtn, ...(showFilterDropdown ? { color: WHITE, backgroundColor: GRAY_800 } : {}) }} title="Filter by tag">
                <TagIcon style={{ width: '16px', height: '16px' }} />
              </button>
              {showFilterDropdown && (
                <div style={styles.dropdownMenu}>
                  {tags.map(tag => (
                    <div key={tag.id} onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }} style={styles.dropdownItem} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_700 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tag.color, display: 'inline-block', marginRight: '6px' }}></span>
                      {tag.name}
                    </div>
                  ))}
                  {filterTag && <div onClick={() => setFilterTag(null)} style={{ ...styles.dropdownItem, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2px', paddingTop: '6px' }}>Clear</div>}
                </div>
              )}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={styles.iconBtn} title="Sign out">
              <ArrowRightOnRectangleIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
            <div style={styles.boardGrid}>
              {STATUSES.map(status => (
                <Column key={status.value} status={status.value} label={status.label} tasks={tasksByStatus[status.value]} availableTags={tags} isAdding={addingToColumn === status.value} onAddStart={() => setAddingToColumn(status.value)} onAddCancel={() => setAddingToColumn(null)} onCreateTask={(data) => handleCreateTask(status.value, data)} />
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

function Column({ status, label, tasks, availableTags, isAdding, onAddStart, onAddCancel, onCreateTask }: {
  status: TaskStatus; label: string; tasks: Task[]; availableTags: any[];
  isAdding: boolean; onAddStart: () => void; onAddCancel: () => void;
  onCreateTask: (data: { title: string; description: string; tags: string[] }) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } });
  const taskIds = tasks.map(t => t.id.toString());

  return (
    <div ref={setNodeRef} style={styles.column}>
      <div style={styles.columnHeader}>
        <span style={styles.columnTitle}>{label}</span>
        <span style={{ fontSize: '11px', color: GRAY_600 }}>{tasks.length}</span>
      </div>
      <div style={styles.columnContent}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} availableTags={availableTags} onUpdate={async (id: number, data: any) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }} onDelete={async (id: number) => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); window.location.reload(); }} />
          ))}
        </SortableContext>
        {isAdding ? (
          <InlineCreate onSave={onCreateTask} onCancel={onAddCancel} />
        ) : (
          <div onClick={onAddStart} style={styles.newTaskTrigger} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900, color: GRAY_500 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_600 })}>
            + New task
          </div>
        )}
      </div>
    </div>
  );
}

// Inline create - single placeholder
function InlineCreate({ onSave, onCancel }: { onSave: (data: { title: string; description: string; tags: string[] }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = useCallback(() => { if (title.trim()) { onSave({ title: title.trim(), description: "", tags: [] }); } }, [title, onSave]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (title.trim()) submit(); else onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [title, submit, onCancel]);

  return (
    <div style={styles.inlineCreate}>
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="New task"
        style={{ ...styles.inlineInput, color: title ? WHITE : GRAY_600, minHeight: '20px' }}
        onInput={e => setTitle(e.currentTarget.textContent || "")}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { onCancel(); } }}
      />
    </div>
  );
}

function SortableTaskCard({ task, availableTags, onUpdate, onDelete }: { task: Task; availableTags: any[]; onUpdate: any; onDelete: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id.toString(), data: { status: task.status } });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
    <TaskCard task={task} availableTags={availableTags} onUpdate={onUpdate} onDelete={onDelete} dragAttributes={attributes} dragListeners={listeners} />
  </div>;
}

function ListView({ tasks, tags }: { tasks: Task[]; tags: any[] }) {
  const grouped = [
    { label: "To Do", tasks: tasks.filter(t => t.status === "not_started") },
    { label: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "Done", tasks: tasks.filter(t => t.status === "complete") },
  ].filter(g => g.tasks.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
      {grouped.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: GRAY_500, padding: '4px 16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{group.label} · {group.tasks.length}</div>
          {group.tasks.map(task => (
            <div key={task.id} style={{ padding: '10px 16px', backgroundColor: GRAY_900, borderRadius: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '13px', color: GRAY_200 }}>{task.title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

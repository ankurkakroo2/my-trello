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

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreateTask = async (title: string) => {
    if (!title.trim()) return;
    try {
      const response = await fetchWithRetry("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: "", tags: [], status: "not_started" }),
      });
      if (!response.ok) throw new Error("Failed");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: BLACK }}><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: WHITE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div></div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BLACK }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: WHITE, letterSpacing: '-0.02em' }}>TicTac</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: '10px', color: GRAY_500, width: '14px', height: '14px', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '160px', padding: '7px 10px 7px 32px', backgroundColor: GRAY_900, border: '1px solid transparent', borderRadius: '8px', fontSize: '13px', color: WHITE, outline: 'none', transition: 'all 0.15s' }} onFocus={e => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: GRAY_800 })} onBlur={e => Object.assign(e.currentTarget.style, { borderColor: 'transparent', backgroundColor: GRAY_900 })} />
            </div>

            {/* Active filter pill */}
            {filterTag && (
              <div onClick={() => setFilterTag(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', backgroundColor: GRAY_800, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tags.find(t => t.id === filterTag)?.color || GRAY_700 }}></span>
                <span style={{ color: GRAY_300 }}>{tags.find(t => t.id === filterTag)?.name}</span>
                <XMarkIcon style={{ width: '12px', height: '12px', color: GRAY_500 }} />
              </div>
            )}

            {/* View toggle */}
            <button onClick={() => setView(view === "board" ? "list" : "board")} style={{ padding: '7px', backgroundColor: view === "board" ? GRAY_800 : 'transparent', color: view === "board" ? WHITE : GRAY_500, borderRadius: '8px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} title="Toggle view">
              {view === "board" ? <Squares2X2Icon style={{ width: '16px', height: '16px' }} /> : <ListBulletIcon style={{ width: '16px', height: '16px' }} />}
            </button>

            {/* Filter dropdown */}
            <div ref={filterRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} style={{ padding: '7px', backgroundColor: showFilterDropdown ? GRAY_800 : 'transparent', color: showFilterDropdown ? WHITE : GRAY_500, borderRadius: '8px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} title="Filter by tag">
                <TagIcon style={{ width: '16px', height: '16px' }} />
              </button>
              {showFilterDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', backgroundColor: GRAY_800, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '6px', zIndex: 50, minWidth: '140px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                  {tags.map(tag => (
                    <div key={tag.id} onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }} style={{ padding: '8px 10px', fontSize: '13px', color: GRAY_300, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_700 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color }}></span>
                      {tag.name}
                    </div>
                  ))}
                  {filterTag && <div onClick={() => setFilterTag(null)} style={{ padding: '8px 10px', fontSize: '13px', color: GRAY_400, cursor: 'pointer', borderRadius: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_700 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}>Clear filter</div>}
                </div>
              )}
            </div>

            {/* Sign out */}
            <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={{ padding: '7px', backgroundColor: 'transparent', color: GRAY_500, borderRadius: '8px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} title="Sign out">
              <ArrowRightOnRectangleIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {STATUSES.map(status => (
                <Column key={status.value} status={status.value} label={status.label} tasks={tasksByStatus[status.value]} availableTags={tags} />
              ))}
            </div>
          ) : (
            <ListView tasks={filteredTasks} tags={tags} />
          )}
        </DndContext>

        {/* Single global create button at bottom */}
        {isCreating ? (
          <InlineCreate onSave={handleCreateTask} onCancel={() => setIsCreating(false)} />
        ) : (
          <div onClick={() => setIsCreating(true)} style={{ marginTop: '20px', padding: '14px 20px', color: GRAY_600, fontSize: '15px', cursor: 'text', textAlign: 'center', transition: 'color 0.2s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { color: GRAY_500 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { color: GRAY_600 })}>
            + Add a task...
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Column({ status, label, tasks, availableTags }: {
  status: TaskStatus; label: string; tasks: Task[]; availableTags: any[];
}) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } });
  const taskIds = tasks.map(t => t.id.toString());

  return (
    <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Column header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: GRAY_500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '12px', color: GRAY_600 }}>{tasks.length}</span>
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '60px' }}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} availableTags={availableTags} onUpdate={async (id: number, data: any) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }} onDelete={async (id: number) => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); window.location.reload(); }} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// Single inline create - appears at bottom of page
function InlineCreate({ onSave, onCancel }: { onSave: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = useCallback(() => {
    if (title.trim()) { onSave(title.trim()); }
    onCancel();
  }, [title, onSave, onCancel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        submit();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as any);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [title, submit, onCancel]);

  return (
    <div
      ref={inputRef}
      contentEditable
      suppressContentEditableWarning
      style={{
        fontSize: '15px',
        fontWeight: 400,
        color: WHITE,
        outline: 'none',
        minHeight: '22px',
        padding: '14px 20px',
        marginTop: '20px',
        cursor: 'text',
        textAlign: 'center',
      }}
      onInput={e => setTitle(e.currentTarget.textContent || "")}
    >{title || "Type a task name..."}</div>
  );
}

function SortableTaskCard({ task, availableTags, onUpdate, onDelete }: { task: Task; availableTags: any[]; onUpdate: any; onDelete: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id.toString(), data: { status: task.status } });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {grouped.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: GRAY_500, padding: '4px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{group.label} · {group.tasks.length}</div>
          {group.tasks.map(task => (
            <div key={task.id} style={{ padding: '12px 16px', backgroundColor: GRAY_900, borderRadius: '8px', marginTop: '4px', transition: 'all 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}>
              <span style={{ fontSize: '14px', color: WHITE }}>{task.title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

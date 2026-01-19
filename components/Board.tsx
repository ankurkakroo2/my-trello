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

// White background theme
const WHITE = "#ffffff";
const GRAY_100 = "#f5f5f5";
const GRAY_200 = "#e5e5e5";
const GRAY_300 = "#d4d4d4";
const GRAY_400 = "#a3a3a3";
const GRAY_500 = "#737373";
const GRAY_600 = "#525252";
const GRAY_700 = "#404040";
const GRAY_800 = "#262626";
const GRAY_900 = "#171717";
const BLACK = "#000000";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

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
      if (inputRef.current && !inputRef.current.contains(e.target as Node) && isFocused) {
        saveNewTask();
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [isFocused, newTaskTitle]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocused) {
        setNewTaskTitle("");
        setIsFocused(false);
      }
      if (e.key === 'Enter' && isFocused && !e.shiftKey) {
        e.preventDefault();
        saveNewTask();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFocused, newTaskTitle]);

  const saveNewTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      handleCreateTask(newTaskTitle.trim());
    }
    setNewTaskTitle("");
    setIsFocused(false);
  }, [newTaskTitle]);

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
    try {
      const response = await fetchWithRetry("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: "", tags: [], status: "not_started" }),
      });
      if (!response.ok) throw new Error("Failed");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: WHITE }}><div style={{ width: '20px', height: '20px', border: '3px solid GRAY_200', borderTopColor: BLACK, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div></div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: WHITE, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e5e5e5', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: BLACK, letterSpacing: '-0.03em' }}>TicTac</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', color: GRAY_500, width: '16px', height: '16px', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '180px', padding: '10px 12px 10px 38px', backgroundColor: GRAY_100, border: 'none', borderRadius: '10px', fontSize: '14px', color: BLACK, outline: 'none', transition: 'all 0.2s' }} onFocus={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_200 })} onBlur={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_100 })} />
            </div>

            {/* Active filter pill */}
            {filterTag && (
              <div onClick={() => setFilterTag(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: GRAY_100, borderRadius: '8px', fontSize: '13px', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_200 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_100 })}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tags.find(t => t.id === filterTag)?.color || GRAY_400 }}></span>
                <span style={{ color: GRAY_700 }}>{tags.find(t => t.id === filterTag)?.name}</span>
                <XMarkIcon style={{ width: '14px', height: '14px', color: GRAY_500 }} />
              </div>
            )}

            {/* View toggle */}
            <button onClick={() => setView(view === "board" ? "list" : "board")} style={{ padding: '10px', backgroundColor: view === "board" ? GRAY_100 : 'transparent', color: view === "board" ? BLACK : GRAY_500, borderRadius: '10px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Toggle view">
              {view === "board" ? <Squares2X2Icon style={{ width: '18px', height: '18px' }} /> : <ListBulletIcon style={{ width: '18px', height: '18px' }} />}
            </button>

            {/* Filter dropdown */}
            <div ref={filterRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} style={{ padding: '10px', backgroundColor: showFilterDropdown ? GRAY_100 : 'transparent', color: showFilterDropdown ? BLACK : GRAY_500, borderRadius: '10px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Filter by tag">
                <TagIcon style={{ width: '18px', height: '18px' }} />
              </button>
              {showFilterDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: WHITE, border: '1px solid #e5e5e5', borderRadius: '12px', padding: '8px', zIndex: 50, minWidth: '160px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  {tags.map(tag => (
                    <div key={tag.id} onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }} style={{ padding: '10px 12px', fontSize: '14px', color: GRAY_700, cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_100 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tag.color }}></span>
                      {tag.name}
                    </div>
                  ))}
                  {filterTag && <div onClick={() => setFilterTag(null)} style={{ padding: '10px 12px', fontSize: '14px', color: GRAY_500, cursor: 'pointer', borderRadius: '8px', borderTop: '1px solid #e5e5e5', marginTop: '4px', transition: 'background 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_100 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}>Clear filter</div>}
                </div>
              )}
            </div>

            {/* Sign out */}
            <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={{ padding: '10px', backgroundColor: 'transparent', color: GRAY_500, borderRadius: '10px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Sign out" onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_100, color: BLACK })} onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}>
              <ArrowRightOnRectangleIcon style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {STATUSES.map(status => (
                <Column key={status.value} status={status.value} label={status.label} tasks={tasksByStatus[status.value]} availableTags={tags} />
              ))}
            </div>
          ) : (
            <ListView tasks={filteredTasks} tags={tags} />
          )}
        </DndContext>

        {/* Single input at bottom - no border, just text */}
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsFocused(true)}
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: BLACK,
            outline: 'none',
            marginTop: '24px',
            padding: '14px 0',
            cursor: 'text',
            opacity: newTaskTitle || isFocused ? 1 : 0.5,
            transition: 'opacity 0.2s',
            borderBottom: isFocused ? '2px solid BLACK' : '2px solid transparent',
          }}
          onInput={e => setNewTaskTitle(e.currentTarget.textContent || "")}
        >{newTaskTitle || "+ Add a task..."}</div>
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
    <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Column header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: GRAY_500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '13px', color: GRAY_400, fontWeight: 500 }}>{tasks.length}</span>
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '60px' }}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} availableTags={availableTags} onUpdate={async (id: number, data: any) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }} onDelete={async (id: number) => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); window.location.reload(); }} />
          ))}
        </SortableContext>
      </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {grouped.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: GRAY_500, padding: '4px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{group.label} · {group.tasks.length}</div>
          {group.tasks.map(task => (
            <div key={task.id} style={{ padding: '14px 18px', backgroundColor: WHITE, border: '1px solid #e5e5e5', borderRadius: '10px', marginTop: '6px', transition: 'all 0.2s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: GRAY_300, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' })} onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: '#e5e5e5', boxShadow: 'none' })}>
              <span style={{ fontSize: '15px', color: BLACK }}>{task.title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

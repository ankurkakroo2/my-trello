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
  PencilIcon,
  TrashIcon,
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
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLDivElement>(null);

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

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingTask && editInputRef.current) {
      editInputRef.current.focus();
      // Select all text
      const range = document.createRange();
      const sel = window.getSelection();
      if (editInputRef.current.firstChild && sel) {
        range.selectNodeContents(editInputRef.current.firstChild);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [editingTask]);

  // Handle click outside for filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
      // Save new task on click outside
      if (inputRef.current && !inputRef.current.contains(e.target as Node) && newTaskTitle.trim()) {
        handleCreateTask(newTaskTitle.trim());
        setNewTaskTitle("");
      }
      // Save edit on click outside
      if (editingTask && editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        saveEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [newTaskTitle, editingTask, editTitle]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // New task shortcuts
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement === inputRef.current && newTaskTitle.trim()) {
        e.preventDefault();
        handleCreateTask(newTaskTitle.trim());
        setNewTaskTitle("");
      }
      // Edit shortcuts
      if (e.key === 'Enter' && !e.shiftKey && editingTask && document.activeElement === editInputRef.current) {
        e.preventDefault();
        saveEdit();
      }
      if (e.key === 'Escape' && editingTask) {
        setEditingTask(null);
        setEditTitle("");
      }
    };
    document.addEventListener('keydown', handleKeys);
    return () => document.removeEventListener('keydown', handleKeys);
  }, [newTaskTitle, editingTask, editTitle]);

  const saveEdit = async () => {
    if (!editingTask || !editTitle.trim()) return;
    try {
      await fetchWithRetry(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), description: "", status: editingTask.status, tags: [] }),
      });
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, title: editTitle.trim() } : t));
    } catch {}
    setEditingTask(null);
    setEditTitle("");
  };

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

  const handleDelete = async (id: number) => {
    try {
      await fetchWithRetry(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks(tasks.filter(t => t.id !== id));
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: WHITE }}><div style={{ width: '20px', height: '20px', border: '3px solid #e5e5e5', borderTopColor: BLACK, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div></div>;

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
                <Column
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  tasks={tasksByStatus[status.value]}
                  onEditStart={(task) => { setEditingTask(task); setEditTitle(task.title); }}
                  onDelete={handleDelete}
                  editingTask={editingTask}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editInputRef={editInputRef}
                />
              ))}
            </div>
          ) : (
            <ListView tasks={filteredTasks} tags={tags} />
          )}
        </DndContext>

        {/* Single create input at bottom */}
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: '15px',
            fontWeight: 400,
            color: newTaskTitle ? BLACK : GRAY_400,
            outline: 'none',
            marginTop: '32px',
            padding: '12px 16px',
            cursor: 'text',
            minHeight: '20px',
            opacity: newTaskTitle ? 1 : 0.6,
            transition: 'all 0.2s',
            borderBottom: '2px solid transparent',
          }}
          onFocus={e => Object.assign(e.currentTarget.style, { borderBottomColor: BLACK, opacity: 1 })}
          onBlur={e => Object.assign(e.currentTarget.style, { borderBottomColor: 'transparent', opacity: newTaskTitle ? 1 : 0.6 })}
          onInput={e => setNewTaskTitle(e.currentTarget.textContent || "")}
        >{newTaskTitle || "+ Add a task..."}</div>
      </main>

      {/* Edit modal */}
      {editingTask && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) { setEditingTask(null); setEditTitle(""); } }}>
          <div style={{ backgroundColor: WHITE, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div
              ref={editInputRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                fontSize: '18px',
                fontWeight: 500,
                color: BLACK,
                outline: 'none',
                minHeight: '28px',
                padding: '8px 12px',
                border: '2px solid BLACK',
                borderRadius: '10px',
              }}
              onInput={e => setEditTitle(e.currentTarget.textContent || "")}
            >{editTitle}</div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: GRAY_500 }}>Press Enter to save, Esc to cancel</div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Column({ status, label, tasks, onEditStart, onDelete, editingTask, editTitle, setEditTitle, editInputRef }: {
  status: TaskStatus; label: string; tasks: Task[]; availableTags?: any[];
  onEditStart: (task: Task) => void; onDelete: (id: number) => void;
  editingTask: Task | null; editTitle: string; setEditTitle: (title: string) => void;
  editInputRef: React.RefObject<HTMLDivElement | null>;
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
            <SortableTaskCard key={task.id} task={task} onEditStart={onEditStart} onDelete={onDelete} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onEditStart, onDelete }: { task: Task; onEditStart: (task: Task) => void; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id.toString(), data: { status: task.status } });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div
        style={{
          padding: '16px 18px',
          backgroundColor: WHITE,
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          cursor: 'grab',
          transition: 'all 0.2s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        {...attributes}
        {...listeners}
        onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: GRAY_300, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' })}
        onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: '#e5e5e5', boxShadow: 'none' })}
      >
        <span style={{ fontSize: '15px', fontWeight: 500, color: BLACK, flex: 1 }}>{task.title}</span>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
          <button onClick={(e) => { e.stopPropagation(); onEditStart(task); }} style={{ padding: '6px', color: GRAY_400, borderRadius: '6px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { color: BLACK, backgroundColor: GRAY_100 })} onMouseLeave={e => Object.assign(e.currentTarget.style, { color: GRAY_400, backgroundColor: 'transparent' })}>
            <PencilIcon style={{ width: '14px', height: '14px' }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} style={{ padding: '6px', color: GRAY_400, borderRadius: '6px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => Object.assign(e.currentTarget.style, { color: '#dc2626', backgroundColor: '#fef2f2' })} onMouseLeave={e => Object.assign(e.currentTarget.style, { color: GRAY_400, backgroundColor: 'transparent' })}>
            <TrashIcon style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
    </div>
  );
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

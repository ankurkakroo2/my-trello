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
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
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
  PlusIcon,
} from "@heroicons/react/24/solid";

// Refined monochromatic palette with architectural precision
const C = {
  white: "#FFFFFF",
  offwhite: "#FAFAFA",
  gray50: "#F7F7F7",
  gray100: "#E8E8E8",
  gray200: "#D4D4D4",
  gray300: "#A3A3A3",
  gray400: "#737373",
  gray500: "#525252",
  gray600: "#404040",
  gray700: "#262626",
  gray800: "#171717",
  black: "#0A0A0A",
};

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "BACKLOG" },
  { value: "in_progress", label: "IN PROGRESS" },
  { value: "complete", label: "DONE" },
];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    fetchTasks();
    fetchTags();
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleUpdateTask = async (id: number, title: string) => {
    try {
      await fetchWithRetry(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: "", status: "not_started", tags: [] }),
      });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
    } catch {}
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await fetchWithRetry(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const handleCreateTask = async (title: string, status: TaskStatus) => {
    if (!title.trim()) return;
    try {
      const response = await fetchWithRetry("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: "", tags: [], status }),
      });
      if (!response.ok) throw new Error("Failed");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
    } catch {}
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: C.offwhite,
        fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 24px',
            border: `3px solid ${C.gray200}`,
            borderTopColor: C.black,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: C.black,
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
            TicTac
          </h1>
          <p style={{
            fontSize: '14px',
            color: C.gray500,
            fontWeight: 500,
          }}>
            Loading workspace
          </p>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const taskCounts = {
    not_started: tasksByStatus.not_started.length,
    in_progress: tasksByStatus.in_progress.length,
    complete: tasksByStatus.complete.length,
  };

  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((taskCounts.complete / totalTasks) * 100) : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: C.offwhite,
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.3s ease',
      position: 'relative',
    }}>
      {/* HEADER - Clean, architectural */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '20px 32px',
        background: C.white,
        borderBottom: `1px solid ${C.gray100}`,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* Logo - Minimal & Clean */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: C.black,
              letterSpacing: '-0.03em',
            }}>
              TicTac
            </h1>

            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                padding: '4px 10px',
                background: C.gray50,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: C.gray600,
                letterSpacing: '0.02em',
              }}>
                {totalTasks} tasks
              </div>

              {taskCounts.in_progress > 0 && (
                <div style={{
                  padding: '4px 10px',
                  background: `${C.gray700}08`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: C.gray700,
                  letterSpacing: '0.02em',
                }}>
                  {taskCounts.in_progress} active
                </div>
              )}

              {completionRate > 0 && (
                <div style={{
                  padding: '4px 10px',
                  background: C.gray50,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: C.gray600,
                  letterSpacing: '0.02em',
                }}>
                  {completionRate}% done
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: C.gray400,
                width: '18px',
                height: '18px',
                pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: searchQuery ? '200px' : '160px',
                  padding: '10px 14px 10px 40px',
                  backgroundColor: C.gray50,
                  border: `1px solid ${C.gray100}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray300,
                  backgroundColor: C.white,
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray100,
                  backgroundColor: C.gray50,
                })}
              />
            </div>

            {/* Filter pill */}
            {filterTag && (
              <div
                onClick={() => setFilterTag(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: C.gray50,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${C.gray100}`,
                  fontWeight: 600,
                  fontSize: '13px',
                  color: C.gray700,
                }}
                onMouseEnter={e => Object.assign(e.currentTarget.style, {
                  background: C.gray100,
                })}
                onMouseLeave={e => Object.assign(e.currentTarget.style, {
                  background: C.gray50,
                })}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: tags.find(t => t.id === filterTag)?.color || C.gray400,
                }} />
                <span>{tags.find(t => t.id === filterTag)?.name}</span>
                <XMarkIcon style={{ width: '16px', height: '16px', color: C.gray500 }} />
              </div>
            )}

            {/* View toggle */}
            <button
              onClick={() => setView(view === "board" ? "list" : "board")}
              style={{
                padding: '10px 14px',
                background: view === "board" ? C.black : C.white,
                color: view === "board" ? C.white : C.black,
                borderRadius: '8px',
                cursor: 'pointer',
                border: view === "board" ? 'none' : `1px solid ${C.gray200}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '13px',
              }}
              onMouseEnter={e => {
                Object.assign(e.currentTarget.style, {
                  transform: 'translateY(-1px)',
                });
              }}
              onMouseLeave={e => {
                Object.assign(e.currentTarget.style, {
                  transform: 'translateY(0)',
                });
              }}
            >
              {view === "board" ? <Squares2X2Icon style={{ width: '16px', height: '16px' }} /> : <ListBulletIcon style={{ width: '16px', height: '16px' }} />}
              {view === "board" ? 'Board' : 'List'}
            </button>

            {/* Filter */}
            <div ref={filterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  padding: '10px',
                  background: showFilterDropdown ? C.black : C.white,
                  color: showFilterDropdown ? C.white : C.black,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: showFilterDropdown ? 'none' : `1px solid ${C.gray200}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  Object.assign(e.currentTarget.style, {
                    transform: 'translateY(-1px)',
                  });
                }}
                onMouseLeave={e => {
                  Object.assign(e.currentTarget.style, {
                    transform: 'translateY(0)',
                  });
                }}
              >
                <TagIcon style={{ width: '18px', height: '18px' }} />
              </button>
              {showFilterDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: C.white,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: '8px',
                  padding: '8px',
                  zIndex: 50,
                  minWidth: '180px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                }}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: C.gray700,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, {
                        backgroundColor: C.gray50,
                      })}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, {
                        backgroundColor: 'transparent',
                      })}
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: tag.color,
                      }} />
                      <span style={{ flex: 1 }}>{tag.name}</span>
                      <span style={{
                        fontSize: '12px',
                        color: C.gray400,
                        fontWeight: 700,
                      }}>{tag.taskCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              style={{
                padding: '10px 16px',
                background: C.black,
                color: C.white,
                borderRadius: '8px',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '13px',
              }}
              onMouseEnter={e => {
                Object.assign(e.currentTarget.style, {
                  background: C.gray800,
                  transform: 'translateY(-1px)',
                });
              }}
              onMouseLeave={e => {
                Object.assign(e.currentTarget.style, {
                  background: C.black,
                  transform: 'translateY(0)',
                });
              }}
            >
              <ArrowRightOnRectangleIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        padding: '32px 48px 64px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}>
              {STATUSES.map((status, index) => (
                <Column
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  tasks={tasksByStatus[status.value]}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                  onCreate={handleCreateTask}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  hoveredTask={hoveredTask}
                  setHoveredTask={setHoveredTask}
                />
              ))}
            </div>
          ) : (
            <ListView
              tasks={filteredTasks}
              tags={tags}
              onDelete={handleDeleteTask}
              onUpdate={handleUpdateTask}
              onCreate={handleCreateTask}
              editingId={editingId}
              setEditingId={setEditingId}
              hoveredTask={hoveredTask}
              setHoveredTask={setHoveredTask}
            />
          )}
        </DndContext>
      </main>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? (
          <div style={{
            padding: '12px 16px',
            background: C.black,
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: 600,
            color: C.white,
          }}>
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </div>
  );
}

function Column({ status, label, tasks, onDelete, onUpdate, onCreate, editingId, setEditingId, hoveredTask, setHoveredTask }: {
  status: TaskStatus; label: string; tasks: Task[];
  onDelete: (id: number) => void; onUpdate: (id: number, title: string) => void;
  onCreate: (title: string, status: TaskStatus) => void;
  editingId: number | null; setEditingId: (id: number | null) => void;
  hoveredTask: number | null; setHoveredTask: (id: number | null) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } });
  const taskIds = tasks.map(t => t.id.toString());
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (!isCreating) return;
    const handleClick = (e: Event) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (newTitle.trim()) onCreate(newTitle.trim(), status);
        setNewTitle("");
        setIsCreating(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNewTitle(""); setIsCreating(false); }
    };
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && newTitle.trim()) {
        e.preventDefault();
        onCreate(newTitle.trim(), status);
        setNewTitle("");
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isCreating, newTitle, onCreate, status]);

  return (
    <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '8px 4px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: C.gray500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: C.gray500,
        }}>
          {tasks.length}
        </div>
      </div>

      {/* Task cards container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        background: C.white,
        border: `1px solid ${C.gray100}`,
        minHeight: '160px',
      }}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onDelete={onDelete}
              onUpdate={onUpdate}
              isEditing={editingId === task.id}
              setEditingId={setEditingId}
              isHovered={hoveredTask === task.id}
              setHoveredTask={setHoveredTask}
            />
          ))}
        </SortableContext>

        {/* Create new task */}
        {isCreating ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: C.black,
              outline: 'none',
              padding: '12px 14px',
              minHeight: '22px',
              cursor: 'text',
              backgroundColor: C.white,
              borderRadius: '8px',
              border: `1px solid ${C.gray200}`,
            }}
            onInput={e => setNewTitle(e.currentTarget.textContent || "")}
          >{newTitle}</div>
        ) : (
          <div
            onClick={() => setIsCreating(true)}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: C.gray400,
              padding: '12px 14px',
              cursor: 'text',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: `1px dashed ${C.gray200}`,
              background: 'transparent',
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              borderColor: C.gray300,
              color: C.gray600,
              background: C.gray50,
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              borderColor: C.gray200,
              color: C.gray400,
              background: 'transparent',
            })}
          >
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            Add task
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ task, onDelete, onUpdate, isEditing, setEditingId, isHovered, setHoveredTask }: {
  task: Task; onDelete: (id: number) => void; onUpdate: (id: number, title: string) => void;
  isEditing: boolean; setEditingId: (id: number | null) => void;
  isHovered: boolean; setHoveredTask: (id: number | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id.toString(), data: { status: task.status } });
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) setTitle(task.title);
  }, [task.title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.firstChild && sel) {
        range.selectNodeContents(inputRef.current.firstChild);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const handleClick = (e: Event) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (title.trim()) onUpdate(task.id, title.trim());
        setEditingId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTitle(task.title);
        setEditingId(null);
      }
    };
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (title.trim()) onUpdate(task.id, title.trim());
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isEditing, title, task.id, task.title, onUpdate, setEditingId]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
      }}
      onMouseEnter={() => setHoveredTask(task.id)}
      onMouseLeave={() => setHoveredTask(null)}
    >
      <div
        {...(isEditing ? {} : attributes)}
        {...(isEditing ? {} : listeners)}
        style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: isHovered && !isEditing ? C.gray50 : C.white,
          border: `1px solid ${isHovered ? C.gray200 : C.gray100}`,
          cursor: isEditing ? 'text' : 'grab',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        }}
        onClick={() => !isEditing && setEditingId(task.id)}
      >
        {/* Status indicator */}
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: task.status === "not_started" ? C.gray300 : task.status === "in_progress" ? C.black : C.gray200,
          flexShrink: 0,
          marginTop: '7px',
        }} />

        {/* Text */}
        <div
          ref={inputRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: task.status === "complete" ? C.gray400 : C.gray800,
            outline: 'none',
            cursor: isEditing ? 'text' : 'inherit',
            userSelect: isEditing ? 'text' : 'none',
            flex: 1,
            minHeight: '20px',
            wordBreak: 'break-word',
            lineHeight: 1.5,
            direction: 'ltr',
            textAlign: 'left',
          }}
          onInput={e => setTitle(e.currentTarget.textContent || "")}
        >
          {title}
        </div>

        {/* Delete */}
        {isHovered && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.gray400,
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 500,
              flexShrink: 0,
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              color: C.black,
              background: C.gray100,
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              color: C.gray400,
              background: 'transparent',
            })}
          >×</button>
        )}
      </div>
    </div>
  );
}

function ListView({ tasks, tags, onDelete, onUpdate, onCreate, editingId, setEditingId, hoveredTask, setHoveredTask }: {
  tasks: Task[]; tags: any[]; onDelete: (id: number) => void; onUpdate: (id: number, title: string) => void;
  onCreate: (title: string, status: TaskStatus) => void;
  editingId: number | null; setEditingId: (id: number | null) => void;
  hoveredTask: number | null; setHoveredTask: (id: number | null) => void;
}) {
  const grouped = [
    { label: "BACKLOG", tasks: tasks.filter(t => t.status === "not_started") },
    { label: "IN PROGRESS", tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "DONE", tasks: tasks.filter(t => t.status === "complete") },
  ].filter(g => g.tasks.length > 0);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (!isCreating) return;
    const handleClick = (e: Event) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (newTitle.trim()) onCreate(newTitle.trim(), "not_started");
        setNewTitle("");
        setIsCreating(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNewTitle(""); setIsCreating(false); }
    };
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && newTitle.trim()) {
        e.preventDefault();
        onCreate(newTitle.trim(), "not_started");
        setNewTitle("");
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isCreating, newTitle, onCreate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {grouped.map((group) => (
        <div key={group.label}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '8px 4px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: C.gray500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>{group.label}</span>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: C.gray500,
            }}>{group.tasks.length}</span>
          </div>
          <div style={{
            background: C.white,
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1px solid ${C.gray100}`,
          }}>
            {group.tasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${C.gray100}`,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <TaskItem
                  task={task}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  isEditing={editingId === task.id}
                  setEditingId={setEditingId}
                  isHovered={hoveredTask === task.id}
                  setHoveredTask={setHoveredTask}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  FireIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";

// REFINED PALETTE - Premium sophisticated aesthetic
const C = {
  // Neutrals - Warm, sophisticated grays
  white: "#FFFFFF",
  offwhite: "#FAFAF9",
  cream: "#FFFBF7",
  ivory: "#FFFFF0",

  // Greys - Warm tonal spectrum
  gray50: "#FAFAF9",
  gray100: "#F5F5F4",
  gray200: "#E7E5E4",
  gray300: "#D6D3D1",
  gray400: "#A8A29E",
  gray500: "#78716C",
  gray600: "#57534E",
  gray700: "#44403C",
  gray800: "#292524",
  gray900: "#1C1917",
  black: "#0C0A09",

  // Premium accent palette - Sophisticated, not oversaturated
  sage: "#84CC16",
  teal: "#0D9488",
  ocean: "#0EA5E9",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  magenta: "#D946EF",
  rose: "#E11D48",
  coral: "#F97316",
  amber: "#F59E0B",
};

const STATUSES: { value: TaskStatus; label: string; gradient: string; accent: string }[] = [
  { value: "not_started", label: "BACKLOG", gradient: "linear-gradient(135deg, #E7E5E4 0%, #D6D3D1 100%)", accent: C.indigo },
  { value: "in_progress", label: "IN PROGRESS", gradient: "linear-gradient(135deg, #78716C 0%, #57534E 100%)", accent: C.coral },
  { value: "complete", label: "DONE", gradient: "linear-gradient(135deg, #D6D3D1 0%, #A8A29E 100%)", accent: C.ocean },
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
  const [staggerIndex, setStaggerIndex] = useState(0);
  const [colorShift, setColorShift] = useState(0);

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
    setTimeout(() => setStaggerIndex(1), 100);

    // Color shift animation
    const interval = setInterval(() => {
      setColorShift(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}>
          {/* Simple, elegant loading animation */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[0, 1, 2].map((i) => {
              return (
                <div key={i} style={{
                  width: '8px',
                  background: C.indigo,
                  borderRadius: '4px',
                  animation: `bounce ${0.6 + i * 0.1}s ease-in-out infinite`,
                  height: '24px',
                }} />
              );
            })}
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: C.gray900,
            letterSpacing: '-0.03em',
          }}>
            TicTac
          </h1>

          <p style={{
            fontSize: '15px',
            fontWeight: 500,
            color: C.gray500,
          }}>
            Loading your workspace
          </p>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.5); }
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.5s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 30%, ${C.gray200}15 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, ${C.gray300}15 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, ${C.gray100}20 0%, transparent 50%)
        `,
        animation: 'gradientMove 15s ease infinite',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Dot pattern overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* HEADER - Refined & Elegant */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '32px 48px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.gray200}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px',
          margin: '0 auto',
        }}>
          {/* Logo - Elegant & Clean */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.violet} 100%)`,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <SparklesIcon style={{ width: '28px', height: '28px', color: C.white }} />
            </div>

            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: C.gray900,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}>
                TicTac
              </h1>

              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}>
                {/* Stats badges - Refined */}
                <div style={{
                  padding: '4px 12px',
                  background: C.gray100,
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.gray700,
                  letterSpacing: '0.02em',
                  border: `1px solid ${C.gray200}`,
                }}>
                  {totalTasks} Tasks
                </div>

                {taskCounts.in_progress > 0 && (
                  <div style={{
                    padding: '4px 12px',
                    background: `${C.coral}10`,
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: C.coral,
                    letterSpacing: '0.02em',
                    border: `1px solid ${C.coral}20`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <FireIcon style={{ width: '12px', height: '12px' }} />
                    {taskCounts.in_progress} Active
                  </div>
                )}

                {completionRate > 0 && (
                  <div style={{
                    padding: '4px 12px',
                    background: `${C.ocean}10`,
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: C.ocean,
                    letterSpacing: '0.02em',
                    border: `1px solid ${C.ocean}20`,
                  }}>
                    {completionRate}% Complete
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions - BOLD */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: C.gray500,
                width: '22px',
                height: '22px',
                pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: searchQuery ? '320px' : '240px',
                  padding: '18px 20px 18px 56px',
                  backgroundColor: C.white,
                  border: `3px solid ${C.gray300}`,
                  borderRadius: '20px',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.black,
                  boxShadow: '0 0 0 4px rgba(0,0,0,0.1)',
                  transform: 'scale(1.02)',
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray300,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'scale(1)',
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
                  gap: '10px',
                  padding: '14px 20px',
                  background: C.gray100,
                  borderRadius: '50px',
                  cursor: 'pointer',
                  border: `3px solid ${C.gray300}`,
                  fontWeight: 800,
                  fontSize: '14px',
                  color: C.gray800,
                  transition: 'all 0.3s ease',
                  animation: 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                }}
                onMouseEnter={e => Object.assign(e.currentTarget.style, {
                  background: C.gray200,
                  transform: 'translateY(-3px) scale(1.05)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                })}
                onMouseLeave={e => Object.assign(e.currentTarget.style, {
                  background: C.gray100,
                  transform: 'translateY(0) scale(1)',
                  boxShadow: 'none',
                })}
              >
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: tags.find(t => t.id === filterTag)?.color || C.gray500,
                  boxShadow: `0 0 12px ${tags.find(t => t.id === filterTag)?.color || C.gray500}60`,
                }} />
                <span>{tags.find(t => t.id === filterTag)?.name}</span>
                <XMarkIcon style={{ width: '18px', height: '18px', color: C.gray600 }} />
              </div>
            )}

            {/* View toggle */}
            <button
              onClick={() => setView(view === "board" ? "list" : "board")}
              style={{
                padding: '16px 24px',
                background: view === "board" ? C.black : C.white,
                color: view === "board" ? C.white : C.black,
                borderRadius: '20px',
                cursor: 'pointer',
                border: view === "board" ? 'none' : `3px solid ${C.black}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                e.currentTarget.style.boxShadow = view === "board"
                  ? `0 12px 35px ${C.indigo}40`
                  : `0 12px 35px ${C.violet}40`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
              }}
            >
              {view === "board" ? <Squares2X2Icon style={{ width: '22px', height: '22px' }} /> : <ListBulletIcon style={{ width: '22px', height: '22px' }} />}
              {view === "board" ? 'Board' : 'List'}
            </button>

            {/* Filter */}
            <div ref={filterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  padding: '16px',
                  background: showFilterDropdown ? C.black : C.white,
                  color: showFilterDropdown ? C.white : C.black,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  border: showFilterDropdown ? 'none' : `3px solid ${C.black}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: 800,
                  fontSize: '15px',
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
              >
                <TagIcon style={{ width: '24px', height: '24px' }} />
              </button>
              {showFilterDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '16px',
                  background: C.white,
                  border: `3px solid ${C.black}`,
                  borderRadius: '20px',
                  padding: '12px',
                  zIndex: 50,
                  minWidth: '240px',
                  boxShadow: '0 15px 50px rgba(0,0,0,0.2)',
                  animation: 'dropdownIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => { setFilterTag(tag.id); setShowFilterDropdown(false); }}
                      style={{
                        padding: '14px 18px',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: C.gray800,
                        cursor: 'pointer',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, {
                        backgroundColor: C.gray100,
                        transform: 'translateX(6px) scale(1.02)',
                      })}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, {
                        backgroundColor: 'transparent',
                        transform: 'translateX(0) scale(1)',
                      })}
                    >
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: tag.color,
                        boxShadow: `0 0 12px ${tag.color}60`,
                      }} />
                      <span>{tag.name}</span>
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '13px',
                        color: C.gray500,
                        fontWeight: 900,
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
                padding: '16px 24px',
                background: `linear-gradient(135deg, ${C.gray800}, ${C.black})`,
                color: C.white,
                borderRadius: '20px',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={e => {
                Object.assign(e.currentTarget.style, {
                  background: `linear-gradient(135deg, ${C.black}, ${C.gray900})`,
                  transform: 'translateY(-3px) scale(1.05)',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.3)',
                });
              }}
              onMouseLeave={e => {
                Object.assign(e.currentTarget.style, {
                  background: `linear-gradient(135deg, ${C.gray800}, ${C.black})`,
                  transform: 'translateY(0) scale(1)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                });
              }}
            >
              <ArrowRightOnRectangleIcon style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        padding: '40px 56px 80px',
        maxWidth: '1800px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {view === "board" ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '32px',
            }}>
              {STATUSES.map((status, index) => (
                <Column
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  gradient={status.gradient}
                  accent={status.accent}
                  tasks={tasksByStatus[status.value]}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                  onCreate={handleCreateTask}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  hoveredTask={hoveredTask}
                  setHoveredTask={setHoveredTask}
                  animIndex={index}
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
            padding: '20px 28px',
            background: `linear-gradient(135deg, ${C.gray800}, ${C.black})`,
            borderRadius: '20px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
            fontSize: '18px',
            fontWeight: 900,
            color: C.white,
            transform: 'rotate(3deg) scale(1.08)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>

      <style>{`
        @keyframes gradientMove {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(5deg); }
        }
        @keyframes logoPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(3deg); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Column({ status, label, gradient, accent, tasks, onDelete, onUpdate, onCreate, editingId, setEditingId, hoveredTask, setHoveredTask, animIndex }: {
  status: TaskStatus; label: string; gradient: string; accent: string; tasks: Task[];
  onDelete: (id: number) => void; onUpdate: (id: number, title: string) => void;
  onCreate: (title: string, status: TaskStatus) => void;
  editingId: number | null; setEditingId: (id: number | null) => void;
  hoveredTask: number | null; setHoveredTask: (id: number | null) => void;
  animIndex: number;
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
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        animation: `slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${animIndex * 0.15}s both`,
      }}
    >
      {/* Column header - Refined */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px 16px',
        background: gradient,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: C.gray700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: accent,
          }} />
          {label}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: C.gray600,
          letterSpacing: '-0.02em',
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
        borderRadius: '16px',
        background: C.white,
        border: `1px solid ${C.gray200}`,
        minHeight: '200px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
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

        {/* Create new - DRAMATIC */}
        {isCreating ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: '17px',
              fontWeight: 800,
              color: C.black,
              outline: 'none',
              padding: '18px 22px',
              minHeight: '28px',
              cursor: 'text',
              backgroundColor: C.white,
              borderRadius: '16px',
              border: `3px solid ${C.black}`,
              boxShadow: '0 0 0 4px rgba(0,0,0,0.1), 0 8px 25px rgba(0,0,0,0.15)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              animation: 'bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            }}
            onInput={e => setNewTitle(e.currentTarget.textContent || "")}
          >{newTitle}</div>
        ) : (
          <div
            onClick={() => setIsCreating(true)}
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: C.gray500,
              padding: '18px 22px',
              cursor: 'text',
              borderRadius: '16px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `3px dashed ${C.gray300}`,
              background: 'transparent',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              borderColor: accent,
              color: accent,
              background: `${accent}15`,
              transform: 'scale(1.02)',
              boxShadow: `0 8px 25px ${accent}30`,
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              borderColor: C.gray300,
              color: C.gray500,
              background: 'transparent',
              transform: 'scale(1)',
              boxShadow: 'none',
            })}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
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
  const [isPressed, setIsPressed] = useState(false);

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

  // Get status gradient
  const getStatusGradient = () => {
    switch (task.status) {
      case "not_started": return `linear-gradient(135deg, ${C.indigo}, ${C.violet})`;
      case "in_progress": return `linear-gradient(135deg, ${C.gray600}, ${C.gray800})`;
      case "complete": return `linear-gradient(135deg, ${C.ocean}, ${C.sage})`;
    }
  };

  const statusGradient = getStatusGradient();

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.95 : 1,
      }}
      onMouseEnter={() => setHoveredTask(task.id)}
      onMouseLeave={() => setHoveredTask(null)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      <div
        {...(isEditing ? {} : attributes)}
        {...(isEditing ? {} : listeners)}
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: isHovered && !isEditing ? C.gray50 : C.white,
          border: task.status === "in_progress" ? `2px solid ${C.gray400}` : `1px solid ${isHovered ? C.gray300 : C.gray200}`,
          cursor: isEditing ? 'text' : 'grab',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isPressed ? 'scale(0.98)' : isHovered ? 'scale(1.01)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        }}
        onClick={() => !isEditing && setEditingId(task.id)}
      >
        {/* Status indicator - DRAMATIC */}
        {task.status !== "not_started" && !isEditing && (
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: statusGradient,
            flexShrink: 0,
            boxShadow: `0 0 16px ${task.status === "in_progress" ? C.gray500 : C.sage}60`,
            animation: task.status === "in_progress" ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
        )}

        {/* Text */}
        <div
          ref={inputRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: task.status === "complete" ? C.gray400 : C.gray900,
            outline: 'none',
            cursor: isEditing ? 'text' : 'inherit',
            userSelect: isEditing ? 'text' : 'none',
            flex: 1,
            minHeight: '20px',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
          onInput={e => setTitle(e.currentTarget.textContent || "")}
        >
          {title}
        </div>

        {/* Delete - Refined */}
        {(isHovered || isPressed) && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.gray400,
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              color: C.rose,
              background: `${C.rose}10`,
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
    { label: "BACKLOG", gradient: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, tasks: tasks.filter(t => t.status === "not_started") },
    { label: "IN PROGRESS", gradient: `linear-gradient(135deg, ${C.coral}, ${C.rose})`, tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "DONE", gradient: `linear-gradient(135deg, ${C.ocean}, ${C.sage})`, tasks: tasks.filter(t => t.status === "complete") },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {grouped.map((group, index) => (
        <div key={group.label} style={{
          animation: `slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '16px 20px',
            background: group.gradient,
            borderRadius: '20px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '3px solid rgba(0,0,0,0.1)',
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              color: C.white,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}>{group.label}</span>
            <span style={{
              fontSize: '24px',
              fontWeight: 900,
              color: C.white,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}>{group.tasks.length}</span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '3px solid rgba(0,0,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            {group.tasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: '18px 22px',
                  borderBottom: `2px solid ${C.gray100}`,
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

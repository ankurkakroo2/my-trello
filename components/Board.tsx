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

const STATUSES: { value: TaskStatus; label: string; gradient: string; accent: string }[] = [
  { value: "not_started", label: "BACKLOG", gradient: "linear-gradient(135deg, #374151 0%, #1f2937 100%)", accent: C.indigo },
  { value: "in_progress", label: "IN PROGRESS", gradient: "linear-gradient(135deg, #4b5563 0%, #374151 100%)", accent: C.orange },
  { value: "complete", label: "DONE", gradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)", accent: C.green },
];

// BOLD DRAMATIC PALETTE
const C = {
  // Neutrals
  white: "#ffffff",
  offwhite: "#fafafa",
  light: "#f8f9fa",

  // Greys - full spectrum
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  black: "#000000",

  // Bold accent colors
  purple: "#8b5cf6",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  rose: "#f43f5e",
};

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
        background: `linear-gradient(135deg, ${C.white} 0%, ${C.offwhite} 50%, ${C.light} 100%)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background circles */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.purple}20 0%, transparent 70%)`,
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.pink}20 0%, transparent 70%)`,
          animation: 'float 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blue}20 0%, transparent 70%)`,
          animation: 'float 12s ease-in-out infinite',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Dramatic loading animation */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const color = [C.purple, C.pink, C.red, C.orange, C.amber][i];
              return (
                <div key={i} style={{
                  width: '16px',
                  background: `linear-gradient(180deg, ${color} 0%, ${[C.indigo, C.rose, C.pink, C.red, C.orange][i]} 100%)`,
                  borderRadius: '8px',
                  animation: `bounce ${0.6 + i * 0.1}s ease-in-out infinite`,
                  boxShadow: `0 8px 32px ${color}66`,
                  height: '20px',
                }} />
              );
            })}
          </div>

          <h1 style={{
            fontSize: '72px',
            fontWeight: 900,
            background: `linear-gradient(135deg, ${C.black} 0%, ${C.gray800} 25%, ${C.purple} 50%, ${C.pink} 75%, ${C.black} 100%)`,
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.08em',
            textTransform: 'uppercase',
            animation: 'gradientShift 3s ease infinite',
          }}>
            TicTac
          </h1>

          <p style={{
            fontSize: '18px',
            fontWeight: 700,
            color: C.gray600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            Loading your workspace
          </p>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          @keyframes bounce {
            0%, 100% { height: 20px; }
            50% { height: 80px; }
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
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
      background: `linear-gradient(135deg, ${C.white} 0%, ${C.offwhite} 50%, ${C.light} 100%)`,
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

      {/* HEADER - MASSIVE AND DRAMATIC */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '48px 64px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(25px)',
        borderBottom: `5px solid ${C.black}`,
        boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1900px',
          margin: '0 auto',
        }}>
          {/* Logo - DRAMATIC */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }}>
            <div style={{
              width: '112px',
              height: '112px',
              background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.purple} 50%, ${C.pink} 100%)`,
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 25px 80px ${C.purple}60`,
              animation: 'logoPulse 1.5s ease-in-out infinite',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '36px',
                background: `linear-gradient(135deg, ${C.purple}, ${C.pink}, ${C.rose})`,
                opacity: 0.5,
                animation: 'pulseRing 1.2s ease-out infinite',
              }} />
              <SparklesIcon style={{ width: '60px', height: '60px', color: C.white, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
            </div>

            <div>
              <h1 style={{
                fontSize: '96px',
                fontWeight: 900,
                background: `linear-gradient(135deg, ${C.black} 0%, ${C.indigo} 25%, ${C.purple} 50%, ${C.pink} 75%, ${C.black} 100%)`,
                backgroundSize: '400% 400%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.12em',
                lineHeight: 0.9,
                textTransform: 'uppercase',
                animation: 'gradientShift 2s ease infinite',
                filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))',
              }}>
                TicTac
              </h1>

              <div style={{
                display: 'flex',
                gap: '14px',
                marginTop: '16px',
                flexWrap: 'wrap',
              }}>
                {/* Stats badges */}
                <div style={{
                  padding: '12px 24px',
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
                  borderRadius: '50px',
                  fontSize: '18px',
                  fontWeight: 900,
                  color: C.white,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  border: `4px solid ${C.purple}`,
                  transition: 'all 0.3s ease',
                  boxShadow: `0 8px 30px ${C.purple}60`,
                  animation: 'badgePulse 2s ease-in-out infinite',
                }}>
                  {totalTasks} Tasks
                </div>

                {taskCounts.in_progress > 0 && (
                  <div style={{
                    padding: '12px 24px',
                    background: `linear-gradient(135deg, ${C.orange}, ${C.red})`,
                    borderRadius: '50px',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: C.white,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    boxShadow: `0 8px 30px ${C.orange}60`,
                    animation: 'badgePulse 1.5s ease-in-out infinite',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: `4px solid ${C.red}`,
                  }}>
                    <FireIcon style={{ width: '20px', height: '20px' }} />
                    {taskCounts.in_progress} Active
                  </div>
                )}

                {completionRate > 0 && (
                  <div style={{
                    padding: '10px 20px',
                    background: `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                    borderRadius: '50px',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: C.white,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    boxShadow: `0 6px 25px ${C.emerald}50`,
                    border: `3px solid ${C.teal}`,
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
                  : `0 12px 35px ${C.purple}40`;
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
      {/* Column header - DRAMATIC */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '20px 24px',
        background: gradient,
        borderRadius: '24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        border: '4px solid rgba(0,0,0,0.15)',
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 900,
          color: C.white,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textShadow: '0 3px 6px rgba(0,0,0,0.4)',
        }}>
          <span style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 18px ${accent}`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          {label}
        </div>
        <div style={{
          fontSize: '36px',
          fontWeight: 900,
          color: C.white,
          textShadow: '0 3px 6px rgba(0,0,0,0.4)',
          letterSpacing: '-0.02em',
        }}>
          {tasks.length}
        </div>
      </div>

      {/* Task cards container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        borderRadius: '28px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(15px)',
        border: '4px solid rgba(0,0,0,0.12)',
        minHeight: '420px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
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
      case "not_started": return `linear-gradient(135deg, ${C.indigo}, ${C.purple})`;
      case "in_progress": return `linear-gradient(135deg, ${C.gray600}, ${C.gray800})`;
      case "complete": return `linear-gradient(135deg, ${C.teal}, ${C.green})`;
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
          padding: '22px 28px',
          borderRadius: '20px',
          background: isHovered && !isEditing ? C.gray100 : C.white,
          border: task.status === "in_progress" ? `4px solid ${C.gray700}` : `4px solid ${isHovered ? (task.status === "complete" ? C.teal : C.indigo) : C.gray200}`,
          cursor: isEditing ? 'text' : 'grab',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isPressed ? 'scale(0.96)' : isHovered ? 'scale(1.03)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: isHovered && task.status === "in_progress" ? '0 12px 40px rgba(0,0,0,0.2)' : (isHovered ? `0 12px 40px ${task.status === "complete" ? C.teal : C.indigo}30` : '0 3px 12px rgba(0,0,0,0.08)'),
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
            boxShadow: `0 0 16px ${task.status === "in_progress" ? C.gray500 : C.green}60`,
            animation: task.status === "in_progress" ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
        )}

        {/* Text */}
        <div
          ref={inputRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          style={{
            fontSize: '19px',
            fontWeight: isEditing ? 900 : 900,
            color: task.status === "complete" ? C.gray500 : C.black,
            outline: 'none',
            cursor: isEditing ? 'text' : 'inherit',
            userSelect: isEditing ? 'text' : 'none',
            flex: 1,
            minHeight: '32px',
            wordBreak: 'break-word',
            letterSpacing: '0.03em',
            textTransform: isEditing ? 'uppercase' : 'none',
            lineHeight: 1.3,
          }}
          onInput={e => setTitle(e.currentTarget.textContent || "")}
        >
          {title}
        </div>

        {/* Delete - DRAMATIC */}
        {(isHovered || isPressed) && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.gray400,
              background: C.gray100,
              border: '3px solid C.gray300',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '24px',
              fontWeight: 900,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              color: C.white,
              background: `linear-gradient(135deg, ${C.red}, ${C.rose})`,
              borderColor: C.red,
              transform: 'scale(1.15) rotate(90deg)',
              boxShadow: `0 6px 20px ${C.red}50`,
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              color: C.gray400,
              background: C.gray100,
              borderColor: C.gray300,
              transform: 'scale(1) rotate(0deg)',
              boxShadow: 'none',
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
    { label: "BACKLOG", gradient: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`, tasks: tasks.filter(t => t.status === "not_started") },
    { label: "IN PROGRESS", gradient: `linear-gradient(135deg, ${C.orange}, ${C.red})`, tasks: tasks.filter(t => t.status === "in_progress") },
    { label: "DONE", gradient: `linear-gradient(135deg, ${C.teal}, ${C.green})`, tasks: tasks.filter(t => t.status === "complete") },
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

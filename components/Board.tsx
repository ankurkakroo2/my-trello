"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import TaskEditor from "./TaskEditor";
import { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  TagIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "bg-brutal-pink" },
  { value: "in_progress", label: "In Progress", color: "bg-brutal-blue" },
  { value: "complete", label: "Complete", color: "bg-brutal-green" },
];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string; taskCount: number }>>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus>("not_started");
  const [isLoading, setIsLoading] = useState(true);
  const [listGrouping, setListGrouping] = useState<"none" | "status" | "tags">("none");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch data
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterTag) params.append("tagId", filterTag.toString());

      const response = await fetch(`/api/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [filterTag]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to load tags");
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchTags();
  }, [filterTag]);

  // Filter tasks by search
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group tasks by status for board view
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    not_started: filteredTasks.filter((t) => t.status === "not_started"),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    complete: filteredTasks.filter((t) => t.status === "complete"),
  };

  // Group tasks for list view
  const getGroupedTasks = () => {
    if (listGrouping === "status") {
      return STATUSES.map((status) => ({
        key: status.value,
        label: status.label,
        tasks: filteredTasks.filter((t) => t.status === status.value),
      }));
    } else if (listGrouping === "tags") {
      const tagGroups = tags.map((tag) => ({
        key: tag.id.toString(),
        label: tag.name,
        color: tag.color,
        tasks: filteredTasks.filter((t) => t.tags.some((tg) => tg.id === tag.id)),
      }));
      const untagged = {
        key: "untagged",
        label: "No Tags",
        tasks: filteredTasks.filter((t) => t.tags.length === 0),
      };
      return [...tagGroups, untagged].filter((g) => g.tasks.length > 0);
    }
    return [{ key: "all", label: "All Tasks", tasks: filteredTasks }];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(parseInt(active.id as string));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = parseInt(active.id as string);
    const overId = parseInt(over.id as string);

    // Find the active task
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Find over task or column
    const overTask = tasks.find((t) => t.id === overId);
    const overStatus = over?.data?.current?.status as TaskStatus | undefined;

    let newStatus = activeTask.status;
    let newTasks = [...tasks];
    let activeIndex = newTasks.findIndex((t) => t.id === activeId);

    if (overTask) {
      // Dropping on another task
      newStatus = overTask.status;
      const overIndex = newTasks.findIndex((t) => t.id === overId);

      if (activeTask.status === newStatus) {
        // Same column - reorder
        newTasks = arrayMove(newTasks, activeIndex, overIndex);
      } else {
        // Different column - change status and move to position
        newTasks[activeIndex] = { ...activeTask, status: newStatus };
        newTasks.splice(overIndex, 0, newTasks.splice(activeIndex, 1)[0]);
      }
    } else if (overStatus) {
      // Dropping on a column
      newStatus = overStatus;
      newTasks[activeIndex] = { ...activeTask, status: newStatus };
    }

    // Recalculate orders within each status
    const updates: Array<{ id: number; status: TaskStatus; order: number }> = [];
    STATUSES.forEach(({ value: status }) => {
      newTasks
        .filter((t) => t.status === status)
        .forEach((task, index) => {
          updates.push({ id: task.id, status, order: index });
        });
    });

    // Optimistic update
    setTasks(newTasks);

    // Persist to server
    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder");
      }
    } catch (error) {
      toast.error("Failed to reorder tasks");
      fetchTasks(); // Revert
    }
  };

  const handleCreateTask = async (data: { title: string; description: string; status: TaskStatus; tags: string[] }) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const newTask = await response.json();
      setTasks((prev) => [...prev, newTask]);
      setIsAddingTask(false);
      toast.success("Task created");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async (id: number, data: Partial<Task> | { title: string; description: string; status: TaskStatus; tags: string[] }) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const updatedTask = await response.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
      setEditingTask(null);
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setEditingTask(null);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <header className="border-brutal border-b-3 border-black bg-white sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-bold tracking-tight">My Trello</h1>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border-3 border-black focus:outline-none focus:ring-2 focus:ring-brutal-blue text-sm min-w-[200px]"
                />
              </div>

              {/* Tag Filter */}
              {filterTag ? (
                <button
                  onClick={() => setFilterTag(null)}
                  className="flex items-center gap-2 px-3 py-2 border-3 border-black bg-brutal-pink text-white font-semibold text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all shadow-brutal-sm"
                >
                  <TagIcon className="w-4 h-4" />
                  <span>Clear Filter</span>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              ) : (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 border-3 border-black bg-white shadow-brutal-sm font-semibold text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
                    <TagIcon className="w-4 h-4" />
                    <span>Filter</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border-3 border-black shadow-brutal hidden group-hover:block z-20">
                    <div className="p-2">
                      <div className="text-xs font-bold mb-2 text-gray-500">FILTER BY TAG</div>
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setFilterTag(tag.id)}
                          className="w-full text-left px-2 py-1 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{tag.taskCount}</span>
                        </button>
                      ))}
                      {tags.length === 0 && (
                        <div className="text-sm text-gray-500">No tags yet</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex border-3 border-black">
                <button
                  onClick={() => setView("board")}
                  className={cn(
                    "p-2 font-semibold text-sm",
                    view === "board" ? "bg-brutal-yellow" : "bg-white hover:bg-gray-100"
                  )}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "p-2 font-semibold text-sm border-l-3 border-black",
                    view === "list" ? "bg-brutal-yellow" : "bg-white hover:bg-gray-100"
                  )}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="flex items-center gap-2 px-4 py-2 border-3 border-black bg-brutal-orange text-white font-semibold text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all shadow-brutal-sm"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* List View Grouping Options */}
      {view === "list" && (
        <div className="max-w-[1800px] mx-auto px-4 py-3 bg-white border-b-3 border-black">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-sm">Group by:</span>
            <div className="flex border-3 border-black">
              {(["none", "status", "tags"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setListGrouping(option)}
                  className={cn(
                    "px-3 py-1 text-sm font-semibold capitalize",
                    listGrouping === option ? "bg-brutal-blue text-white" : "bg-white hover:bg-gray-100",
                    option !== "none" && "border-l-3 border-black"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-4">
        {view === "board" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STATUSES.map((status) => (
                <TaskColumn
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  color={status.color}
                  tasks={tasksByStatus[status.value]}
                  onAddTask={() => {
                    setAddingTaskStatus(status.value);
                    setIsAddingTask(true);
                  }}
                  onEditTask={setEditingTask}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="w-72 opacity-90 rotate-3">
                  <TaskCard task={activeTask} onEdit={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <ListView
            groups={getGroupedTasks()}
            onEditTask={setEditingTask}
            onAddTask={() => {
              setAddingTaskStatus("not_started");
              setIsAddingTask(true);
            }}
          />
        )}
      </main>

      {/* Task Editor Modal */}
      {(editingTask || isAddingTask) && (
        <TaskEditor
          task={editingTask}
          defaultStatus={addingTaskStatus}
          tags={tags}
          onSave={(data) => {
            if (editingTask) {
              handleUpdateTask(editingTask.id, data);
            } else {
              handleCreateTask({ ...data, status: addingTaskStatus });
            }
          }}
          onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
          onClose={() => {
            setEditingTask(null);
            setIsAddingTask(false);
          }}
        />
      )}
    </div>
  );
}

// ListView Component
function ListView({
  groups,
  onEditTask,
  onAddTask,
}: {
  groups: Array<{
    key: string;
    label: string;
    color?: string;
    tasks: Task[];
  }>;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">All Tasks</h2>
        <button
          onClick={onAddTask}
          className="px-6 py-3 bg-brutal-green border-brutal border-black shadow-brutal text-white font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
        >
          + Add Task
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.key} className="bg-white border-3 border-black shadow-brutal">
          <div className="px-4 py-3 border-b-3 border-black bg-gray-50 flex items-center gap-3">
            {group.color && (
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: group.color }}
              />
            )}
            <h3 className="font-bold">{group.label}</h3>
            <span className="text-sm text-gray-500">({group.tasks.length})</span>
          </div>
          <div className="divide-y-3 divide-black">
            {group.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onEditTask(task)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <StatusBadge status={task.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {group.tasks.length === 0 && (
              <div className="p-8 text-center text-gray-400">No tasks</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    not_started: { label: "Not Started", color: "bg-brutal-pink" },
    in_progress: { label: "In Progress", color: "bg-brutal-blue" },
    complete: { label: "Complete", color: "bg-brutal-green" },
  };

  const { label, color } = config[status];

  return (
    <span className={`${color} px-2 py-1 text-xs font-semibold text-white rounded-full`}>
      {label}
    </span>
  );
}

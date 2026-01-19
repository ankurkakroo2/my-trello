"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";
import { Task, TaskStatus } from "@/lib/types";
import { PlusIcon } from "@heroicons/react/24/outline";

interface TaskColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onAddTask: () => void;
  onUpdateTask: (id: number, data: { title: string; description: string; status: TaskStatus; tags: string[] }) => void;
  onDeleteTask: (id: number) => void;
}

export default function TaskColumn({
  status,
  label,
  color,
  tasks,
  availableTags,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TaskColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  const taskIds = tasks.map((t) => t.id.toString());

  return (
    <div className="flex flex-col h-full" role="region" aria-labelledby={`${status}-column-title`}>
      {/* Header */}
      <div className={`${color} border-3 border-black p-4 flex items-center justify-between`}>
        <h2 id={`${status}-column-title`} className="font-bold text-lg">{label}</h2>
        <span aria-label={`${tasks.length} tasks in ${label}`} className="bg-white border-3 border-black px-2 py-1 text-sm font-bold">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        role="list"
        aria-label={`${label} tasks`}
        className="flex-1 bg-gray-50 border-3 border-t-0 border-black p-3 space-y-3 min-h-[400px] overflow-y-auto"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              availableTags={availableTags}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {/* Add Task Button */}
        <button
          onClick={onAddTask}
          aria-label={`Add new task to ${label}`}
          className="w-full py-3 border-3 border-dashed border-black bg-white hover:bg-brutal-yellow hover:border-solid transition-all font-semibold flex items-center justify-center gap-2 group min-h-[48px]"
        >
          <PlusIcon className="w-5 h-5" aria-hidden="true" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
}

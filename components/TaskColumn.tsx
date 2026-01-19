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
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

export default function TaskColumn({
  status,
  label,
  color,
  tasks,
  onAddTask,
  onEditTask,
}: TaskColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  const taskIds = tasks.map((t) => t.id.toString());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${color} border-3 border-black p-4 flex items-center justify-between`}>
        <h2 className="font-bold text-lg">{label}</h2>
        <span className="bg-white border-3 border-black px-2 py-1 text-sm font-bold">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className="flex-1 bg-gray-50 border-3 border-t-0 border-black p-3 space-y-3 min-h-[400px] overflow-y-auto"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>

        {/* Add Task Button */}
        <button
          onClick={onAddTask}
          className="w-full py-3 border-3 border-dashed border-black bg-white hover:bg-brutal-yellow hover:border-solid transition-all font-semibold flex items-center justify-center gap-2 group"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
}

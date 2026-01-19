"use client";

import { useState, useEffect } from "react";
import { Task, TaskStatus } from "@/lib/types";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";

interface TaskEditorProps {
  task: Task | null;
  defaultStatus: TaskStatus;
  tags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onSave: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    tags: string[];
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function TaskEditor({
  task,
  defaultStatus,
  tags,
  onSave,
  onDelete,
  onClose,
}: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    task?.tags.map((t) => t.name) || []
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      tags: selectedTags,
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const availableColors = [
    "#FFDE59", // yellow
    "#4D96FF", // blue
    "#FF6B9D", // pink
    "#6BCB77", // green
    "#FF9F45", // orange
    "#9B59B6", // purple
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-3 border-black shadow-brutal-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b-3 border-black p-4 flex items-center justify-between bg-brutal-yellow">
          <h2 className="text-xl font-bold">
            {task ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-bold mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-3 border-black focus:outline-none focus:ring-2 focus:ring-brutal-blue text-lg"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border-3 border-black focus:outline-none focus:ring-2 focus:ring-brutal-blue min-h-[120px] resize-y"
              placeholder="Add more details..."
              rows={4}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "not_started", label: "Not Started", color: "bg-brutal-pink" },
                { value: "in_progress", label: "In Progress", color: "bg-brutal-blue" },
                { value: "complete", label: "Complete", color: "bg-brutal-green" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as TaskStatus)}
                  className={`py-2 px-3 border-3 border-black font-semibold text-sm transition-all ${
                    status === s.value
                      ? `${s.color} text-white shadow-brutal-sm`
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-bold mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2 border-3 border-black focus:outline-none focus:ring-2 focus:ring-brutal-blue"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-brutal-blue text-white border-3 border-black font-semibold hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagName) => {
                  // Find existing tag color or use random
                  const existingTag = tags.find((t) => t.name === tagName);
                  const color = existingTag?.color || availableColors[Math.floor(Math.random() * availableColors.length)];
                  return (
                    <span
                      key={tagName}
                      className="px-3 py-1 text-sm font-semibold rounded-full text-white flex items-center gap-2"
                      style={{ backgroundColor: color }}
                    >
                      {tagName}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tagName)}
                        className="hover:opacity-70"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Start typing to create new tags. Press Enter or click Add.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-3 border-black">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-3 bg-brutal-pink text-white border-3 border-black font-bold hover:bg-pink-600 flex items-center gap-2"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border-3 border-black font-bold hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-6 py-3 bg-brutal-green text-white border-3 border-black font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

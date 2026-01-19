"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, TaskStatus } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  availableTags: Array<{ id: number; name: string; color: string; taskCount: number }>;
  onUpdate: (id: number, data: { title: string; description: string; status: TaskStatus; tags: string[] }) => void;
  onDelete: (id: number) => void;
  dragAttributes?: any;
  dragListeners?: any;
}

const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const WHITE = "#ffffff";

export default function TaskCard({ task, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(task.title);
  const inputRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString(), data: { status: task.status }, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const save = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onUpdate(task.id, { title: trimmed, description: "", status: task.status, tags: [] });
    setIsEditing(false);
  }, [text, task.id, task.status, onUpdate]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setText(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.childNodes.length > 0 && sel) {
        const lastNode = inputRef.current.childNodes[inputRef.current.childNodes.length - 1];
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        save();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    document.addEventListener('mousedown', handleClick as any);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick as any);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isEditing, save, cancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  };

  // Just one editable field - ultra minimal
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px 16px',
        backgroundColor: isEditing ? GRAY_800 : GRAY_900,
        borderRadius: '8px',
        borderLeft: isEditing ? '2px solid WHITE' : '2px solid transparent',
        cursor: isEditing ? 'text' : 'grab',
        transition: 'all 0.15s ease',
      }}
      {...(isEditing ? {} : dragAttributes)}
      {...(isEditing ? {} : dragListeners)}
      onClick={() => !isEditing && setIsEditing(true)}
      onMouseEnter={e => { if (!isEditing) Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 }); }}
      onMouseLeave={e => { if (!isEditing) Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 }); }}
    >
      <div
        ref={inputRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: WHITE,
          outline: 'none',
          minHeight: '20px',
          lineHeight: '1.4',
        }}
        onInput={e => setText(e.currentTarget.textContent || "")}
        onKeyDown={handleKeyDown}
      >
        {task.title}
      </div>
    </div>
  );
}

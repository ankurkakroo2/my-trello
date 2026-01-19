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
    opacity: isDragging ? 0.5 : 1,
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

  // White card with subtle border
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '16px 18px',
        backgroundColor: WHITE,
        border: isEditing ? '2px solid BLACK' : '1px solid #e5e5e5',
        borderRadius: '12px',
        cursor: isEditing ? 'text' : 'grab',
        transition: 'all 0.2s ease',
        boxShadow: isEditing ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
      }}
      {...(isEditing ? {} : dragAttributes)}
      {...(isEditing ? {} : dragListeners)}
      onClick={() => !isEditing && setIsEditing(true)}
      onMouseEnter={e => { if (!isEditing) Object.assign(e.currentTarget.style, { borderColor: GRAY_300, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }); }}
      onMouseLeave={e => { if (!isEditing) Object.assign(e.currentTarget.style, { borderColor: '#e5e5e5', boxShadow: 'none' }); }}
    >
      <div
        ref={inputRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: BLACK,
          outline: 'none',
          minHeight: '22px',
          lineHeight: '1.5',
        }}
        onInput={e => setText(e.currentTarget.textContent || "")}
        onKeyDown={handleKeyDown}
      >
        {task.title}
      </div>
    </div>
  );
}

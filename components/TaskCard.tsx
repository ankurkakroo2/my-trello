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

const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_500 = "#525252";
const WHITE = "#ffffff";

export default function TaskCard({ task, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const inputRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString(), data: { status: task.status }, disabled: isEditing });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const save = useCallback(() => {
    if (!title.trim()) return;
    onUpdate(task.id, { title: title.trim(), description: desc.trim(), status: task.status, tags: [] });
    setIsEditing(false);
  }, [title, desc, task.id, task.status, onUpdate]);

  // Click to edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.firstChild && sel) {
        range.selectNodeContents(inputRef.current.firstChild);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  // Click outside to save
  useEffect(() => {
    if (!isEditing) return;
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        save();
      }
    };
    document.addEventListener('mousedown', handleClick as any);
    return () => document.removeEventListener('mousedown', handleClick as any);
  }, [isEditing, save]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTitle(task.title);
      setDesc(task.description || "");
    }
  };

  // Inline edit mode - card becomes input
  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          padding: '14px',
          backgroundColor: GRAY_800,
          borderRadius: '10px',
          outline: '2px solid WHITE',
          outlineOffset: '-2px',
        }}
        {...(dragAttributes || {})}
        {...(dragListeners || {})}
      >
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: '14px', fontWeight: 500, color: WHITE, minHeight: '20px' }}
          onInput={e => setTitle(e.currentTarget.textContent || "")}
          onKeyDown={handleKeyDown}
        >
          {title}
        </div>
        {task.description && (
          <div
            contentEditable
            suppressContentEditableWarning
            style={{ fontSize: '13px', color: GRAY_500, marginTop: '4px' }}
            onInput={e => setDesc(e.currentTarget.textContent || "")}
          >
            {task.description}
          </div>
        )}
      </div>
    );
  }

  // Normal card
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '14px',
        backgroundColor: GRAY_900,
        borderRadius: '10px',
        cursor: 'move',
        transition: 'background-color 0.2s',
      }}
      {...(dragAttributes || {})}
      {...(dragListeners || {})}
      onClick={() => setIsEditing(true)}
      onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}
    >
      <div style={{ fontSize: '14px', fontWeight: 500, color: WHITE }}>
        {task.title}
      </div>
      {task.description && (
        <div style={{ fontSize: '13px', color: GRAY_500 }}>{task.description}</div>
      )}
    </div>
  );
}

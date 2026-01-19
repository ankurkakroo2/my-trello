"use client";

import { useState, useRef, useEffect, MouseEvent, useCallback } from "react";
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

const STATUSES = [
  { value: "not_started" as TaskStatus, label: "To Do" },
  { value: "in_progress" as TaskStatus, label: "In Progress" },
  { value: "complete" as TaskStatus, label: "Done" },
];

// Bold dark theme
const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404060";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const WHITE = "#ffffff";

export default function TaskCard({ task, availableTags, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [showDescription, setShowDescription] = useState(!!task.description);
  const [showStatus, setShowStatus] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditing]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    data: { status: task.status },
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = useCallback(async () => {
    if (!editTitle.trim()) return;
    await onUpdate(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      status: editStatus,
      tags: [],
    });
    setIsEditing(false);
  }, [editTitle, editDescription, editStatus, task.id, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setShowDescription(!!task.description);
    setShowStatus(false);
    setShowDelete(false);
    setIsEditing(false);
  }, [task.title, task.description, task.status]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Backspace' && !editTitle && !showDelete) {
      setShowDelete(true);
    }
  };

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (isEditing && containerRef.current && !containerRef.current.contains(e.target as Node)) {
      if (editTitle.trim()) {
        handleSave();
      } else {
        handleCancel();
      }
    }
  }, [isEditing, editTitle, handleSave, handleCancel]);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside as any);
      return () => document.removeEventListener('mousedown', handleClickOutside as any);
    }
  }, [isEditing, handleClickOutside]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value);
    if (e.target.value && !showDescription) {
      setShowDescription(true);
      setShowStatus(true);
    }
  };

  const confirmDelete = () => {
    setShowDelete(false);
    setIsEditing(false);
    onDelete(task.id);
  };

  if (isEditing) {
    return (
      <div ref={containerRef} style={{ ...style, padding: '12px', backgroundColor: GRAY_900, borderRadius: '10px' }}>
        {showDelete ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ color: GRAY_400, fontSize: '13px', marginBottom: '12px' }}>Delete this task?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span
                onClick={handleCancel}
                style={{ fontSize: '13px', color: GRAY_500, cursor: 'pointer', padding: '4px 12px' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, { color: WHITE })}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { color: GRAY_500 })}
              >
                Cancel
              </span>
              <span
                onClick={confirmDelete}
                style={{ fontSize: '13px', color: '#f87171', cursor: 'pointer', padding: '4px 12px' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, { color: '#ef4444' })}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { color: '#f87171' })}
              >
                Delete
              </span>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={handleTitleChange}
              placeholder="Task name..."
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '14px',
                color: WHITE,
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onKeyDown={handleKeyDown}
            />
            {showDescription && (
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add description..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  color: editDescription ? WHITE : GRAY_600,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onKeyDown={handleKeyDown}
                onFocus={(e) => Object.assign(e.currentTarget.style, { color: WHITE })}
                onBlur={(e) => !editDescription && Object.assign(e.currentTarget.style, { color: GRAY_600 })}
              />
            )}
            {showStatus && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {STATUSES.map((s) => (
                  <span
                    key={s.value}
                    onClick={() => setEditStatus(s.value)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: editStatus === s.value ? WHITE : GRAY_500,
                      cursor: 'pointer',
                      borderRadius: '4px',
                      backgroundColor: editStatus === s.value ? GRAY_700 : 'transparent',
                    }}
                    onMouseEnter={(e) => editStatus !== s.value && Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })}
                    onMouseLeave={(e) => editStatus !== s.value && Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span
                onClick={() => setShowDelete(true)}
                style={{ fontSize: '11px', color: GRAY_600, cursor: 'pointer' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, { color: '#f87171' })}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { color: GRAY_600 })}
              >
                Delete
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '14px',
        backgroundColor: GRAY_900,
        borderRadius: '10px',
        cursor: 'move',
        transition: 'all 0.2s ease',
      }}
      {...(dragAttributes || {})}
      {...(dragListeners || {})}
      onClick={() => setIsEditing(true)}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 500, color: WHITE, margin: 0, marginBottom: task.description ? '6px' : 0 }}>
        {task.title}
      </h3>
      {task.description && <p style={{ fontSize: '13px', color: GRAY_500, margin: 0 }}>{task.description}</p>}

      {task.tags.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {task.tags.map((tag) => (
            <span key={tag.id} style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: WHITE, backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

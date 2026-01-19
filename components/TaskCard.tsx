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

// Bold dark theme - shades of grey to black
const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404040";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const GRAY_300 = "#a3a3a3";
const GRAY_200 = "#d4d4d4";
const GRAY_100 = "#e5e5e5";
const GRAY_50 = "#f5f5f5";
const WHITE = "#ffffff";

const styles = {
  card: {
    backgroundColor: GRAY_800,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '14px',
    cursor: 'move',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    position: 'relative' as const,
  },
  cardHover: {
    backgroundColor: GRAY_700,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: WHITE,
    marginBottom: '6px',
    lineHeight: '1.4',
  },
  description: {
    fontSize: '13px',
    color: GRAY_400,
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  tag: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '5px',
    fontSize: '11px',
    color: WHITE,
    marginRight: '4px',
    marginBottom: '4px',
    fontWeight: 500,
  },
  // Edit mode styles
  editContainer: {
    backgroundColor: GRAY_800,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '14px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    animation: 'slideIn 0.2s ease-out',
  },
  inlineInput: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    fontSize: '14px',
    color: WHITE,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    marginBottom: '8px',
  },
  inlineInputFocus: {
    borderBottomColor: WHITE,
  },
  statusButton: {
    padding: '6px 12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: GRAY_400,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginRight: '6px',
    borderRadius: '6px',
  },
  statusButtonHover: {
    backgroundColor: GRAY_700,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: WHITE,
  },
  statusButtonActive: {
    backgroundColor: GRAY_600,
    color: WHITE,
    borderColor: GRAY_500,
  },
  hintText: {
    fontSize: '11px',
    color: GRAY_500,
    marginTop: '10px',
  },
  dangerText: {
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
  },
  dangerTextHover: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
};

export default function TaskCard({ task, availableTags, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [task.title, task.description, task.status]);

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setIsEditing(false);
    onDelete(task.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
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

  if (isEditing) {
    return (
      <div ref={containerRef} style={{ ...style, ...styles.editContainer }}>
        {showDeleteConfirm ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: WHITE, marginBottom: '16px', fontSize: '14px' }}>
              Delete this task?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span
                onClick={handleCancel}
                style={{ ...styles.statusButton, cursor: 'pointer' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.statusButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: GRAY_400 })}
              >
                Cancel
              </span>
              <span
                onClick={confirmDelete}
                style={{ ...styles.statusButton, backgroundColor: '#dc2626', borderColor: '#dc2626', color: WHITE, cursor: 'pointer' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#b91c1c' })}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#dc2626', borderColor: '#dc2626' })}
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
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title..."
              style={styles.inlineInput}
              onKeyDown={handleKeyDown}
              onFocus={(e) => Object.assign(e.currentTarget.style, styles.inlineInputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, { borderBottomColor: 'rgba(255, 255, 255, 0.15)' })}
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add description (optional)..."
              style={{ ...styles.inlineInput, fontSize: '13px', color: GRAY_400, marginBottom: '12px' }}
              onKeyDown={handleKeyDown}
              onFocus={(e) => Object.assign(e.currentTarget.style, styles.inlineInputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, { borderBottomColor: 'rgba(255, 255, 255, 0.15)' })}
            />

            <div style={{ marginBottom: '12px' }}>
              {STATUSES.map((s) => (
                <span
                  key={s.value}
                  onClick={() => setEditStatus(s.value)}
                  style={{
                    ...styles.statusButton,
                    ...(editStatus === s.value ? styles.statusButtonActive : {}),
                    ...(editStatus !== s.value ? { onMouseEnter: (e: React.MouseEvent<HTMLSpanElement>) => Object.assign(e.currentTarget.style, styles.statusButtonHover), onMouseLeave: (e: React.MouseEvent<HTMLSpanElement>) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: GRAY_400 }) } : {}),
                  }}
                >
                  {s.label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                onClick={() => setShowDeleteConfirm(true)}
                style={styles.dangerText}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.dangerTextHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
              >
                Delete
              </span>
              <span style={{ fontSize: '11px', color: GRAY_500 }}>
                Enter to save · Esc to cancel
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
      style={{ ...style, ...styles.card }}
      {...(dragAttributes || {})}
      {...(dragListeners || {})}
      onClick={() => setIsEditing(true)}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800, borderColor: 'rgba(255, 255, 255, 0.06)', transform: 'translateY(0)', boxShadow: 'none' })}
    >
      <h3 style={styles.title}>{task.title}</h3>
      {task.description && <p style={styles.description}>{task.description}</p>}

      {task.tags.length > 0 && (
        <div>
          {task.tags.map((tag) => (
            <span key={tag.id} style={{ ...styles.tag, backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

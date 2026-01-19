"use client";

import { useState, useRef, useEffect } from "react";
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

// Clean theme colors
const WHITE = "#ffffff";
const GRAY_50 = "#f9fafb";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_300 = "#d1d5db";
const GRAY_400 = "#9ca3af";
const GRAY_500 = "#6b7280";
const GRAY_600 = "#4b5563";
const GRAY_700 = "#374151";
const GRAY_800 = "#1f2937";
const GRAY_900 = "#111827";
const BLUE_500 = "#3b82f6";
const BLUE_50 = "#eff6ff";
const BLUE_100 = "#dbeafe";
const RED_500 = "#ef4444";
const RED_50 = "#fef2f2";

const styles = {
  card: {
    backgroundColor: WHITE,
    border: `1px solid ${GRAY_200}`,
    borderRadius: '10px',
    padding: '14px',
    cursor: 'move',
    transition: 'all 0.2s',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHover: {
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: GRAY_900,
    marginBottom: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  description: {
    fontSize: '13px',
    color: GRAY_500,
    marginBottom: '10px',
    lineHeight: '1.4',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  tag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: WHITE,
    marginRight: '4px',
    marginBottom: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 500,
  },
  editContainer: {
    backgroundColor: WHITE,
    border: `1px solid ${GRAY_200}`,
    borderRadius: '10px',
    padding: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  inlineInput: {
    width: '100%',
    padding: '6px 8px',
    backgroundColor: WHITE,
    border: `1px solid ${GRAY_300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: GRAY_900,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    outline: 'none',
    marginBottom: '8px',
  },
  inlineInputFocus: {
    borderColor: BLUE_500,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  inlineTextarea: {
    width: '100%',
    padding: '6px 8px',
    backgroundColor: WHITE,
    border: `1px solid ${GRAY_300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: GRAY_700,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '60px',
    marginBottom: '12px',
  },
  statusButton: {
    padding: '4px 10px',
    border: `1px solid ${GRAY_200}`,
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: WHITE,
    color: GRAY_600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginRight: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '6px',
  },
  statusButtonHover: {
    borderColor: GRAY_300,
    backgroundColor: GRAY_50,
  },
  statusButtonActive: {
    backgroundColor: BLUE_500,
    color: WHITE,
    borderColor: BLUE_500,
  },
  buttonGroup: {
    display: 'flex',
    gap: '6px',
    marginTop: '12px',
  },
  primaryButton: {
    flex: 1,
    padding: '6px 12px',
    backgroundColor: BLUE_500,
    color: WHITE,
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '6px',
    transition: 'all 0.15s',
  },
  primaryButtonHover: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: GRAY_500,
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '6px',
  },
  secondaryButtonHover: {
    color: GRAY_700,
    backgroundColor: GRAY_50,
  },
  dangerButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: GRAY_400,
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '6px',
  },
  dangerButtonHover: {
    color: RED_500,
    backgroundColor: RED_50,
  },
  confirmDeleteButton: {
    padding: '6px 12px',
    backgroundColor: RED_500,
    color: WHITE,
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '6px',
  },
  confirmDeleteButtonHover: {
    backgroundColor: '#dc2626',
  },
  errorText: {
    color: RED_500,
    fontSize: '12px',
    marginTop: '-4px',
    marginBottom: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  hintText: {
    fontSize: '12px',
    color: GRAY_400,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
};

export default function TaskCard({ task, availableTags, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSave = async () => {
    if (!editTitle.trim()) {
      setTitleError("Title is required");
      return;
    }
    setIsSubmitting(true);
    setTitleError("");
    await onUpdate(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      status: editStatus,
      tags: [],
    });
    setIsEditing(false);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setTitleError("");
    setIsEditing(false);
  };

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

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={{ ...style, ...styles.editContainer }}>
        {showDeleteConfirm ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: GRAY_700, marginBottom: '16px', fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Delete this task?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={styles.secondaryButton}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.secondaryButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={styles.confirmDeleteButton}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.confirmDeleteButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: RED_500 })}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); setTitleError(""); }}
              style={{
                ...styles.inlineInput,
                borderColor: titleError ? RED_500 : GRAY_300,
                boxShadow: titleError ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
              }}
              placeholder="Task title"
              autoFocus
              onFocus={(e) => Object.assign(e.currentTarget.style, styles.inlineInputFocus)}
            />
            {titleError && <p style={styles.errorText}>{titleError}</p>}

            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              style={styles.inlineTextarea}
              placeholder="Add a description..."
              rows={2}
              onFocus={(e) => {
                Object.assign(e.currentTarget.style, {
                  borderColor: BLUE_500,
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                });
              }}
              onBlur={(e) => {
                Object.assign(e.currentTarget.style, styles.inlineTextarea);
              }}
            />

            <div style={{ marginBottom: '12px' }}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setEditStatus(s.value)}
                  style={{
                    ...styles.statusButton,
                    ...(editStatus === s.value ? styles.statusButtonActive : {}),
                    ...(editStatus !== s.value ? { onMouseEnter: (e) => Object.assign(e.currentTarget.style, styles.statusButtonHover), onMouseLeave: (e) => Object.assign(e.currentTarget.style, { backgroundColor: WHITE, borderColor: GRAY_200, color: GRAY_600 }) } : {}),
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={styles.dangerButton}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.dangerButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_400 })}
              >
                Delete
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={handleCancel}
                style={styles.secondaryButton}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.secondaryButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: GRAY_500 })}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!editTitle.trim() || isSubmitting}
                style={{
                  ...styles.primaryButton,
                  opacity: (!editTitle.trim() || isSubmitting) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => (editTitle.trim() && !isSubmitting) && Object.assign(e.currentTarget.style, styles.primaryButtonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: BLUE_500 })}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>

            <div style={{ marginTop: '8px' }}>
              <p style={styles.hintText}>Press Enter to save · Escape to cancel</p>
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
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transform: 'translateY(0)' })}
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

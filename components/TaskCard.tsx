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

const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404060";
const GRAY_500 = "#525252";
const GRAY_400 = "#737373";
const WHITE = "#ffffff";

export default function TaskCard({ task, onUpdate, onDelete, dragAttributes, dragListeners }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [step, setStep] = useState<'title' | 'description' | 'status' | 'delete'>('title');
  const [showDesc, setShowDesc] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, step]);

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

  const saveAndClose = useCallback(async () => {
    if (!title.trim()) return;
    await onUpdate(task.id, { title: title.trim(), description: description.trim(), status, tags: [] });
    setIsEditing(false);
  }, [title, description, status, task.id, onUpdate]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!isEditing || !containerRef.current) return;
    if (containerRef.current.contains(e.target as Node)) return;
    if (step === 'delete') return;
    saveAndClose();
  }, [isEditing, step, saveAndClose]);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside as any);
      return () => document.removeEventListener('mousedown', handleClickOutside as any);
    }
  }, [isEditing, handleClickOutside]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'title') {
        if (title.trim()) {
          setShowDesc(true);
          setStep('description');
        }
      } else if (step === 'description') {
        setStep('status');
      } else if (step === 'status') {
        saveAndClose();
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setShowDesc(false);
      setStep('title');
    } else if (e.key === 'Backspace' && !title && step === 'title') {
      setStep('delete');
    }
  };

  const confirmDelete = () => {
    onDelete(task.id);
  };

  if (isEditing) {
    return (
      <div ref={containerRef} style={{ ...style, padding: '12px', backgroundColor: GRAY_900, borderRadius: '10px' }}>
        {step === 'delete' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: '13px', color: GRAY_500 }}>Delete?</span>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <span onClick={confirmDelete} style={{ fontSize: '13px', color: '#f87171', cursor: 'pointer' }}>Yes</span>
              <span onClick={() => setStep('title')} style={{ fontSize: '13px', color: GRAY_500, cursor: 'pointer' }}>No</span>
            </div>
          </div>
        )}

        {step === 'title' && (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task name..."
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: WHITE,
              outline: 'none',
            }}
            onKeyDown={handleKeyDown}
          />
        )}

        {step === 'description' && (
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add description..."
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: WHITE,
              outline: 'none',
            }}
            onKeyDown={handleKeyDown}
          />
        )}

        {step === 'status' && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {STATUSES.map(s => (
              <span
                key={s.value}
                onClick={() => { setStatus(s.value); saveAndClose(); }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: status === s.value ? WHITE : GRAY_500,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  backgroundColor: status === s.value ? GRAY_700 : 'transparent',
                }}
                onMouseEnter={e => status !== s.value && Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })}
                onMouseLeave={e => status !== s.value && Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
              >
                {s.label}
              </span>
            ))}
          </div>
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
        transition: 'background-color 0.2s',
      }}
      {...(dragAttributes || {})}
      {...(dragListeners || {})}
      onClick={() => { setIsEditing(true); setStep('title'); setShowDesc(!!task.description); }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_800 })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: GRAY_900 })}
    >
      <div style={{ fontSize: '14px', fontWeight: 500, color: WHITE, marginBottom: task.description ? '4px' : 0 }}>
        {task.title}
      </div>
      {task.description && (
        <div style={{ fontSize: '13px', color: GRAY_500 }}>{task.description}</div>
      )}
      {task.tags.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
          {task.tags.map(tag => (
            <span key={tag.id} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: WHITE, backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

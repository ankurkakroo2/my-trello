export type TaskStatus = "not_started" | "in_progress" | "complete";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  taskCount?: number;
}

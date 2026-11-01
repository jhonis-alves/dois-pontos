import { apiRequest } from './http';

export type TaskScope = 'private' | 'shared';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly';

export interface TaskRecurrence {
  id: string;
  frequency: RoutineFrequency;
  intervalCount: number;
  endsOn: string | null;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Task {
  id: string;
  scope: TaskScope;
  ownerUserId: string | null;
  creatorUserId: string;
  assigneeUserId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  recurrence: TaskRecurrence | null;
  parentTaskId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  scope: TaskScope;
  assigneeUserId?: string | null;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  dueTime?: string;
  recurrence?: {
    frequency: RoutineFrequency;
    intervalCount?: number;
    endsOn?: string;
  };
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  startDate?: string | null;
}

export interface Habit {
  id: string;
  scope: TaskScope;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  frequency: RoutineFrequency;
  targetCount: number;
  categoryId: string | null;
  startsOn: string;
  endsOn: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  entries: { date: string; count: number; note: string | null }[];
  todayCount: number;
  periodCount: number;
  periodTarget: number;
  currentStreak: number;
}

export interface HabitCreateInput {
  name: string;
  description?: string;
  scope: TaskScope;
  frequency: RoutineFrequency;
  targetCount: number;
  startsOn?: string;
}

export interface HabitUpdateInput {
  name?: string;
  description?: string | null;
  frequency?: RoutineFrequency;
  targetCount?: number;
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await apiRequest<{ tasks: Task[] }>('/api/tasks');
  return response.tasks;
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const response = await apiRequest<{ task: Task }>('/api/tasks', {
    method: 'POST',
    body: input,
  });
  return response.task;
}

export async function updateTask(
  taskId: string,
  input: TaskUpdateInput,
): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(
    `/api/tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: input },
  );
  return response.task;
}

export function archiveTask(taskId: string): Promise<void> {
  return apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}

export async function createSubtask(
  taskId: string,
  title: string,
): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(
    `/api/tasks/${encodeURIComponent(taskId)}/subtasks`,
    { method: 'POST', body: { title } },
  );
  return response.task;
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  input: { title?: string; done?: boolean },
): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(
    `/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    { method: 'PATCH', body: input },
  );
  return response.task;
}

export async function deleteSubtask(
  taskId: string,
  subtaskId: string,
): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(
    `/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    { method: 'DELETE' },
  );
  return response.task;
}

export async function fetchHabits(): Promise<Habit[]> {
  const response = await apiRequest<{ habits: Habit[] }>('/api/habits');
  return response.habits;
}

export async function createHabit(input: HabitCreateInput): Promise<Habit> {
  const response = await apiRequest<{ habit: Habit }>('/api/habits', {
    method: 'POST',
    body: input,
  });
  return response.habit;
}

export async function updateHabit(
  habitId: string,
  input: HabitUpdateInput,
): Promise<Habit> {
  const response = await apiRequest<{ habit: Habit }>(
    `/api/habits/${encodeURIComponent(habitId)}`,
    { method: 'PATCH', body: input },
  );
  return response.habit;
}

export function archiveHabit(habitId: string): Promise<void> {
  return apiRequest(`/api/habits/${encodeURIComponent(habitId)}`, {
    method: 'DELETE',
  });
}

export async function setHabitEntry(
  habitId: string,
  date: string,
  count: number,
): Promise<Habit> {
  const response = await apiRequest<{ habit: Habit }>(
    `/api/habits/${encodeURIComponent(habitId)}/entries/${date}`,
    { method: 'PUT', body: { count } },
  );
  return response.habit;
}

export async function deleteHabitEntry(
  habitId: string,
  date: string,
): Promise<Habit> {
  const response = await apiRequest<{ habit: Habit }>(
    `/api/habits/${encodeURIComponent(habitId)}/entries/${date}`,
    { method: 'DELETE' },
  );
  return response.habit;
}

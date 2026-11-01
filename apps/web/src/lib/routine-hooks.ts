import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveHabit,
  archiveTask,
  createHabit,
  createSubtask,
  createTask,
  deleteHabitEntry,
  deleteSubtask,
  fetchHabits,
  fetchTasks,
  setHabitEntry,
  updateHabit,
  updateSubtask,
  updateTask,
  type HabitCreateInput,
  type HabitUpdateInput,
  type TaskCreateInput,
  type TaskUpdateInput,
} from './routine-api';

export const TASKS_QUERY_KEY = ['tasks'] as const;
export const HABITS_QUERY_KEY = ['habits'] as const;

export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    retry: false,
  });
}

export function useHabits() {
  return useQuery({
    queryKey: HABITS_QUERY_KEY,
    queryFn: fetchHabits,
    retry: false,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TaskCreateInput) => createTask(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; input: TaskUpdateInput }) =>
      updateTask(params.taskId, params.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; title: string }) =>
      createSubtask(params.taskId, params.title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      taskId: string;
      subtaskId: string;
      input: { title?: string; done?: boolean };
    }) => updateSubtask(params.taskId, params.subtaskId, params.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; subtaskId: string }) =>
      deleteSubtask(params.taskId, params.subtaskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HabitCreateInput) => createHabit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { habitId: string; input: HabitUpdateInput }) =>
      updateHabit(params.habitId, params.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
    },
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveHabit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
    },
  });
}

export function useSetHabitEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { habitId: string; date: string; count: number }) =>
      setHabitEntry(params.habitId, params.date, params.count),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
    },
  });
}

export function useDeleteHabitEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { habitId: string; date: string }) =>
      deleteHabitEntry(params.habitId, params.date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
    },
  });
}

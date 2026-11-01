import type {
  Habit,
  RoutineFrequency,
  Task,
  TaskPriority,
  TaskStatus,
} from './routine-api';
import { formatDate, todayIso } from './format';

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída',
  cancelled: 'Cancelada',
};

export const FREQUENCY_LABELS: Record<RoutineFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export const FREQUENCY_PERIOD_LABELS: Record<RoutineFrequency, string> = {
  daily: 'hoje',
  weekly: 'nesta semana',
  monthly: 'neste mês',
};

export function recurrenceLabel(task: Task): string | null {
  if (!task.recurrence) return null;

  const units: Record<RoutineFrequency, string> = {
    daily: 'dias',
    weekly: 'semanas',
    monthly: 'meses',
  };

  if (task.recurrence.intervalCount > 1) {
    return `A cada ${task.recurrence.intervalCount} ${
      units[task.recurrence.frequency]
    }`;
  }

  const labels: Record<RoutineFrequency, string> = {
    daily: 'Todos os dias',
    weekly: 'Toda semana',
    monthly: 'Todo mês',
  };

  return labels[task.recurrence.frequency];
}

export function isTaskOverdue(task: Task): boolean {
  return (
    task.status !== 'done' &&
    task.status !== 'cancelled' &&
    Boolean(task.dueDate) &&
    (task.dueDate as string) < todayIso()
  );
}

export function dueDateLabel(task: Task): string | null {
  if (!task.dueDate) return null;
  if (task.dueDate === todayIso()) return 'Hoje';
  return formatDate(task.dueDate);
}

export function habitPeriodLabel(habit: Habit): string {
  return `${habit.periodCount} de ${habit.periodTarget} ${
    FREQUENCY_PERIOD_LABELS[habit.frequency]
  }`;
}

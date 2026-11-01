import { useState, type FormEvent } from 'react';
import { Flame, Minus, Pencil, Plus, Repeat, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { todayIso } from '../../lib/format';
import { ApiError } from '../../lib/http';
import type { Habit, RoutineFrequency } from '../../lib/routine-api';
import {
  useArchiveHabit,
  useSetHabitEntry,
  useUpdateHabit,
} from '../../lib/routine-hooks';
import {
  FREQUENCY_LABELS,
  habitPeriodLabel,
} from '../../lib/routine-format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface HabitCardProps {
  habit: Habit;
}

export function HabitCard({ habit }: HabitCardProps) {
  const updateHabit = useUpdateHabit();
  const archiveHabit = useArchiveHabit();
  const setEntry = useSetHabitEntry();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editFrequency, setEditFrequency] = useState<RoutineFrequency>(
    habit.frequency,
  );
  const [editTarget, setEditTarget] = useState(habit.targetCount);
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const percent = Math.min(
    100,
    Math.round((habit.periodCount / habit.periodTarget) * 100),
  );
  const metToday = habit.todayCount >= habit.targetCount;
  const metPeriod = habit.periodCount >= habit.periodTarget;

  function reportError(submitError: unknown, fallback: string) {
    setError(
      submitError instanceof ApiError ? submitError.message : fallback,
    );
  }

  function startEditing() {
    setEditName(habit.name);
    setEditFrequency(habit.frequency);
    setEditTarget(habit.targetCount);
    setEditing(true);
    setError(null);
  }

  async function changeCount(count: number) {
    setError(null);
    try {
      await setEntry.mutateAsync({
        habitId: habit.id,
        date: today,
        count: Math.max(0, Math.min(100, count)),
      });
    } catch (submitError) {
      reportError(submitError, 'Não foi possível registrar o hábito.');
    }
  }

  async function registerToday() {
    if (habit.frequency === 'daily' && metToday) {
      await changeCount(0);
      return;
    }
    await changeCount(habit.todayCount + 1);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await updateHabit.mutateAsync({
        habitId: habit.id,
        input: {
          name: editName.trim(),
          frequency: editFrequency,
          targetCount: editTarget,
        },
      });
      setEditing(false);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível salvar o hábito.');
    }
  }

  async function archive() {
    setError(null);
    try {
      await archiveHabit.mutateAsync(habit.id);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível arquivar o hábito.');
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">{habit.name}</h3>
          {habit.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--muted)]">
              {habit.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={startEditing}
            aria-label={`Editar hábito ${habit.name}`}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => void archive()}
            aria-label={`Arquivar hábito ${habit.name}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={habit.scope === 'private' ? 'warning' : 'primary'}>
          {habit.scope === 'private' ? 'Privado' : 'Casal'}
        </Badge>
        <Badge>
          <Repeat size={12} aria-hidden="true" />
          {FREQUENCY_LABELS[habit.frequency]}
        </Badge>
        <Badge variant={habit.currentStreak > 0 ? 'success' : 'default'}>
          <Flame size={12} aria-hidden="true" />
          {habit.currentStreak} de sequência
        </Badge>
        <span className="text-xs text-[var(--muted)]">
          Meta: {habit.targetCount}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold">{habitPeriodLabel(habit)}</span>
          <span className={cn(metPeriod && 'text-[var(--success)]')}>
            {percent}%
          </span>
        </div>
        <div className="progress-track mt-1.5" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={metToday && habit.frequency === 'daily' ? 'soft' : 'primary'}
          className="min-h-9 px-3 py-1 text-xs"
          onClick={() => void registerToday()}
          disabled={setEntry.isPending}
        >
          {habit.frequency === 'daily' && metToday
            ? 'Desmarcar hoje'
            : 'Registrar hoje'}
        </Button>

        <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-1 py-0.5">
          <button
            type="button"
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-40"
            onClick={() => void changeCount(habit.todayCount - 1)}
            disabled={habit.todayCount === 0 || setEntry.isPending}
            aria-label="Diminuir registro de hoje"
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className="min-w-8 text-center text-xs font-semibold">
            {habit.todayCount}
          </span>
          <button
            type="button"
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--primary)] disabled:opacity-40"
            onClick={() => void changeCount(habit.todayCount + 1)}
            disabled={setEntry.isPending}
            aria-label="Aumentar registro de hoje"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {editing && (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
          onSubmit={saveEdit}
        >
          <div className="field">
            <label className="field-label" htmlFor={`habit-edit-name-${habit.id}`}>
              Nome
            </label>
            <input
              id={`habit-edit-name-${habit.id}`}
              className="input"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label
                className="field-label"
                htmlFor={`habit-edit-frequency-${habit.id}`}
              >
                Frequência
              </label>
              <select
                id={`habit-edit-frequency-${habit.id}`}
                className="input"
                value={editFrequency}
                onChange={(event) =>
                  setEditFrequency(event.target.value as RoutineFrequency)
                }
              >
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label
                className="field-label"
                htmlFor={`habit-edit-target-${habit.id}`}
              >
                Meta por período
              </label>
              <input
                id={`habit-edit-target-${habit.id}`}
                className="input"
                type="number"
                min={1}
                max={100}
                value={editTarget}
                onChange={(event) =>
                  setEditTarget(
                    Math.min(
                      100,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  )
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => setEditing(false)}
            >
              <X size={14} aria-hidden="true" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-8 px-2 py-1 text-xs"
              disabled={updateHabit.isPending}
            >
              Salvar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="form-error mt-3" role="alert">
          {error}
        </div>
      )}
    </Card>
  );
}

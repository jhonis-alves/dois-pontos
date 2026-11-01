import { useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http';
import type {
  Task,
  TaskPriority,
  TaskUpdateInput,
} from '../../lib/routine-api';
import {
  useArchiveTask,
  useCreateSubtask,
  useDeleteSubtask,
  useUpdateSubtask,
  useUpdateTask,
} from '../../lib/routine-hooks';
import {
  dueDateLabel,
  isTaskOverdue,
  PRIORITY_LABELS,
  recurrenceLabel,
} from '../../lib/routine-format';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface TaskCardProps {
  task: Task;
  members: SpaceMember[];
  currentUserId: string;
}

function priorityVariant(priority: TaskPriority): BadgeVariant {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  return 'default';
}

export function TaskCard({ task, members, currentUserId }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ?? '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assigneeUserId ?? '');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = task.status === 'done';
  const cancelled = task.status === 'cancelled';
  const overdue = isTaskOverdue(task);
  const recurrence = recurrenceLabel(task);
  const assignee = members.find((member) => member.id === task.assigneeUserId);
  const doneSubtasks = task.subtasks.filter((subtask) => subtask.done).length;

  function reportError(submitError: unknown, fallback: string) {
    setError(
      submitError instanceof ApiError ? submitError.message : fallback,
    );
  }

  function startEditing() {
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ?? '');
    setEditPriority(task.priority);
    setEditAssignee(task.assigneeUserId ?? '');
    setEditing(true);
    setError(null);
  }

  async function toggleDone() {
    setError(null);
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        input: { status: done ? 'pending' : 'done' },
      });
    } catch (submitError) {
      reportError(submitError, 'Não foi possível atualizar a tarefa.');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input: TaskUpdateInput = {
      title: editTitle.trim(),
      dueDate: editDueDate || null,
      priority: editPriority,
      assigneeUserId:
        task.scope === 'shared' ? editAssignee || null : currentUserId,
    };

    try {
      await updateTask.mutateAsync({ taskId: task.id, input });
      setEditing(false);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível salvar a tarefa.');
    }
  }

  async function archive() {
    setError(null);
    try {
      await archiveTask.mutateAsync(task.id);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível arquivar a tarefa.');
    }
  }

  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = subtaskTitle.trim();

    if (!title) return;

    setError(null);
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title });
      setSubtaskTitle('');
      setShowSubtaskForm(false);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível criar a subtarefa.');
    }
  }

  async function toggleSubtask(subtaskId: string, nextDone: boolean) {
    setError(null);
    try {
      await updateSubtask.mutateAsync({
        taskId: task.id,
        subtaskId,
        input: { done: nextDone },
      });
    } catch (submitError) {
      reportError(submitError, 'Não foi possível atualizar a subtarefa.');
    }
  }

  async function removeSubtask(subtaskId: string) {
    setError(null);
    try {
      await deleteSubtask.mutateAsync({ taskId: task.id, subtaskId });
    } catch (submitError) {
      reportError(submitError, 'Não foi possível remover a subtarefa.');
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => void toggleDone()}
          aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
          className={cn(
            'mt-0.5 shrink-0 rounded-full transition-colors',
            done
              ? 'text-[var(--success)]'
              : 'text-[var(--muted)] hover:text-[var(--primary)]',
          )}
        >
          {done ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <Circle size={22} aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  'break-words text-sm font-semibold',
                  (done || cancelled) &&
                    'text-[var(--muted)] line-through decoration-1',
                )}
              >
                {task.title}
              </h3>

              {task.description && (
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--muted)]">
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                className="min-h-8 px-2 py-1 text-xs"
                onClick={startEditing}
                aria-label={`Editar tarefa ${task.title}`}
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                className="min-h-8 px-2 py-1 text-xs"
                onClick={() => void archive()}
                aria-label={`Arquivar tarefa ${task.title}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={task.scope === 'private' ? 'warning' : 'primary'}>
              {task.scope === 'private' ? 'Privada' : 'Casal'}
            </Badge>
            <Badge variant={priorityVariant(task.priority)}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.dueDate && (
              <Badge variant={overdue ? 'danger' : 'default'}>
                <CalendarDays size={12} aria-hidden="true" />
                {overdue ? 'Atrasada · ' : ''}
                {dueDateLabel(task)}
              </Badge>
            )}
            {recurrence && (
              <Badge variant="primary">
                <Repeat size={12} aria-hidden="true" />
                {recurrence}
              </Badge>
            )}
            <span className="text-xs text-[var(--muted)]">
              {assignee
                ? assignee.id === currentUserId
                  ? 'Você'
                  : assignee.displayName
                : 'Casal'}
            </span>
          </div>

          {editing && (
            <form
              className="mt-3 space-y-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
              onSubmit={saveEdit}
            >
              <div className="field">
                <label className="field-label" htmlFor={`edit-title-${task.id}`}>
                  Título
                </label>
                <input
                  id={`edit-title-${task.id}`}
                  className="input"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="field">
                  <label
                    className="field-label"
                    htmlFor={`edit-due-${task.id}`}
                  >
                    Prazo
                  </label>
                  <input
                    id={`edit-due-${task.id}`}
                    className="input"
                    type="date"
                    value={editDueDate}
                    onChange={(event) => setEditDueDate(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label
                    className="field-label"
                    htmlFor={`edit-priority-${task.id}`}
                  >
                    Prioridade
                  </label>
                  <select
                    id={`edit-priority-${task.id}`}
                    className="input"
                    value={editPriority}
                    onChange={(event) =>
                      setEditPriority(event.target.value as TaskPriority)
                    }
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {task.scope === 'shared' && (
                  <div className="field">
                    <label
                      className="field-label"
                      htmlFor={`edit-assignee-${task.id}`}
                    >
                      Responsável
                    </label>
                    <select
                      id={`edit-assignee-${task.id}`}
                      className="input"
                      value={editAssignee}
                      onChange={(event) => setEditAssignee(event.target.value)}
                    >
                      <option value="">Casal</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.id === currentUserId
                            ? `${member.displayName} (você)`
                            : member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  disabled={updateTask.isPending}
                >
                  Salvar
                </Button>
              </div>
            </form>
          )}

          <div className="mt-3">
            {task.subtasks.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                Subtarefas: {doneSubtasks}/{task.subtasks.length}
              </p>
            )}

            <ul className="mt-1 space-y-1">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void toggleSubtask(subtask.id, !subtask.done)
                    }
                    aria-label={
                      subtask.done
                        ? `Reabrir subtarefa ${subtask.title}`
                        : `Concluir subtarefa ${subtask.title}`
                    }
                    className={cn(
                      'shrink-0',
                      subtask.done
                        ? 'text-[var(--success)]'
                        : 'text-[var(--muted)] hover:text-[var(--primary)]',
                    )}
                  >
                    {subtask.done ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : (
                      <Circle size={16} aria-hidden="true" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'min-w-0 flex-1 break-words text-xs',
                      subtask.done &&
                        'text-[var(--muted)] line-through decoration-1',
                    )}
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeSubtask(subtask.id)}
                    aria-label={`Remover subtarefa ${subtask.title}`}
                    className="shrink-0 text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            {showSubtaskForm ? (
              <form className="mt-2 flex gap-2" onSubmit={addSubtask}>
                <input
                  className="input min-h-9 py-1 text-xs"
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Nova subtarefa"
                  aria-label="Título da nova subtarefa"
                  maxLength={200}
                  autoFocus
                />
                <Button
                  type="submit"
                  className="min-h-9 px-2 py-1 text-xs"
                  disabled={createSubtask.isPending}
                  aria-label="Adicionar subtarefa"
                >
                  <Plus size={14} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-9 px-2 py-1 text-xs"
                  onClick={() => {
                    setShowSubtaskForm(false);
                    setSubtaskTitle('');
                  }}
                  aria-label="Cancelar subtarefa"
                >
                  <X size={14} aria-hidden="true" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                className="mt-1 min-h-8 px-2 py-1 text-xs"
                onClick={() => setShowSubtaskForm(true)}
              >
                <Plus size={14} aria-hidden="true" />
                Subtarefa
              </Button>
            )}
          </div>

          {error && (
            <div className="form-error mt-3" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

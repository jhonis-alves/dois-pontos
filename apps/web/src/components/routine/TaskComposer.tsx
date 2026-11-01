import { useState, type FormEvent } from 'react';
import { Plus, Repeat } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import { ApiError } from '../../lib/http';
import type {
  RoutineFrequency,
  TaskPriority,
  TaskScope,
} from '../../lib/routine-api';
import { useCreateTask } from '../../lib/routine-hooks';
import { PRIORITY_LABELS } from '../../lib/routine-format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface TaskComposerProps {
  members: SpaceMember[];
  currentUserId: string;
}

export function TaskComposer({ members, currentUserId }: TaskComposerProps) {
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TaskScope>('shared');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | RoutineFrequency>(
    'none',
  );
  const [intervalCount, setIntervalCount] = useState(1);
  const [endsOn, setEndsOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  function changeScope(nextScope: TaskScope) {
    setScope(nextScope);
    setAssignee(nextScope === 'private' ? currentUserId : '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Informe o título da tarefa.');
      return;
    }

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        scope,
        assigneeUserId:
          scope === 'private' ? currentUserId : assignee || null,
        priority,
        dueDate: dueDate || undefined,
        recurrence:
          recurrence === 'none'
            ? undefined
            : {
                frequency: recurrence,
                intervalCount,
                endsOn: endsOn || undefined,
              },
      });

      setTitle('');
      setDescription('');
      setDueDate('');
      setRecurrence('none');
      setIntervalCount(1);
      setEndsOn('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível criar a tarefa.',
      );
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Nova tarefa</p>
          <h2 className="section-title mt-1">O que precisa ser feito?</h2>
        </div>
        <span className="text-xs text-[var(--muted)]">
          Compartilhada por padrão
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="task-title">
            Título
          </label>
          <input
            id="task-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: comprar mantimentos da semana"
            maxLength={200}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="task-description">
            Descrição (opcional)
          </label>
          <textarea
            id="task-description"
            className="input min-h-20 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalhes, combinados ou lista rápida"
            rows={2}
            maxLength={2000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="field">
            <span className="field-label">Visibilidade</span>
            <div className="segmented" role="group" aria-label="Visibilidade da tarefa">
              <button
                type="button"
                data-active={scope === 'shared'}
                aria-pressed={scope === 'shared'}
                onClick={() => changeScope('shared')}
              >
                Casal
              </button>
              <button
                type="button"
                data-active={scope === 'private'}
                aria-pressed={scope === 'private'}
                onClick={() => changeScope('private')}
              >
                Privada
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-assignee">
              Responsável
            </label>
            {scope === 'private' ? (
              <div className="input flex items-center text-[var(--muted)]">
                Você
              </div>
            ) : (
              <select
                id="task-assignee"
                className="input"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              >
                <option value="">Casal (sem responsável)</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id === currentUserId
                      ? `${member.displayName} (você)`
                      : member.displayName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-priority">
              Prioridade
            </label>
            <select
              id="task-priority"
              className="input"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-due-date">
              Prazo
            </label>
            <input
              id="task-due-date"
              className="input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_140px_1fr]">
          <div className="field">
            <label className="field-label" htmlFor="task-recurrence">
              Repetição
            </label>
            <select
              id="task-recurrence"
              className="input"
              value={recurrence}
              onChange={(event) =>
                setRecurrence(
                  event.target.value as 'none' | RoutineFrequency,
                )
              }
            >
              <option value="none">Não repetir</option>
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          {recurrence !== 'none' && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="task-interval">
                  A cada
                </label>
                <input
                  id="task-interval"
                  className="input"
                  type="number"
                  min={1}
                  max={30}
                  value={intervalCount}
                  onChange={(event) =>
                    setIntervalCount(
                      Math.min(30, Math.max(1, Number(event.target.value) || 1)),
                    )
                  }
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="task-recurrence-end">
                  Repetir até (opcional)
                </label>
                <input
                  id="task-recurrence-end"
                  className="input"
                  type="date"
                  value={endsOn}
                  onChange={(event) => setEndsOn(event.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {recurrence !== 'none' && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
            <Repeat size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            As ocorrências são criadas antecipadamente. Se não houver prazo, a
            série começa hoje.
          </p>
        )}

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={createTask.isPending}>
            <Plus size={17} aria-hidden="true" />
            {createTask.isPending ? 'Adicionando...' : 'Adicionar tarefa'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

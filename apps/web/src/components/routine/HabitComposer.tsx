import { useState, type FormEvent } from 'react';
import { Plus, Target } from 'lucide-react';
import { ApiError } from '../../lib/http';
import type { RoutineFrequency, TaskScope } from '../../lib/routine-api';
import { useCreateHabit } from '../../lib/routine-hooks';
import { FREQUENCY_LABELS } from '../../lib/routine-format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function HabitComposer() {
  const createHabit = useCreateHabit();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TaskScope>('shared');
  const [frequency, setFrequency] = useState<RoutineFrequency>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome do hábito.');
      return;
    }

    try {
      await createHabit.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        scope,
        frequency,
        targetCount,
      });

      setName('');
      setDescription('');
      setFrequency('daily');
      setTargetCount(1);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível criar o hábito.',
      );
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Novo hábito</p>
          <h2 className="section-title mt-1">O que você quer manter?</h2>
        </div>
        <span className="text-xs text-[var(--muted)]">
          Compartilhado por padrão
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="habit-name">
            Nome
          </label>
          <input
            id="habit-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: beber 2L de água"
            maxLength={120}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="habit-description">
            Descrição (opcional)
          </label>
          <textarea
            id="habit-description"
            className="input min-h-20 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Uma nota curta sobre o hábito"
            rows={2}
            maxLength={1000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="field">
            <span className="field-label">Visibilidade</span>
            <div className="segmented" role="group" aria-label="Visibilidade do hábito">
              <button
                type="button"
                data-active={scope === 'shared'}
                aria-pressed={scope === 'shared'}
                onClick={() => setScope('shared')}
              >
                Casal
              </button>
              <button
                type="button"
                data-active={scope === 'private'}
                aria-pressed={scope === 'private'}
                onClick={() => setScope('private')}
              >
                Privado
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="habit-frequency">
              Frequência
            </label>
            <select
              id="habit-frequency"
              className="input"
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as RoutineFrequency)
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
            <label className="field-label" htmlFor="habit-target">
              Meta por período
            </label>
            <input
              id="habit-target"
              className="input"
              type="number"
              min={1}
              max={100}
              value={targetCount}
              onChange={(event) =>
                setTargetCount(
                  Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
          </div>

          <div className="flex items-end">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
              <Target size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              A meta vale por dia, semana ou mês, conforme a frequência.
            </p>
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={createHabit.isPending}>
            <Plus size={17} aria-hidden="true" />
            {createHabit.isPending ? 'Criando...' : 'Criar hábito'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

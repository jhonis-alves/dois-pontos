import { useState } from 'react';
import {
  CheckCircle2,
  Flame,
  HeartPulse,
  ListChecks,
  ListTodo,
  RotateCcw,
} from 'lucide-react';
import { HabitCard } from '../components/routine/HabitCard';
import { HabitComposer } from '../components/routine/HabitComposer';
import { TaskCard } from '../components/routine/TaskCard';
import { TaskComposer } from '../components/routine/TaskComposer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useSession } from '../lib/auth-hooks';
import { useHabits, useTasks } from '../lib/routine-hooks';

type Tab = 'tasks' | 'habits';
type TaskFilter = 'open' | 'done' | 'all';

export function RoutinePage() {
  const session = useSession();
  const tasksQuery = useTasks();
  const habitsQuery = useHabits();

  const [tab, setTab] = useState<Tab>('tasks');
  const [filter, setFilter] = useState<TaskFilter>('open');

  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const openTasks = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  );
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const visibleTasks =
    filter === 'open'
      ? openTasks
      : filter === 'done'
        ? doneTasks
        : tasks.filter((task) => task.status !== 'cancelled');
  const bestStreak = habits.reduce(
    (best, habit) => Math.max(best, habit.currentStreak),
    0,
  );

  const isLoading =
    session.isLoading || tasksQuery.isLoading || habitsQuery.isLoading;
  const isError = tasksQuery.isError || habitsQuery.isError;

  function reload() {
    void tasksQuery.refetch();
    void habitsQuery.refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Rotina" title="Rotina" />
        <Card className="p-6">
          <p className="text-sm text-[var(--muted)]">Carregando rotina...</p>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Rotina" title="Rotina" />
        <Card className="p-6">
          <div className="form-error" role="alert">
            Não foi possível carregar tarefas e hábitos.
          </div>
          <Button variant="ghost" className="mt-3" onClick={reload}>
            <RotateCcw size={16} aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fase 3 · Rotina"
        title="Rotina do casal"
        description="Organize tarefas, responsabilidades e hábitos. O calendário e os compromissos entram na próxima etapa."
        actions={<Badge variant="primary">Fase 3</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Em aberto</p>
            <ListTodo size={17} className="text-[var(--primary)]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold">{openTasks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Concluídas</p>
            <CheckCircle2
              size={17}
              className="text-[var(--success)]"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-2xl font-bold">{doneTasks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Hábitos</p>
            <HeartPulse size={17} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold">{habits.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Melhor sequência</p>
            <Flame size={17} className="text-[var(--warning)]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold">{bestStreak}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="segmented" role="group" aria-label="Seção da rotina">
          <button
            type="button"
            data-active={tab === 'tasks'}
            aria-pressed={tab === 'tasks'}
            onClick={() => setTab('tasks')}
          >
            <ListChecks size={15} aria-hidden="true" />
            Tarefas ({tasks.length})
          </button>
          <button
            type="button"
            data-active={tab === 'habits'}
            aria-pressed={tab === 'habits'}
            onClick={() => setTab('habits')}
          >
            <HeartPulse size={15} aria-hidden="true" />
            Hábitos ({habits.length})
          </button>
        </div>

        {tab === 'tasks' && (
          <div className="segmented" role="group" aria-label="Filtrar tarefas">
            {(
              [
                ['open', 'Em aberto'],
                ['done', 'Concluídas'],
                ['all', 'Todas'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-active={filter === value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'tasks' ? (
        <div className="space-y-4">
          <TaskComposer
            members={session.data?.members ?? []}
            currentUserId={session.data?.user.id ?? ''}
          />

          {visibleTasks.length === 0 ? (
            <Card>
              <EmptyState
                icon={ListChecks}
                title={
                  filter === 'done'
                    ? 'Nenhuma tarefa concluída ainda'
                    : 'Nenhuma tarefa por aqui'
                }
                description={
                  filter === 'done'
                    ? 'Conclua uma tarefa para vê-la nesta lista.'
                    : 'Crie a primeira tarefa do casal ou mude o filtro para ver as concluídas.'
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  members={session.data?.members ?? []}
                  currentUserId={session.data?.user.id ?? ''}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <HabitComposer />

          {habits.length === 0 ? (
            <Card>
              <EmptyState
                icon={HeartPulse}
                title="Nenhum hábito ainda"
                description="Crie um hábito diário, semanal ou mensal e acompanhe a sequência do casal."
              />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

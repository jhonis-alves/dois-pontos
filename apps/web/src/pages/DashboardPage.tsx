import {
  CheckCircle2,
  HeartHandshake,
  HeartPulse,
  ListTodo,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { usePreferences } from '../context/preferences';
import { useSession } from '../lib/auth-hooks';
import { formatLongDate, greetingForNow } from '../lib/format';
import { useHealth } from '../lib/health';
import { useHabits, useTasks } from '../lib/routine-hooks';

export function DashboardPage() {
  const { space } = usePreferences();
  const health = useHealth();
  const session = useSession();
  const tasksQuery = useTasks();
  const habitsQuery = useHabits();

  const shared = space === 'shared';
  const contextLabel = shared
    ? (session.data?.space.name ?? 'Nosso Espaço')
    : 'Meu Espaço';
  const firstName = session.data?.user.displayName.split(' ')[0];
  const members = session.data?.members ?? [];
  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const openTasks = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  );
  const doneTasks = tasks.filter((task) => task.status === 'done');

  const healthBadge = health.isLoading ? (
    <Badge variant="warning">Verificando</Badge>
  ) : health.isError || health.data?.status !== 'ok' ? (
    <Badge variant="danger">Indisponível</Badge>
  ) : (
    <Badge variant="success">Online</Badge>
  );

  const databaseLabel = health.isError
    ? 'Sem conexão'
    : health.data?.database === 'up'
      ? 'Conectado'
      : 'Verificando';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${contextLabel} · Fase 4 em andamento`}
        title={`${greetingForNow()}${firstName ? `, ${firstName}` : ''}!`}
        description={`${formatLongDate()} — visão inicial da sua conta no Dois Pontos.`}
        actions={
          <>
            <Link to="/rotina" className="btn btn-ghost">
              <ListTodo size={17} aria-hidden="true" />
              Rotina
            </Link>
            <Link to="/financeiro" className="btn btn-primary">
              <Wallet size={17} aria-hidden="true" />
              Finanças
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Infraestrutura</p>
              <h2 className="section-title mt-1">API e banco de dados</h2>
            </div>
            {healthBadge}
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="muted">Versão da API</dt>
              <dd className="font-semibold">{health.data?.version ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="muted">Banco</dt>
              <dd className="font-semibold">{databaseLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="muted">Fuso horário</dt>
              <dd className="font-semibold">
                {health.data?.timezone ?? 'America/Sao_Paulo'}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
            A autenticação, a rotina e as contas com transações estão ativas.
            Cartões, orçamentos e metas entram nas próximas etapas.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="eyebrow">Rotina</p>
              <h2 className="section-title mt-1">Tarefas e hábitos</h2>
            </div>
            <Badge variant="success">Ativa</Badge>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="inset rounded-[var(--radius-sm)] p-3">
              <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <ListTodo size={14} aria-hidden="true" />
                Em aberto
              </dt>
              <dd className="mt-1 text-xl font-bold">{openTasks.length}</dd>
            </div>
            <div className="inset rounded-[var(--radius-sm)] p-3">
              <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <CheckCircle2 size={14} aria-hidden="true" />
                Concluídas
              </dt>
              <dd className="mt-1 text-xl font-bold">{doneTasks.length}</dd>
            </div>
            <div className="inset rounded-[var(--radius-sm)] p-3">
              <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <HeartPulse size={14} aria-hidden="true" />
                Hábitos
              </dt>
              <dd className="mt-1 text-xl font-bold">{habits.length}</dd>
            </div>
            <div className="inset rounded-[var(--radius-sm)] p-3">
              <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <CheckCircle2 size={14} aria-hidden="true" />
                Total
              </dt>
              <dd className="mt-1 text-xl font-bold">{tasks.length}</dd>
            </div>
          </dl>

          <Link to="/rotina" className="btn btn-soft mt-4 w-full">
            <ListTodo size={17} aria-hidden="true" />
            Abrir rotina
          </Link>
        </Card>

        <Card>
          <EmptyState
            icon={Wallet}
            title="Finanças"
            description="Contas e transações já estão ativas. Cartões, orçamentos, metas e relatórios entram nas próximas etapas."
          >
            <Link to="/financeiro" className="btn btn-soft">
              <Wallet size={17} aria-hidden="true" />
              Abrir financeiro
            </Link>
          </EmptyState>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="inset flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--primary)]">
            {shared ? (
              <HeartHandshake size={21} aria-hidden="true" />
            ) : (
              <UserRound size={21} aria-hidden="true" />
            )}
          </span>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="section-title">Contexto ativo: {contextLabel}</h2>
              <Badge>
                {shared ? 'Dados compartilhados' : 'Dados individuais'}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {shared
                ? 'No Nosso Espaço, as duas contas acessarão as mesmas tarefas, contas e metas. A identidade visual compartilhada é aplicada automaticamente.'
                : 'No Meu Espaço, seus dados privados ficam isolados do outro membro. O tema e a paleta escolhidos são preferências individuais.'}
            </p>

            {shared && members.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                Membros:{' '}
                <strong className="text-[var(--text)]">
                  {members.map((member) => member.displayName).join(' · ')}
                </strong>
              </p>
            )}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              A autorização é aplicada no servidor. A interface nunca é a única
              barreira de privacidade.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

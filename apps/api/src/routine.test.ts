import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from './config.js';
import { buildServer } from './server.js';

const PASSWORD = 'senha-segura-123';

const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function createApp(): FastifyInstance {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dois-pontos-routine-'));
  tempDirs.push(dir);
  const app = buildServer({
    databasePath: path.join(dir, 'test.sqlite'),
    migrationsDir: config.migrationsDir,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
  }
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function sessionCookie(response: {
  headers: Record<string, unknown>;
}): Record<string, string> {
  const raw = response.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;

  if (typeof first !== 'string') return {};

  const match = first.match(/dp_session=([^;]+)/);
  return match?.[1] ? { dp_session: match[1] } : {};
}

async function register(
  app: FastifyInstance,
  email = 'ana@exemplo.com',
  displayName = 'Ana',
) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { displayName, email, password: PASSWORD },
  });
}

async function setupCouple(app: FastifyInstance) {
  const ana = await register(app);
  const anaCookie = sessionCookie(ana);

  const created = await app.inject({
    method: 'POST',
    url: '/api/spaces/invites',
    cookies: anaCookie,
    payload: { email: 'bia@exemplo.com' },
  });
  const token = created.json().invite.token as string;

  const bia = await app.inject({
    method: 'POST',
    url: `/api/invites/${token}/accept`,
    payload: {
      displayName: 'Bia',
      email: 'bia@exemplo.com',
      password: PASSWORD,
    },
  });

  return {
    app,
    anaCookie,
    biaCookie: sessionCookie(bia),
    spaceId: ana.json().space.id as string,
  };
}

function createTask(
  app: FastifyInstance,
  cookies: Record<string, string>,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: 'POST',
    url: '/api/tasks',
    cookies,
    payload,
  });
}

describe('tarefas e subtarefas', () => {
  it('cria tarefas compartilhadas e privadas com isolamento entre membros', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);

    const shared = await createTask(app, anaCookie, {
      title: 'Comprar pão',
      dueDate: todayIso(),
    });
    expect(shared.statusCode).toBe(201);
    expect(shared.json().task).toMatchObject({
      title: 'Comprar pão',
      scope: 'shared',
      status: 'pending',
    });

    const privateTask = await createTask(app, anaCookie, {
      title: 'Treino pessoal',
      scope: 'private',
    });
    expect(privateTask.statusCode).toBe(201);
    expect(privateTask.json().task.ownerUserId).toBeTruthy();

    const anaList = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      cookies: anaCookie,
    });
    expect(anaList.json().tasks).toHaveLength(2);

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      cookies: biaCookie,
    });
    expect(biaList.json().tasks).toHaveLength(1);
    expect(biaList.json().tasks[0].title).toBe('Comprar pão');

    const forbidden = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${privateTask.json().task.id}`,
      cookies: biaCookie,
      payload: { status: 'done' },
    });
    expect(forbidden.statusCode).toBe(404);

    const done = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${shared.json().task.id}`,
      cookies: biaCookie,
      payload: { status: 'done' },
    });
    expect(done.statusCode).toBe(200);
    expect(done.json().task.status).toBe('done');
    expect(done.json().task.completedAt).toBeTruthy();
  });

  it('gerencia subtarefas e arquiva tarefas', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);

    const created = await createTask(app, anaCookie, { title: 'Organizar casa' });
    const taskId = created.json().task.id as string;

    const subtask = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/subtasks`,
      cookies: anaCookie,
      payload: { title: 'Lavar louça' },
    });
    expect(subtask.statusCode).toBe(201);
    expect(subtask.json().task.subtasks).toHaveLength(1);

    const subtaskId = subtask.json().task.subtasks[0].id as string;
    const checked = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}/subtasks/${subtaskId}`,
      cookies: anaCookie,
      payload: { done: true },
    });
    expect(checked.json().task.subtasks[0].done).toBe(true);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${taskId}/subtasks/${subtaskId}`,
      cookies: anaCookie,
    });
    expect(removed.json().task.subtasks).toHaveLength(0);

    const archived = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${taskId}`,
      cookies: anaCookie,
    });
    expect(archived.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      cookies: anaCookie,
    });
    expect(list.json().tasks).toHaveLength(0);
  });
});

describe('recorrência de tarefas', () => {
  it('materializa ocorrências semanais e compartilha com o parceiro', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);

    const created = await createTask(app, anaCookie, {
      title: 'Feira semanal',
      dueDate: todayIso(),
      recurrence: { frequency: 'weekly', intervalCount: 1 },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().task.recurrence).toMatchObject({
      frequency: 'weekly',
      intervalCount: 1,
    });

    const anaList = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      cookies: anaCookie,
    });
    const series = anaList
      .json()
      .tasks.filter(
        (task: { recurrence: { id: string } | null }) =>
          task.recurrence?.id === created.json().task.recurrence.id,
      );

    expect(series.length).toBeGreaterThan(1);
    expect(series[1].dueDate).toBe(addDays(series[0].dueDate, 7));

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      cookies: biaCookie,
    });
    expect(
      biaList
        .json()
        .tasks.some(
          (task: { recurrence: { id: string } | null }) =>
            task.recurrence?.id === created.json().task.recurrence.id,
        ),
    ).toBe(true);
  });

  it('rejeita fim de recorrência anterior à primeira data', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const today = todayIso();

    const response = await createTask(app, anaCookie, {
      title: 'Inválida',
      dueDate: today,
      recurrence: {
        frequency: 'daily',
        endsOn: addDays(today, -1),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_RECURRENCE');
  });
});

describe('hábitos', () => {
  it('compartilha hábito, registra check-in e calcula sequência', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const today = todayIso();

    const created = await app.inject({
      method: 'POST',
      url: '/api/habits',
      cookies: anaCookie,
      payload: {
        name: 'Beber água',
        frequency: 'daily',
        targetCount: 1,
        startsOn: today,
      },
    });
    expect(created.statusCode).toBe(201);
    const habitId = created.json().habit.id as string;

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/habits',
      cookies: biaCookie,
    });
    expect(biaList.json().habits).toHaveLength(1);

    const checkin = await app.inject({
      method: 'PUT',
      url: `/api/habits/${habitId}/entries/${today}`,
      cookies: biaCookie,
      payload: { count: 1 },
    });
    expect(checkin.statusCode).toBe(200);
    expect(checkin.json().habit).toMatchObject({
      todayCount: 1,
      periodCount: 1,
      currentStreak: 1,
    });

    const anaList = await app.inject({
      method: 'GET',
      url: '/api/habits',
      cookies: anaCookie,
    });
    expect(anaList.json().habits[0].todayCount).toBe(1);

    const undone = await app.inject({
      method: 'PUT',
      url: `/api/habits/${habitId}/entries/${today}`,
      cookies: biaCookie,
      payload: { count: 0 },
    });
    expect(undone.json().habit).toMatchObject({
      todayCount: 0,
      currentStreak: 0,
    });
  });

  it('isola hábito privado, rejeita data futura e arquiva', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const today = todayIso();

    const created = await app.inject({
      method: 'POST',
      url: '/api/habits',
      cookies: anaCookie,
      payload: { name: 'Diário', scope: 'private' },
    });
    const habitId = created.json().habit.id as string;

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/habits',
      cookies: biaCookie,
    });
    expect(biaList.json().habits).toHaveLength(0);

    const forbidden = await app.inject({
      method: 'PUT',
      url: `/api/habits/${habitId}/entries/${today}`,
      cookies: biaCookie,
      payload: { count: 1 },
    });
    expect(forbidden.statusCode).toBe(404);

    const future = await app.inject({
      method: 'PUT',
      url: `/api/habits/${habitId}/entries/${addDays(today, 1)}`,
      cookies: anaCookie,
      payload: { count: 1 },
    });
    expect(future.statusCode).toBe(400);
    expect(future.json().error.code).toBe('FUTURE_HABIT_ENTRY');

    const archived = await app.inject({
      method: 'DELETE',
      url: `/api/habits/${habitId}`,
      cookies: anaCookie,
    });
    expect(archived.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/api/habits',
      cookies: anaCookie,
    });
    expect(list.json().habits).toHaveLength(0);
  });

  it('exige autenticação e valida responsável de tarefa', async () => {
    const app = createApp();
    const { anaCookie, spaceId } = await setupCouple(app);

    const unauth = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(unauth.statusCode).toBe(401);

    const invalidAssignee = await createTask(app, anaCookie, {
      title: 'Tarefa',
      assigneeUserId: '00000000-0000-4000-8000-000000000000',
    });
    expect(invalidAssignee.statusCode).toBe(400);
    expect(invalidAssignee.json().error.code).toBe('INVALID_ASSIGNEE');
    expect(spaceId).toBeTruthy();
  });
});

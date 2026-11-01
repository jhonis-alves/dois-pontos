import { randomUUID } from 'node:crypto';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  addDays,
  nextOccurrence,
  todayIso,
  type RecurrenceFrequency,
} from '../lib/dates.js';
import { canAccessScopedRecord } from '../lib/scope.js';

const RECURRENCE_HORIZON_DAYS = 60;
const RECURRENCE_MAX_OCCURRENCES = 120;

export type TaskScope = 'private' | 'shared';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface TaskRecurrence {
  id: string;
  frequency: RecurrenceFrequency;
  intervalCount: number;
  endsOn: string | null;
}

export interface SubtaskDto {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TaskDto {
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
  subtasks: SubtaskDto[];
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  scope: TaskScope;
  assigneeUserId?: string | null;
  priority: TaskPriority;
  categoryId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrence?: {
    frequency: RecurrenceFrequency;
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
  categoryId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

interface TaskRow {
  id: string;
  space_id: string;
  scope: TaskScope;
  owner_user_id: string | null;
  creator_user_id: string;
  assignee_user_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category_id: string | null;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  recurrence_id: string | null;
  parent_task_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_interval_count: number | null;
  recurrence_ends_on: string | null;
}

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  done: number;
  sort_order: number;
  created_at: string;
}

interface RecurrenceRow {
  id: string;
  space_id: string;
  template_json: string;
  frequency: RecurrenceFrequency;
  interval_count: number;
  starts_on: string;
  ends_on: string | null;
  next_run_date: string | null;
  active: number;
}

interface RecurrenceTemplate {
  title: string;
  description: string | null;
  scope: TaskScope;
  ownerUserId: string | null;
  creatorUserId: string;
  assigneeUserId: string | null;
  priority: TaskPriority;
  categoryId: string | null;
  dueTime: string | null;
}

const TASK_SELECT = `
  SELECT t.*,
         r.frequency AS recurrence_frequency,
         r.interval_count AS recurrence_interval_count,
         r.ends_on AS recurrence_ends_on
  FROM tasks t
  LEFT JOIN recurrences r ON r.id = t.recurrence_id
`;

function mapSubtask(row: SubtaskRow): SubtaskDto {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function getSubtasks(db: Db, taskIds: string[]): Map<string, SubtaskDto[]> {
  const grouped = new Map<string, SubtaskDto[]>();

  if (taskIds.length === 0) return grouped;

  const placeholders = taskIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT id, task_id, title, done, sort_order, created_at
       FROM task_subtasks
       WHERE task_id IN (${placeholders})
       ORDER BY sort_order, created_at`,
    )
    .all(...taskIds) as SubtaskRow[];

  for (const row of rows) {
    const list = grouped.get(row.task_id) ?? [];
    list.push(mapSubtask(row));
    grouped.set(row.task_id, list);
  }

  return grouped;
}

function mapTask(row: TaskRow, subtasks: SubtaskDto[]): TaskDto {
  return {
    id: row.id,
    scope: row.scope,
    ownerUserId: row.owner_user_id,
    creatorUserId: row.creator_user_id,
    assigneeUserId: row.assignee_user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id,
    startDate: row.start_date,
    dueDate: row.due_date,
    dueTime: row.due_time,
    completedAt: row.completed_at,
    recurrence:
      row.recurrence_id && row.recurrence_frequency
        ? {
            id: row.recurrence_id,
            frequency: row.recurrence_frequency,
            intervalCount: row.recurrence_interval_count ?? 1,
            endsOn: row.recurrence_ends_on,
          }
        : null,
    parentTaskId: row.parent_task_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasks,
  };
}

function findTaskRow(db: Db, taskId: string): TaskRow | undefined {
  return db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(taskId) as
    | TaskRow
    | undefined;
}

function requireTaskRow(db: Db, auth: AuthContext, taskId: string): TaskRow {
  const row = findTaskRow(db, taskId);

  if (
    !row ||
    !canAccessScopedRecord(auth, {
      spaceId: row.space_id,
      scope: row.scope,
      ownerUserId: row.owner_user_id,
    })
  ) {
    // 404 evita confirmar a existência de tarefas privadas do parceiro.
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Tarefa não encontrada.');
  }

  return row;
}

function toTaskDto(db: Db, row: TaskRow): TaskDto {
  const subtasks = getSubtasks(db, [row.id]).get(row.id) ?? [];
  return mapTask(row, subtasks);
}

function requireActiveTaskRow(
  db: Db,
  auth: AuthContext,
  taskId: string,
): TaskRow {
  const row = requireTaskRow(db, auth, taskId);

  if (row.archived_at) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Tarefa não encontrada.');
  }

  return row;
}

export function getTask(db: Db, auth: AuthContext, taskId: string): TaskDto {
  return toTaskDto(db, requireTaskRow(db, auth, taskId));
}

export function listTasks(db: Db, auth: AuthContext): TaskDto[] {
  ensureSpaceRecurrences(db, auth.space.id, todayIso());

  const rows = db
    .prepare(
      `${TASK_SELECT}
       WHERE t.space_id = ?
         AND t.archived_at IS NULL
         AND (t.scope = 'shared' OR t.owner_user_id = ?)
       ORDER BY
         CASE t.status WHEN 'done' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END,
         COALESCE(t.due_date, '9999-12-31'),
         t.created_at`,
    )
    .all(auth.space.id, auth.user.id) as TaskRow[];

  const subtasks = getSubtasks(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => mapTask(row, subtasks.get(row.id) ?? []));
}

function assertMember(db: Db, spaceId: string, userId: string): void {
  const member = db
    .prepare(
      `SELECT 1 AS ok
       FROM space_members
       WHERE space_id = ? AND user_id = ? AND status = 'active'`,
    )
    .get(spaceId, userId);

  if (!member) {
    throw new ApiError(
      400,
      'INVALID_ASSIGNEE',
      'O responsável precisa ser um membro ativo do espaço.',
    );
  }
}

function assertRoutineCategory(
  db: Db,
  auth: AuthContext,
  categoryId: string,
): void {
  const category = db
    .prepare(
      `SELECT space_id, scope, owner_user_id, domain
       FROM categories
       WHERE id = ?`,
    )
    .get(categoryId) as
    | {
        space_id: string;
        scope: TaskScope;
        owner_user_id: string | null;
        domain: string;
      }
    | undefined;

  const accessible =
    category &&
    category.space_id === auth.space.id &&
    category.domain === 'routine' &&
    (category.scope === 'shared' || category.owner_user_id === auth.user.id);

  if (!accessible) {
    throw new ApiError(
      400,
      'INVALID_CATEGORY',
      'A categoria informada não está disponível para você.',
    );
  }
}

function resolveOwner(
  auth: AuthContext,
  scope: TaskScope,
): string | null {
  return scope === 'private' ? auth.user.id : null;
}

function validateAssignee(
  db: Db,
  auth: AuthContext,
  scope: TaskScope,
  ownerUserId: string | null,
  assigneeUserId: string | null,
): void {
  if (!assigneeUserId) return;

  assertMember(db, auth.space.id, assigneeUserId);

  if (scope === 'private' && assigneeUserId !== ownerUserId) {
    throw new ApiError(
      400,
      'INVALID_ASSIGNEE',
      'Uma tarefa privada só pode ser atribuída ao próprio dono.',
    );
  }
}

function insertTaskRow(
  db: Db,
  params: {
    id: string;
    spaceId: string;
    scope: TaskScope;
    ownerUserId: string | null;
    creatorUserId: string;
    assigneeUserId: string | null;
    title: string;
    description: string | null;
    status?: TaskStatus;
    priority: TaskPriority;
    categoryId: string | null;
    startDate: string | null;
    dueDate: string | null;
    dueTime: string | null;
    recurrenceId: string | null;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO tasks
       (id, space_id, scope, owner_user_id, creator_user_id, assignee_user_id,
        title, description, status, priority, category_id, start_date, due_date,
        due_time, completed_at, recurrence_id, parent_task_id, archived_at,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?)`,
  ).run(
    params.id,
    params.spaceId,
    params.scope,
    params.ownerUserId,
    params.creatorUserId,
    params.assigneeUserId,
    params.title,
    params.description,
    params.status ?? 'pending',
    params.priority,
    params.categoryId,
    params.startDate,
    params.dueDate,
    params.dueTime,
    params.recurrenceId,
    params.now,
    params.now,
  );
}

function materializeRecurrence(
  db: Db,
  recurrenceId: string,
  untilDate: string,
): void {
  const recurrence = db
    .prepare(
      `SELECT id, space_id, template_json, frequency, interval_count,
              starts_on, ends_on, next_run_date, active
       FROM recurrences
       WHERE id = ? AND domain = 'routine'`,
    )
    .get(recurrenceId) as RecurrenceRow | undefined;

  if (!recurrence || recurrence.active !== 1) return;

  const template = JSON.parse(recurrence.template_json) as RecurrenceTemplate;
  const now = new Date().toISOString();
  let cursor = recurrence.next_run_date;
  let lastGenerated: string | null = null;
  let iterations = 0;

  while (
    cursor &&
    cursor <= untilDate &&
    (!recurrence.ends_on || cursor <= recurrence.ends_on) &&
    iterations < RECURRENCE_MAX_OCCURRENCES
  ) {
    db.prepare(
      `INSERT OR IGNORE INTO tasks
         (id, space_id, scope, owner_user_id, creator_user_id, assignee_user_id,
          title, description, status, priority, category_id, start_date, due_date,
          due_time, completed_at, recurrence_id, parent_task_id, archived_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?)`,
    ).run(
      randomUUID(),
      recurrence.space_id,
      template.scope,
      template.ownerUserId,
      template.creatorUserId,
      template.assigneeUserId,
      template.title,
      template.description,
      template.priority,
      template.categoryId,
      cursor,
      cursor,
      template.dueTime,
      recurrence.id,
      now,
      now,
    );

    lastGenerated = cursor;
    cursor = nextOccurrence(
      cursor,
      recurrence.frequency,
      recurrence.interval_count,
    );
    iterations += 1;
  }

  const stillActive =
    cursor && (!recurrence.ends_on || cursor <= recurrence.ends_on) ? 1 : 0;

  db.prepare(
    `UPDATE recurrences
     SET next_run_date = ?, last_generated_date = COALESCE(?, last_generated_date),
         active = ?, updated_at = ?
     WHERE id = ?`,
  ).run(cursor, lastGenerated, stillActive, now, recurrence.id);
}

function ensureSpaceRecurrences(
  db: Db,
  spaceId: string,
  today: string,
): void {
  const horizon = addDays(today, RECURRENCE_HORIZON_DAYS);
  const rows = db
    .prepare(
      `SELECT id
       FROM recurrences
       WHERE space_id = ?
         AND domain = 'routine'
         AND active = 1
         AND next_run_date IS NOT NULL
         AND next_run_date <= ?`,
    )
    .all(spaceId, horizon) as { id: string }[];

  for (const row of rows) {
    materializeRecurrence(db, row.id, horizon);
  }
}

export function createTask(
  db: Db,
  auth: AuthContext,
  input: TaskCreateInput,
): TaskDto {
  const now = new Date().toISOString();
  const today = todayIso();
  const ownerUserId = resolveOwner(auth, input.scope);
  const assigneeUserId = input.assigneeUserId ?? null;

  validateAssignee(
    db,
    auth,
    input.scope,
    ownerUserId,
    assigneeUserId,
  );

  if (input.categoryId) {
    assertRoutineCategory(db, auth, input.categoryId);
  }

  const taskId = randomUUID();
  const recurrenceId = input.recurrence ? randomUUID() : null;
  let startDate = input.startDate ?? null;
  let dueDate = input.dueDate ?? null;

  if (input.recurrence) {
    const firstDate = dueDate ?? startDate ?? today;
    dueDate = firstDate;
    startDate = startDate ?? firstDate;

    if (input.recurrence.endsOn && input.recurrence.endsOn < firstDate) {
      throw new ApiError(
        400,
        'INVALID_RECURRENCE',
        'O fim da recorrência não pode ser anterior à primeira data.',
      );
    }
  }

  db.transaction(() => {
    if (recurrenceId && input.recurrence) {
      const template: RecurrenceTemplate = {
        title: input.title,
        description: input.description ?? null,
        scope: input.scope,
        ownerUserId,
        creatorUserId: auth.user.id,
        assigneeUserId,
        priority: input.priority,
        categoryId: input.categoryId ?? null,
        dueTime: input.dueTime ?? null,
      };

      db.prepare(
        `INSERT INTO recurrences
           (id, space_id, domain, template_json, frequency, interval_count,
            weekdays, day_of_month, timezone, starts_on, ends_on, next_run_date,
            last_generated_date, active, created_by, created_at, updated_at)
         VALUES (?, ?, 'routine', ?, ?, ?, NULL, NULL, 'America/Sao_Paulo', ?,
                 ?, ?, NULL, 1, ?, ?, ?)`,
      ).run(
        recurrenceId,
        auth.space.id,
        JSON.stringify(template),
        input.recurrence.frequency,
        input.recurrence.intervalCount ?? 1,
        dueDate,
        input.recurrence.endsOn ?? null,
        dueDate,
        auth.user.id,
        now,
        now,
      );
    }

    insertTaskRow(db, {
      id: taskId,
      spaceId: auth.space.id,
      scope: input.scope,
      ownerUserId,
      creatorUserId: auth.user.id,
      assigneeUserId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      categoryId: input.categoryId ?? null,
      startDate,
      dueDate,
      dueTime: input.dueTime ?? null,
      recurrenceId,
      now,
    });

    if (recurrenceId && input.recurrence && dueDate) {
      const next = nextOccurrence(
        dueDate,
        input.recurrence.frequency,
        input.recurrence.intervalCount ?? 1,
      );

      db.prepare(
        `UPDATE recurrences
         SET next_run_date = ?, last_generated_date = ?, updated_at = ?
         WHERE id = ?`,
      ).run(next, dueDate, now, recurrenceId);

      materializeRecurrence(
        db,
        recurrenceId,
        addDays(today, RECURRENCE_HORIZON_DAYS),
      );
    }

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'task',
      entityId: taskId,
      action: 'task.created',
      metadata: {
        scope: input.scope,
        recurrence: input.recurrence?.frequency ?? null,
      },
      now,
    });
  })();

  return getTask(db, auth, taskId);
}

export function updateTask(
  db: Db,
  auth: AuthContext,
  taskId: string,
  input: TaskUpdateInput,
): TaskDto {
  const row = requireActiveTaskRow(db, auth, taskId);
  const now = new Date().toISOString();

  const assigneeUserId =
    input.assigneeUserId !== undefined
      ? input.assigneeUserId
      : row.assignee_user_id;

  validateAssignee(
    db,
    auth,
    row.scope,
    row.owner_user_id,
    assigneeUserId,
  );

  if (input.categoryId !== undefined && input.categoryId) {
    assertRoutineCategory(db, auth, input.categoryId);
  }

  const status = input.status ?? row.status;
  const completedAt =
    status === 'done' ? (row.completed_at ?? now) : null;

  try {
    db.prepare(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?,
           assignee_user_id = ?, category_id = ?, start_date = ?, due_date = ?,
           due_time = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.title ?? row.title,
      input.description !== undefined ? input.description : row.description,
      status,
      input.priority ?? row.priority,
      assigneeUserId,
      input.categoryId !== undefined ? input.categoryId : row.category_id,
      input.startDate !== undefined ? input.startDate : row.start_date,
      input.dueDate !== undefined ? input.dueDate : row.due_date,
      input.dueTime !== undefined ? input.dueTime : row.due_time,
      completedAt,
      now,
      taskId,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed')
    ) {
      throw new ApiError(
        409,
        'TASK_DATE_CONFLICT',
        'Já existe uma ocorrência desta recorrência nesta data.',
      );
    }
    throw error;
  }

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'task',
    entityId: taskId,
    action: status === 'done' ? 'task.completed' : 'task.updated',
    metadata: { status },
    now,
  });

  return getTask(db, auth, taskId);
}

export function archiveTask(
  db: Db,
  auth: AuthContext,
  taskId: string,
): void {
  requireActiveTaskRow(db, auth, taskId);
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?',
  ).run(now, now, taskId);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'task',
    entityId: taskId,
    action: 'task.archived',
    now,
  });
}

export function createSubtask(
  db: Db,
  auth: AuthContext,
  taskId: string,
  title: string,
): TaskDto {
  requireActiveTaskRow(db, auth, taskId);
  const now = new Date().toISOString();
  const order = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM task_subtasks WHERE task_id = ?',
    )
    .get(taskId) as { next: number };

  db.prepare(
    `INSERT INTO task_subtasks
       (id, task_id, title, done, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  ).run(randomUUID(), taskId, title, order.next, now, now);

  return getTask(db, auth, taskId);
}

export function updateSubtask(
  db: Db,
  auth: AuthContext,
  taskId: string,
  subtaskId: string,
  input: { title?: string; done?: boolean },
): TaskDto {
  requireActiveTaskRow(db, auth, taskId);
  const subtask = db
    .prepare(
      'SELECT id, title, done FROM task_subtasks WHERE id = ? AND task_id = ?',
    )
    .get(subtaskId, taskId) as
    | { id: string; title: string; done: number }
    | undefined;

  if (!subtask) {
    throw new ApiError(404, 'SUBTASK_NOT_FOUND', 'Subtarefa não encontrada.');
  }

  const now = new Date().toISOString();

  db.prepare(
    'UPDATE task_subtasks SET title = ?, done = ?, updated_at = ? WHERE id = ?',
  ).run(
    input.title ?? subtask.title,
    input.done === undefined ? subtask.done : input.done ? 1 : 0,
    now,
    subtaskId,
  );

  return getTask(db, auth, taskId);
}

export function deleteSubtask(
  db: Db,
  auth: AuthContext,
  taskId: string,
  subtaskId: string,
): TaskDto {
  requireActiveTaskRow(db, auth, taskId);
  const result = db
    .prepare('DELETE FROM task_subtasks WHERE id = ? AND task_id = ?')
    .run(subtaskId, taskId);

  if (result.changes !== 1) {
    throw new ApiError(404, 'SUBTASK_NOT_FOUND', 'Subtarefa não encontrada.');
  }

  return getTask(db, auth, taskId);
}

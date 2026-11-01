import { randomUUID } from 'node:crypto';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  addDays,
  periodStart,
  shiftPeriod,
  todayIso,
  type RecurrenceFrequency,
} from '../lib/dates.js';
import { canAccessScopedRecord } from '../lib/scope.js';

export type HabitScope = 'private' | 'shared';
export type HabitFrequency = RecurrenceFrequency;

export interface HabitEntryDto {
  date: string;
  count: number;
  note: string | null;
}

export interface HabitDto {
  id: string;
  scope: HabitScope;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  targetCount: number;
  categoryId: string | null;
  startsOn: string;
  endsOn: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  entries: HabitEntryDto[];
  todayCount: number;
  periodCount: number;
  periodTarget: number;
  currentStreak: number;
}

export interface HabitCreateInput {
  name: string;
  description?: string | null;
  scope: HabitScope;
  frequency: HabitFrequency;
  targetCount: number;
  categoryId?: string | null;
  startsOn?: string;
  endsOn?: string | null;
}

export interface HabitUpdateInput {
  name?: string;
  description?: string | null;
  frequency?: HabitFrequency;
  targetCount?: number;
  categoryId?: string | null;
  endsOn?: string | null;
}

interface HabitRow {
  id: string;
  space_id: string;
  scope: HabitScope;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  target_count: number;
  category_id: string | null;
  starts_on: string;
  ends_on: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface HabitEntryRow {
  habit_id: string;
  entry_date: string;
  count: number;
  note: string | null;
}

const ENTRY_HISTORY_DAYS = 400;

function mapEntry(row: HabitEntryRow): HabitEntryDto {
  return {
    date: row.entry_date,
    count: row.count,
    note: row.note,
  };
}

function sumEntries(
  entries: HabitEntryDto[],
  start: string,
  end: string,
): number {
  return entries.reduce(
    (total, entry) =>
      entry.date >= start && entry.date <= end ? total + entry.count : total,
    0,
  );
}

function periodEnd(start: string, frequency: HabitFrequency): string {
  return addDays(shiftPeriod(start, frequency, 1), -1);
}

function computeStreak(
  entries: HabitEntryDto[],
  frequency: HabitFrequency,
  targetCount: number,
  today: string,
): number {
  let start = periodStart(today, frequency);
  let end = periodEnd(start, frequency);
  let streak = 0;
  let guard = 0;

  if (end > today) end = today;

  // O período atual incompleto não deve zerar uma sequência já conquistada.
  if (sumEntries(entries, start, end) < targetCount) {
    start = shiftPeriod(start, frequency, -1);
  }

  while (guard < 400) {
    const currentEnd = periodEnd(start, frequency);
    const boundedEnd = currentEnd > today ? today : currentEnd;

    if (sumEntries(entries, start, boundedEnd) < targetCount) break;

    streak += 1;
    start = shiftPeriod(start, frequency, -1);
    guard += 1;
  }

  return streak;
}

function toHabitDto(
  row: HabitRow,
  entries: HabitEntryDto[],
  today: string,
): HabitDto {
  const start = periodStart(today, row.frequency);
  const todayCount = entries.find((entry) => entry.date === today)?.count ?? 0;

  return {
    id: row.id,
    scope: row.scope,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
    frequency: row.frequency,
    targetCount: row.target_count,
    categoryId: row.category_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries,
    todayCount,
    periodCount: sumEntries(entries, start, today),
    periodTarget: row.target_count,
    currentStreak: computeStreak(entries, row.frequency, row.target_count, today),
  };
}

function getEntriesForHabits(
  db: Db,
  habitIds: string[],
  since: string,
  today: string,
): Map<string, HabitEntryDto[]> {
  const grouped = new Map<string, HabitEntryDto[]>();

  if (habitIds.length === 0) return grouped;

  const placeholders = habitIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT habit_id, entry_date, count, note
       FROM habit_entries
       WHERE habit_id IN (${placeholders})
         AND entry_date >= ?
         AND entry_date <= ?
       ORDER BY entry_date`,
    )
    .all(...habitIds, since, today) as HabitEntryRow[];

  for (const row of rows) {
    const list = grouped.get(row.habit_id) ?? [];
    list.push(mapEntry(row));
    grouped.set(row.habit_id, list);
  }

  return grouped;
}

function findHabitRow(db: Db, habitId: string): HabitRow | undefined {
  return db
    .prepare('SELECT * FROM habits WHERE id = ?')
    .get(habitId) as HabitRow | undefined;
}

function requireHabitRow(
  db: Db,
  auth: AuthContext,
  habitId: string,
  options: { includeArchived?: boolean } = {},
): HabitRow {
  const row = findHabitRow(db, habitId);

  if (
    !row ||
    (!options.includeArchived && row.archived_at) ||
    !canAccessScopedRecord(auth, {
      spaceId: row.space_id,
      scope: row.scope,
      ownerUserId: row.owner_user_id,
    })
  ) {
    throw new ApiError(404, 'HABIT_NOT_FOUND', 'Hábito não encontrado.');
  }

  return row;
}

function toHabit(db: Db, auth: AuthContext, habitId: string): HabitDto {
  const row = requireHabitRow(db, auth, habitId, { includeArchived: true });
  const today = todayIso();
  const entries =
    getEntriesForHabits(
      db,
      [row.id],
      addDays(today, -ENTRY_HISTORY_DAYS),
      today,
    ).get(row.id) ?? [];

  return toHabitDto(row, entries, today);
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
        scope: HabitScope;
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

export function listHabits(db: Db, auth: AuthContext): HabitDto[] {
  const today = todayIso();
  const rows = db
    .prepare(
      `SELECT *
       FROM habits
       WHERE space_id = ?
         AND archived_at IS NULL
         AND (scope = 'shared' OR owner_user_id = ?)
       ORDER BY created_at`,
    )
    .all(auth.space.id, auth.user.id) as HabitRow[];

  const entries = getEntriesForHabits(
    db,
    rows.map((row) => row.id),
    addDays(today, -ENTRY_HISTORY_DAYS),
    today,
  );

  return rows.map((row) =>
    toHabitDto(row, entries.get(row.id) ?? [], today),
  );
}

export function getHabit(
  db: Db,
  auth: AuthContext,
  habitId: string,
): HabitDto {
  return toHabit(db, auth, habitId);
}

export function createHabit(
  db: Db,
  auth: AuthContext,
  input: HabitCreateInput,
): HabitDto {
  const today = todayIso();
  const startsOn = input.startsOn ?? today;

  if (input.endsOn && input.endsOn < startsOn) {
    throw new ApiError(
      400,
      'INVALID_HABIT_PERIOD',
      'O fim do hábito não pode ser anterior ao início.',
    );
  }

  if (input.categoryId) {
    assertRoutineCategory(db, auth, input.categoryId);
  }

  const id = randomUUID();
  const ownerUserId = input.scope === 'private' ? auth.user.id : null;
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO habits
         (id, space_id, scope, owner_user_id, name, description, frequency,
          target_count, weekdays, category_id, starts_on, ends_on, archived_at,
          created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?, ?)`,
    ).run(
      id,
      auth.space.id,
      input.scope,
      ownerUserId,
      input.name,
      input.description ?? null,
      input.frequency,
      input.targetCount,
      input.categoryId ?? null,
      startsOn,
      input.endsOn ?? null,
      auth.user.id,
      now,
      now,
    );

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'habit',
      entityId: id,
      action: 'habit.created',
      metadata: {
        scope: input.scope,
        frequency: input.frequency,
        targetCount: input.targetCount,
      },
      now,
    });
  })();

  return getHabit(db, auth, id);
}

export function updateHabit(
  db: Db,
  auth: AuthContext,
  habitId: string,
  input: HabitUpdateInput,
): HabitDto {
  const row = requireHabitRow(db, auth, habitId);

  if (input.categoryId !== undefined && input.categoryId) {
    assertRoutineCategory(db, auth, input.categoryId);
  }

  const endsOn = input.endsOn !== undefined ? input.endsOn : row.ends_on;

  if (endsOn && endsOn < row.starts_on) {
    throw new ApiError(
      400,
      'INVALID_HABIT_PERIOD',
      'O fim do hábito não pode ser anterior ao início.',
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE habits
     SET name = ?, description = ?, frequency = ?, target_count = ?,
         category_id = ?, ends_on = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name ?? row.name,
    input.description !== undefined ? input.description : row.description,
    input.frequency ?? row.frequency,
    input.targetCount ?? row.target_count,
    input.categoryId !== undefined ? input.categoryId : row.category_id,
    endsOn,
    now,
    habitId,
  );

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'habit',
    entityId: habitId,
    action: 'habit.updated',
    now,
  });

  return getHabit(db, auth, habitId);
}

export function archiveHabit(
  db: Db,
  auth: AuthContext,
  habitId: string,
): void {
  requireHabitRow(db, auth, habitId);
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE habits SET archived_at = ?, updated_at = ? WHERE id = ?',
  ).run(now, now, habitId);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'habit',
    entityId: habitId,
    action: 'habit.archived',
    now,
  });
}

export function setHabitEntry(
  db: Db,
  auth: AuthContext,
  habitId: string,
  date: string,
  input: { count: number; note?: string | null },
): HabitDto {
  const row = requireHabitRow(db, auth, habitId);
  const today = todayIso();

  if (date > today) {
    throw new ApiError(
      400,
      'FUTURE_HABIT_ENTRY',
      'Não é possível registrar um hábito no futuro.',
    );
  }

  if (date < row.starts_on) {
    throw new ApiError(
      400,
      'HABIT_ENTRY_BEFORE_START',
      'A data é anterior ao início do hábito.',
    );
  }

  if (row.ends_on && date > row.ends_on) {
    throw new ApiError(
      400,
      'HABIT_ENTRY_AFTER_END',
      'A data é posterior ao fim do hábito.',
    );
  }

  const now = new Date().toISOString();

  if (input.count === 0) {
    db.prepare(
      'DELETE FROM habit_entries WHERE habit_id = ? AND entry_date = ?',
    ).run(habitId, date);
  } else {
    db.prepare(
      `INSERT INTO habit_entries
         (id, habit_id, entry_date, count, note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, entry_date) DO UPDATE SET
         count = excluded.count,
         note = excluded.note,
         updated_at = excluded.updated_at`,
    ).run(
      randomUUID(),
      habitId,
      date,
      input.count,
      input.note ?? null,
      auth.user.id,
      now,
      now,
    );
  }

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'habit',
    entityId: habitId,
    action: input.count === 0 ? 'habit.entry_removed' : 'habit.checked_in',
    metadata: { date, count: input.count },
    now,
  });

  return getHabit(db, auth, habitId);
}

export function deleteHabitEntry(
  db: Db,
  auth: AuthContext,
  habitId: string,
  date: string,
): HabitDto {
  requireHabitRow(db, auth, habitId);

  db.prepare(
    'DELETE FROM habit_entries WHERE habit_id = ? AND entry_date = ?',
  ).run(habitId, date);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'habit',
    entityId: habitId,
    action: 'habit.entry_removed',
    metadata: { date },
    now: new Date().toISOString(),
  });

  return getHabit(db, auth, habitId);
}

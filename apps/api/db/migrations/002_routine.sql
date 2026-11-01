-- 002_routine.sql
-- Tarefas, hábitos, compromissos e recorrências do módulo Rotina.

CREATE TABLE recurrences (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('routine', 'finance')),
  template_json TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  weekdays TEXT,
  day_of_month INTEGER CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  next_run_date TEXT,
  last_generated_date TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (starts_on <= IFNULL(ends_on, '9999-12-31'))
);

CREATE INDEX idx_recurrences_space ON recurrences(space_id, domain, active);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  creator_user_id TEXT NOT NULL REFERENCES users(id),
  assignee_user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category_id TEXT REFERENCES categories(id),
  start_date TEXT,
  due_date TEXT,
  due_time TEXT,
  completed_at TEXT,
  recurrence_id TEXT REFERENCES recurrences(id),
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

-- Impede que a geração de recorrências crie a mesma ocorrência duas vezes.
CREATE UNIQUE INDEX ux_tasks_recurrence_due
  ON tasks(recurrence_id, due_date)
  WHERE recurrence_id IS NOT NULL AND due_date IS NOT NULL;

CREATE INDEX idx_tasks_space_status ON tasks(space_id, status, due_date);
CREATE INDEX idx_tasks_scope_owner ON tasks(space_id, scope, owner_user_id);

CREATE TABLE task_subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_subtasks_task ON task_subtasks(task_id, sort_order);

CREATE TABLE task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_comments_task ON task_comments(task_id, created_at);

CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),
  weekdays TEXT,
  category_id TEXT REFERENCES categories(id),
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  archived_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_habits_space ON habits(space_id, archived_at);

CREATE TABLE habit_entries (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
  note TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (habit_id, entry_date)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  creator_user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1)),
  location TEXT,
  category_id TEXT REFERENCES categories(id),
  recurrence_id TEXT REFERENCES recurrences(id),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_events_space_start ON events(space_id, starts_at);

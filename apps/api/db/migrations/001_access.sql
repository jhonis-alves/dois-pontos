-- 001_access.sql
-- Contas individuais, sessões, espaço do casal, convites, categorias e log de atividades.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  gender_palette TEXT NOT NULL DEFAULT 'male' CHECK (gender_palette IN ('male', 'female')),
  theme_mode TEXT NOT NULL DEFAULT 'auto' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  accent_color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Nosso Espaço',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE space_members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
  joined_at TEXT NOT NULL,
  left_at TEXT,
  UNIQUE (space_id, user_id)
);

CREATE INDEX idx_space_members_user ON space_members(user_id, status);

-- Limite de dois membros ativos por espaço, garantido também no banco.
CREATE TRIGGER trg_space_members_limit_insert
BEFORE INSERT ON space_members
WHEN NEW.status = 'active'
 AND (SELECT COUNT(*) FROM space_members WHERE space_id = NEW.space_id AND status = 'active') >= 2
BEGIN
  SELECT RAISE(ABORT, 'SPACE_MEMBER_LIMIT');
END;

CREATE TRIGGER trg_space_members_limit_update
BEFORE UPDATE OF status ON space_members
WHEN NEW.status = 'active' AND OLD.status <> 'active'
 AND (SELECT COUNT(*) FROM space_members WHERE space_id = NEW.space_id AND status = 'active') >= 2
BEGIN
  SELECT RAISE(ABORT, 'SPACE_MEMBER_LIMIT');
END;

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT COLLATE NOCASE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by TEXT REFERENCES users(id),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_invites_space ON invites(space_id, expires_at);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications_json TEXT NOT NULL DEFAULT '{}',
  routine_json TEXT NOT NULL DEFAULT '{}',
  finance_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  domain TEXT NOT NULL CHECK (domain IN ('routine', 'finance')),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX ux_categories_name
  ON categories(space_id, domain, scope, IFNULL(owner_user_id, ''), lower(name));

CREATE INDEX idx_categories_space ON categories(space_id, domain, archived_at);

CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_activity_space_created ON activity_log(space_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);

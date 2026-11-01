import { randomUUID } from 'node:crypto';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext, AuthSpace, AuthUser } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { seedDefaultCategories } from '../db/seeds.js';

export interface SpaceMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface SessionResponse {
  user: AuthUser;
  space: AuthSpace;
  members: SpaceMember[];
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  gender_palette: 'male' | 'female';
  theme_mode: 'light' | 'dark' | 'auto';
}

interface MembershipRow {
  space_id: string;
  space_name: string;
  role: 'owner' | 'member';
}

interface MemberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  joined_at: string;
}

interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  genderPalette?: 'male' | 'female';
}

interface LoginInput {
  email: string;
  password: string;
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    genderPalette: row.gender_palette,
    themeMode: row.theme_mode,
  };
}

export function getMembers(db: Db, spaceId: string): SpaceMember[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_url, sm.role, sm.joined_at
       FROM space_members sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.space_id = ? AND sm.status = 'active'
       ORDER BY sm.joined_at, u.display_name`,
    )
    .all(spaceId) as MemberRow[];

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

export async function registerUser(
  db: Db,
  input: RegisterInput,
): Promise<SessionResponse> {
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(input.email);

  if (existing) {
    throw new ApiError(
      409,
      'EMAIL_TAKEN',
      'Já existe uma conta com este e-mail.',
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();
  const userId = randomUUID();
  const spaceId = randomUUID();
  const spaceName = 'Nosso Espaço';

  try {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO users
           (id, email, password_hash, display_name, gender_palette, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        input.email,
        passwordHash,
        input.displayName,
        input.genderPalette ?? 'male',
        now,
        now,
      );

      db.prepare(
        `INSERT INTO spaces (id, name, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(spaceId, spaceName, userId, now, now);

      db.prepare(
        `INSERT INTO space_members (id, space_id, user_id, role, status, joined_at)
         VALUES (?, ?, ?, 'owner', 'active', ?)`,
      ).run(randomUUID(), spaceId, userId, now);

      db.prepare(
        `INSERT INTO user_settings (user_id, created_at, updated_at)
         VALUES (?, ?, ?)`,
      ).run(userId, now, now);

      seedDefaultCategories(db, { spaceId, userId, now });

      logActivity(db, {
        spaceId,
        actorUserId: userId,
        entityType: 'space',
        entityId: spaceId,
        action: 'space.created',
        metadata: { name: spaceName },
        now,
      });
    })();
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      String((error as { code?: unknown }).code).startsWith('SQLITE_CONSTRAINT')
    ) {
      throw new ApiError(
        409,
        'EMAIL_TAKEN',
        'Já existe uma conta com este e-mail.',
      );
    }
    throw error;
  }

  return {
    user: {
      id: userId,
      email: input.email,
      displayName: input.displayName,
      avatarUrl: null,
      genderPalette: input.genderPalette ?? 'male',
      themeMode: 'auto',
    },
    space: { id: spaceId, name: spaceName, role: 'owner' },
    members: getMembers(db, spaceId),
  };
}

export async function loginUser(
  db: Db,
  input: LoginInput,
): Promise<SessionResponse> {
  const userRow = db
    .prepare(
      `SELECT id, email, display_name, avatar_url, gender_palette, theme_mode,
              password_hash
       FROM users
       WHERE email = ?`,
    )
    .get(input.email) as (UserRow & { password_hash: string }) | undefined;

  if (!userRow) {
    throw new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou senha incorretos.',
    );
  }

  const passwordMatches = await verifyPassword(
    input.password,
    userRow.password_hash,
  );

  if (!passwordMatches) {
    throw new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou senha incorretos.',
    );
  }

  const membership = db
    .prepare(
      `SELECT sp.id AS space_id, sp.name AS space_name, sm.role
       FROM space_members sm
       JOIN spaces sp ON sp.id = sm.space_id
       WHERE sm.user_id = ? AND sm.status = 'active'
       ORDER BY sm.joined_at
       LIMIT 1`,
    )
    .get(userRow.id) as MembershipRow | undefined;

  if (!membership) {
    throw new ApiError(
      409,
      'SPACE_NOT_FOUND',
      'Sua conta não está vinculada a um espaço ativo.',
    );
  }

  return {
    user: toAuthUser(userRow),
    space: {
      id: membership.space_id,
      name: membership.space_name,
      role: membership.role,
    },
    members: getMembers(db, membership.space_id),
  };
}

export function getSessionDetails(
  db: Db,
  auth: AuthContext,
): SessionResponse {
  return {
    user: auth.user,
    space: auth.space,
    members: getMembers(db, auth.space.id),
  };
}

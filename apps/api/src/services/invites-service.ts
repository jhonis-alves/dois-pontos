import { randomUUID } from 'node:crypto';
import { seedDefaultCategories } from '../db/seeds.js';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import { hashPassword } from '../lib/passwords.js';
import { createOpaqueToken, hashOpaqueToken } from '../lib/tokens.js';
import {
  getMembers,
  type SessionResponse,
} from './auth-service.js';

export type InviteStatus = 'valid' | 'used' | 'revoked' | 'expired';

export interface CreatedInvite {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
}

export interface InvitePreview {
  spaceName: string;
  inviterName: string;
  email: string | null;
  expiresAt: string;
  status: InviteStatus;
}

export interface AcceptInviteInput {
  displayName?: string;
  email?: string;
  password?: string;
  genderPalette?: 'male' | 'female';
}

export interface AcceptInviteResult extends SessionResponse {
  createdAccount: boolean;
}

interface InviteRow {
  id: string;
  space_id: string;
  space_name: string;
  created_by: string;
  inviter_name: string;
  email: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

interface CreateInviteInput {
  email?: string;
  expiresInDays?: number;
}

function findInviteRow(db: Db, token: string): InviteRow {
  const row = db
    .prepare(
      `SELECT i.id, i.space_id, sp.name AS space_name, i.created_by,
              u.display_name AS inviter_name, i.email, i.expires_at,
              i.used_at, i.revoked_at
       FROM invites i
       JOIN spaces sp ON sp.id = i.space_id
       JOIN users u ON u.id = i.created_by
       WHERE i.token_hash = ?`,
    )
    .get(hashOpaqueToken(token)) as InviteRow | undefined;

  if (!row) {
    throw new ApiError(404, 'INVITE_NOT_FOUND', 'Convite não encontrado.');
  }

  return row;
}

export function getInviteStatus(invite: {
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): InviteStatus {
  if (invite.revoked_at) return 'revoked';
  if (invite.used_at) return 'used';
  if (Date.parse(invite.expires_at) <= Date.now()) return 'expired';
  return 'valid';
}

function assertInviteUsable(invite: InviteRow): void {
  const status = getInviteStatus(invite);

  if (status === 'revoked') {
    throw new ApiError(410, 'INVITE_REVOKED', 'Este convite foi revogado.');
  }
  if (status === 'used') {
    throw new ApiError(410, 'INVITE_USED', 'Este convite já foi utilizado.');
  }
  if (status === 'expired') {
    throw new ApiError(410, 'INVITE_EXPIRED', 'Este convite expirou.');
  }
}

function mapSpaceMemberLimit(error: unknown): never {
  if (
    error instanceof Error &&
    error.message.includes('SPACE_MEMBER_LIMIT')
  ) {
    throw new ApiError(
      409,
      'SPACE_FULL',
      'Este espaço já possui dois membros ativos.',
    );
  }
  throw error;
}

export function createInvite(
  db: Db,
  auth: AuthContext,
  input: CreateInviteInput,
): CreatedInvite {
  const activeMembers = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM space_members
       WHERE space_id = ? AND status = 'active'`,
    )
    .get(auth.space.id) as { total: number };

  if (activeMembers.total >= 2) {
    throw new ApiError(
      409,
      'SPACE_FULL',
      'O espaço já possui dois membros ativos.',
    );
  }

  const token = createOpaqueToken();
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
  );
  const nowIso = now.toISOString();
  const expiresIso = expiresAt.toISOString();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO invites
         (id, space_id, created_by, token_hash, email, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      auth.space.id,
      auth.user.id,
      hashOpaqueToken(token),
      input.email ?? null,
      expiresIso,
      nowIso,
    );

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'invite',
      entityId: id,
      action: 'invite.created',
      metadata: { email: input.email ?? null, expiresAt: expiresIso },
      now: nowIso,
    });
  })();

  return {
    id,
    token,
    url: `/convite/${token}`,
    expiresAt: expiresIso,
  };
}

export function getInvitePreview(db: Db, token: string): InvitePreview {
  const invite = findInviteRow(db, token);

  return {
    spaceName: invite.space_name,
    inviterName: invite.inviter_name,
    email: invite.email,
    expiresAt: invite.expires_at,
    status: getInviteStatus(invite),
  };
}

export async function acceptInvite(
  db: Db,
  token: string,
  input: AcceptInviteInput,
  auth: AuthContext | null,
): Promise<AcceptInviteResult> {
  const invite = findInviteRow(db, token);
  assertInviteUsable(invite);

  if (auth) {
    return acceptInviteAsExistingUser(db, invite, auth);
  }

  return acceptInviteWithNewAccount(db, invite, input);
}

function acceptInviteAsExistingUser(
  db: Db,
  invite: InviteRow,
  auth: AuthContext,
): AcceptInviteResult {
  if (
    invite.email &&
    invite.email.toLowerCase() !== auth.user.email.toLowerCase()
  ) {
    throw new ApiError(
      403,
      'INVITE_EMAIL_MISMATCH',
      'Este convite foi emitido para outro e-mail.',
    );
  }

  if (invite.created_by === auth.user.id) {
    throw new ApiError(
      409,
      'OWN_INVITE',
      'Você não pode aceitar o seu próprio convite.',
    );
  }

  if (invite.space_id === auth.space.id) {
    throw new ApiError(
      409,
      'ALREADY_MEMBER',
      'Você já participa deste espaço.',
    );
  }

  throw new ApiError(
    409,
    'ALREADY_IN_SPACE',
    'Sua conta já está vinculada a outro espaço.',
  );
}

async function acceptInviteWithNewAccount(
  db: Db,
  invite: InviteRow,
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  if (!input.displayName || !input.email || !input.password) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Informe nome, e-mail e senha para criar a conta.',
    );
  }

  if (
    invite.email &&
    invite.email.toLowerCase() !== input.email.toLowerCase()
  ) {
    throw new ApiError(
      403,
      'INVITE_EMAIL_MISMATCH',
      'Este convite foi emitido para outro e-mail.',
    );
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(input.email);

  if (existing) {
    throw new ApiError(
      409,
      'EMAIL_TAKEN',
      'Já existe uma conta com este e-mail. Entre para aceitar o convite.',
    );
  }

  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();
  const now = new Date().toISOString();

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

      const consumed = db
        .prepare(
          `UPDATE invites
           SET used_at = ?, used_by = ?
           WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
        )
        .run(now, userId, invite.id, now);

      if (consumed.changes !== 1) {
        throw new ApiError(
          410,
          'INVITE_USED',
          'Este convite já foi utilizado ou expirou.',
        );
      }

      db.prepare(
        `INSERT INTO space_members (id, space_id, user_id, role, status, joined_at)
         VALUES (?, ?, ?, 'member', 'active', ?)`,
      ).run(randomUUID(), invite.space_id, userId, now);

      db.prepare(
        `INSERT INTO user_settings (user_id, created_at, updated_at)
         VALUES (?, ?, ?)`,
      ).run(userId, now, now);

      seedDefaultCategories(db, {
        spaceId: invite.space_id,
        userId,
        now,
      });

      logActivity(db, {
        spaceId: invite.space_id,
        actorUserId: userId,
        entityType: 'invite',
        entityId: invite.id,
        action: 'invite.accepted',
        metadata: { email: input.email },
        now,
      });
    })();
  } catch (error) {
    mapSpaceMemberLimit(error);
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
    space: {
      id: invite.space_id,
      name: invite.space_name,
      role: 'member',
    },
    members: getMembers(db, invite.space_id),
    createdAccount: true,
  };
}

export function revokeInvite(
  db: Db,
  auth: AuthContext,
  inviteId: string,
): void {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE invites
       SET revoked_at = ?
       WHERE id = ? AND space_id = ? AND used_at IS NULL AND revoked_at IS NULL`,
    )
    .run(now, inviteId, auth.space.id);

  if (result.changes !== 1) {
    throw new ApiError(
      404,
      'INVITE_NOT_FOUND',
      'Convite não encontrado ou já finalizado.',
    );
  }

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'invite',
    entityId: inviteId,
    action: 'invite.revoked',
    now,
  });
}

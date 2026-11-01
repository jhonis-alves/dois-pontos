import type { AuthContext, AuthSpace } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  getMembers,
  type SpaceMember,
} from './auth-service.js';
import { getInviteStatus, type InviteStatus } from './invites-service.js';

export interface InviteSummary {
  id: string;
  email: string | null;
  expiresAt: string;
  createdAt: string;
  status: InviteStatus;
}

export interface SpaceDetails {
  space: AuthSpace;
  members: SpaceMember[];
  invites: InviteSummary[];
}

interface InviteRow {
  id: string;
  email: string | null;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

export function getSpaceDetails(
  db: Db,
  auth: AuthContext,
): SpaceDetails {
  const inviteRows = db
    .prepare(
      `SELECT id, email, expires_at, created_at, used_at, revoked_at
       FROM invites
       WHERE space_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all(auth.space.id) as InviteRow[];

  return {
    space: auth.space,
    members: getMembers(db, auth.space.id),
    invites: inviteRows.map((row) => ({
      id: row.id,
      email: row.email,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      status: getInviteStatus(row),
    })),
  };
}

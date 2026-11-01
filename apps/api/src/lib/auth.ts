import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { ApiError } from './api-error.js';
import type { Db } from './db.js';
import { createOpaqueToken, hashOpaqueToken } from './tokens.js';

export const SESSION_COOKIE = 'dp_session';
export const SESSION_TTL_DAYS = 30;

const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  genderPalette: 'male' | 'female';
  themeMode: 'light' | 'dark' | 'auto';
}

export interface AuthSpace {
  id: string;
  name: string;
  role: 'owner' | 'member';
}

export interface AuthContext {
  user: AuthUser;
  space: AuthSpace;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

interface SessionRow {
  session_id: string;
  last_seen_at: string;
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  gender_palette: 'male' | 'female';
  theme_mode: 'light' | 'dark' | 'auto';
  space_id: string;
  space_name: string;
  space_role: 'owner' | 'member';
}

export function createSession(
  db: Db,
  userId: string,
  meta: { userAgent?: string; ipAddress?: string },
): string {
  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare(
    `INSERT INTO sessions
       (id, user_id, token_hash, expires_at, created_at, last_seen_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    userId,
    hashOpaqueToken(token),
    expiresAt.toISOString(),
    now.toISOString(),
    now.toISOString(),
    meta.userAgent ?? null,
    meta.ipAddress ?? null,
  );

  return token;
}

export function deleteSessionByToken(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
    hashOpaqueToken(token),
  );
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Resolve o cookie de sessão em um contexto autenticado.
 * Só retorna contexto se a sessão não expirou e o membro está ativo.
 */
export function resolveSession(db: Db, token: string): AuthContext | null {
  const now = new Date();
  const row = db
    .prepare(
      `SELECT
         s.id AS session_id,
         s.last_seen_at,
         u.id AS user_id,
         u.email,
         u.display_name,
         u.avatar_url,
         u.gender_palette,
         u.theme_mode,
         sp.id AS space_id,
         sp.name AS space_name,
         sm.role AS space_role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN space_members sm ON sm.user_id = u.id AND sm.status = 'active'
       JOIN spaces sp ON sp.id = sm.space_id
       WHERE s.token_hash = ?
         AND s.expires_at > ?
       LIMIT 1`,
    )
    .get(hashOpaqueToken(token), now.toISOString()) as SessionRow | undefined;

  if (!row) return null;

  if (now.getTime() - Date.parse(row.last_seen_at) > LAST_SEEN_REFRESH_MS) {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(
      now.toISOString(),
      row.session_id,
    );
  }

  return {
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      genderPalette: row.gender_palette,
      themeMode: row.theme_mode,
    },
    space: {
      id: row.space_id,
      name: row.space_name,
      role: row.space_role,
    },
  };
}

export function authenticate(db: Db) {
  return async function authenticateRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = request.cookies[SESSION_COOKIE];

    if (!token) {
      throw new ApiError(
        401,
        'UNAUTHENTICATED',
        'Faça login para continuar.',
      );
    }

    const auth = resolveSession(db, token);

    if (!auth) {
      clearSessionCookie(reply);
      throw new ApiError(
        401,
        'SESSION_EXPIRED',
        'Sua sessão expirou. Entre novamente.',
      );
    }

    request.auth = auth;
  };
}

export function optionalAuthenticate(db: Db) {
  return async function optionalAuthenticateRequest(
    request: FastifyRequest,
  ): Promise<void> {
    const token = request.cookies[SESSION_COOKIE];
    request.auth = token ? resolveSession(db, token) : null;
  };
}

/** Garante que o preHandler de autenticação já populou o contexto. */
export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.');
  }
  return request.auth;
}

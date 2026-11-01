import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from './config.js';
import type { AuthContext } from './lib/auth.js';
import { openDatabase } from './lib/db.js';
import { canAccessScopedRecord } from './lib/scope.js';
import { buildServer } from './server.js';

const PASSWORD = 'senha-segura-123';

const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];

function tempDatabasePath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dois-pontos-auth-'));
  tempDirs.push(dir);
  return path.join(dir, 'test.sqlite');
}

function createApp(): { app: FastifyInstance; databasePath: string } {
  const databasePath = tempDatabasePath();
  const app = buildServer({
    databasePath,
    migrationsDir: config.migrationsDir,
  });
  apps.push(app);
  return { app, databasePath };
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

  if (typeof first !== 'string') {
    return {};
  }

  const match = first.match(/dp_session=([^;]+)/);

  return match?.[1] ? { dp_session: match[1] } : {};
}

async function register(
  app: FastifyInstance,
  overrides: Partial<{
    displayName: string;
    email: string;
    password: string;
    genderPalette: 'male' | 'female';
  }> = {},
) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      displayName: 'Ana',
      email: 'ana@exemplo.com',
      password: PASSWORD,
      ...overrides,
    },
  });
}

async function createInvite(
  app: FastifyInstance,
  cookies: Record<string, string>,
  payload: Record<string, unknown> = {},
) {
  return app.inject({
    method: 'POST',
    url: '/api/spaces/invites',
    cookies,
    payload,
  });
}

describe('autenticação', () => {
  it('cadastra, cria o espaço, inicia sessão e bloqueia e-mail duplicado', async () => {
    const { app } = createApp();

    const response = await register(app);
    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body.user).toMatchObject({
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      genderPalette: 'male',
    });
    expect(body.space).toMatchObject({
      name: 'Nosso Espaço',
      role: 'owner',
    });
    expect(body.members).toHaveLength(1);

    const cookie = sessionCookie(response);
    expect(cookie.dp_session).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: cookie,
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().space.id).toBe(body.space.id);
    expect(me.json().members).toHaveLength(1);

    const duplicate = await register(app, { email: 'ANA@exemplo.com' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('faz login, rejeita senha errada e encerra a sessão no logout', async () => {
    const { app } = createApp();
    await register(app);

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@exemplo.com', password: 'senha-errada' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS');

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ANA@exemplo.com', password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);

    const cookie = sessionCookie(login);
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: cookie,
    });
    expect(me.statusCode).toBe(200);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: cookie,
    });
    expect(logout.statusCode).toBe(204);

    const afterLogout = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: cookie,
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it('exige sessão nas rotas protegidas e valida dados de cadastro', async () => {
    const { app } = createApp();

    const current = await app.inject({
      method: 'GET',
      url: '/api/spaces/current',
    });
    expect(current.statusCode).toBe(401);

    const invite = await createInvite(app, {});
    expect(invite.statusCode).toBe(401);

    const weak = await register(app, { password: 'curta' });
    expect(weak.statusCode).toBe(400);
    expect(weak.json().error.code).toBe('VALIDATION_ERROR');

    const invalidEmail = await register(app, { email: 'nao-e-email' });
    expect(invalidEmail.statusCode).toBe(400);
  });
});

describe('convites e espaço do casal', () => {
  it('convida o segundo membro, limita a dois e impede reutilização', async () => {
    const { app } = createApp();
    const ana = await register(app);
    const anaCookie = sessionCookie(ana);
    const spaceId = ana.json().space.id;

    const created = await createInvite(app, anaCookie, {
      email: 'bia@exemplo.com',
    });
    expect(created.statusCode).toBe(201);

    const invite = created.json().invite;
    expect(invite.url).toBe(`/convite/${invite.token}`);

    const preview = await app.inject({
      method: 'GET',
      url: `/api/invites/${invite.token}`,
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().invite).toMatchObject({
      spaceName: 'Nosso Espaço',
      inviterName: 'Ana',
      email: 'bia@exemplo.com',
      status: 'valid',
    });

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/invites/${invite.token}/accept`,
      payload: {
        displayName: 'Bia',
        email: 'bia@exemplo.com',
        password: PASSWORD,
      },
    });
    expect(accepted.statusCode).toBe(201);

    const bia = accepted.json();
    expect(bia.createdAccount).toBe(true);
    expect(bia.space.id).toBe(spaceId);
    expect(bia.members).toHaveLength(2);

    const biaCookie = sessionCookie(accepted);
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: biaCookie,
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().members).toHaveLength(2);

    const reused = await app.inject({
      method: 'POST',
      url: `/api/invites/${invite.token}/accept`,
      payload: {
        displayName: 'Bia',
        email: 'bia@exemplo.com',
        password: PASSWORD,
      },
    });
    expect(reused.statusCode).toBe(410);
    expect(reused.json().error.code).toBe('INVITE_USED');

    const full = await createInvite(app, anaCookie, {});
    expect(full.statusCode).toBe(409);
    expect(full.json().error.code).toBe('SPACE_FULL');
  });

  it('impede convite próprio e conta já vinculada a outro espaço', async () => {
    const { app } = createApp();
    const ana = await register(app);
    const anaCookie = sessionCookie(ana);

    const created = await createInvite(app, anaCookie);
    const token = created.json().invite.token;

    const own = await app.inject({
      method: 'POST',
      url: `/api/invites/${token}/accept`,
      cookies: anaCookie,
      payload: {},
    });
    expect(own.statusCode).toBe(409);
    expect(own.json().error.code).toBe('OWN_INVITE');

    const carla = await register(app, {
      displayName: 'Carla',
      email: 'carla@exemplo.com',
    });
    const carlaCookie = sessionCookie(carla);

    const otherSpace = await app.inject({
      method: 'POST',
      url: `/api/invites/${token}/accept`,
      cookies: carlaCookie,
      payload: {},
    });
    expect(otherSpace.statusCode).toBe(409);
    expect(otherSpace.json().error.code).toBe('ALREADY_IN_SPACE');
  });

  it('valida e-mail do convite, revogação e expiração', async () => {
    const { app, databasePath } = createApp();
    const ana = await register(app);
    const anaCookie = sessionCookie(ana);

    const created = await createInvite(app, anaCookie, {
      email: 'bia@exemplo.com',
    });
    const invite = created.json().invite;

    const wrongEmail = await app.inject({
      method: 'POST',
      url: `/api/invites/${invite.token}/accept`,
      payload: {
        displayName: 'Outra',
        email: 'outra@exemplo.com',
        password: PASSWORD,
      },
    });
    expect(wrongEmail.statusCode).toBe(403);
    expect(wrongEmail.json().error.code).toBe('INVITE_EMAIL_MISMATCH');

    const revoke = await app.inject({
      method: 'DELETE',
      url: `/api/spaces/invites/${invite.id}`,
      cookies: anaCookie,
    });
    expect(revoke.statusCode).toBe(204);

    const revokedPreview = await app.inject({
      method: 'GET',
      url: `/api/invites/${invite.token}`,
    });
    expect(revokedPreview.json().invite.status).toBe('revoked');

    const revokedAccept = await app.inject({
      method: 'POST',
      url: `/api/invites/${invite.token}/accept`,
      payload: {
        displayName: 'Bia',
        email: 'bia@exemplo.com',
        password: PASSWORD,
      },
    });
    expect(revokedAccept.statusCode).toBe(410);
    expect(revokedAccept.json().error.code).toBe('INVITE_REVOKED');

    const expiring = await createInvite(app, anaCookie);
    const expiringToken = expiring.json().invite.token;
    const db = openDatabase(databasePath);
    db.prepare('UPDATE invites SET expires_at = ? WHERE token_hash IS NOT NULL').run(
      new Date(Date.now() - 60_000).toISOString(),
    );
    db.close();

    const expiredPreview = await app.inject({
      method: 'GET',
      url: `/api/invites/${expiringToken}`,
    });
    expect(expiredPreview.json().invite.status).toBe('expired');

    const expiredAccept = await app.inject({
      method: 'POST',
      url: `/api/invites/${expiringToken}/accept`,
      payload: {
        displayName: 'Bia',
        email: 'bia@exemplo.com',
        password: PASSWORD,
      },
    });
    expect(expiredAccept.statusCode).toBe(410);
    expect(expiredAccept.json().error.code).toBe('INVITE_EXPIRED');
  });

  it('lista membros e convites do espaço atual', async () => {
    const { app } = createApp();
    const ana = await register(app);
    const anaCookie = sessionCookie(ana);

    const created = await createInvite(app, anaCookie, {
      email: 'bia@exemplo.com',
    });
    expect(created.statusCode).toBe(201);

    const current = await app.inject({
      method: 'GET',
      url: '/api/spaces/current',
      cookies: anaCookie,
    });
    expect(current.statusCode).toBe(200);

    const body = current.json();
    expect(body.space).toMatchObject({
      name: 'Nosso Espaço',
      role: 'owner',
    });
    expect(body.members).toHaveLength(1);
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0]).toMatchObject({
      email: 'bia@exemplo.com',
      status: 'valid',
    });
    expect(body.invites[0].token).toBeUndefined();
  });
});

describe('autorização por escopo', () => {
  const auth: AuthContext = {
    sessionId: 'sessao',
    user: {
      id: 'membro-a',
      email: 'a@exemplo.com',
      displayName: 'A',
      avatarUrl: null,
      genderPalette: 'male',
      themeMode: 'auto',
    },
    space: {
      id: 'espaco-1',
      name: 'Nosso Espaço',
      role: 'owner',
    },
  };

  it('permite dados privados do próprio membro e compartilhados do espaço', () => {
    expect(
      canAccessScopedRecord(auth, {
        spaceId: 'espaco-1',
        scope: 'private',
        ownerUserId: 'membro-a',
      }),
    ).toBe(true);

    expect(
      canAccessScopedRecord(auth, {
        spaceId: 'espaco-1',
        scope: 'shared',
        ownerUserId: null,
      }),
    ).toBe(true);
  });

  it('bloqueia dados privados do parceiro e registros de outro espaço', () => {
    expect(
      canAccessScopedRecord(auth, {
        spaceId: 'espaco-1',
        scope: 'private',
        ownerUserId: 'membro-b',
      }),
    ).toBe(false);

    expect(
      canAccessScopedRecord(auth, {
        spaceId: 'espaco-2',
        scope: 'shared',
        ownerUserId: null,
      }),
    ).toBe(false);
  });
});

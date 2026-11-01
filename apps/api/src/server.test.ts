import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from './config.js';
import { seedDefaultCategories } from './db/seeds.js';
import { openDatabase } from './lib/db.js';
import { runMigrations } from './lib/migrations.js';
import { buildServer } from './server.js';

const tempDirs: string[] = [];

function tempDatabasePath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dois-pontos-'));
  tempDirs.push(dir);
  return path.join(dir, 'test.sqlite');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('API health', () => {
  it('responde ok e confirma que o banco está acessível', async () => {
    const app = buildServer({
      databasePath: tempDatabasePath(),
      migrationsDir: config.migrationsDir,
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/health' });
      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toMatchObject({
        status: 'ok',
        app: 'Dois Pontos API',
        database: 'up',
        timezone: 'America/Sao_Paulo',
      });
      expect(body.version).toBe('0.1.0');
    } finally {
      await app.close();
    }
  });

  it('retorna 404 estruturado para rota inexistente', async () => {
    const app = buildServer({
      databasePath: tempDatabasePath(),
      migrationsDir: config.migrationsDir,
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/nao-existe' });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: { code: 'NOT_FOUND' },
      });
    } finally {
      await app.close();
    }
  });
});

describe('migrações', () => {
  it('aplicam o esquema e são idempotentes', () => {
    const db = openDatabase(tempDatabasePath());

    try {
      const first = runMigrations(db, config.migrationsDir);
      expect(first.applied.length).toBeGreaterThanOrEqual(3);

      const second = runMigrations(db, config.migrationsDir);
      expect(second.applied).toHaveLength(0);

      const transactions = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transactions'",
        )
        .get();
      expect(transactions).toBeTruthy();
    } finally {
      db.close();
    }
  });

  it('limita o espaço a dois membros ativos no próprio banco', () => {
    const db = openDatabase(tempDatabasePath());
    runMigrations(db, config.migrationsDir);

    const now = new Date().toISOString();
    const userIds = [randomUUID(), randomUUID(), randomUUID()];
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, 'hash', 'Membro', ?, ?)
    `);
    const insertMember = db.prepare(`
      INSERT INTO space_members (id, space_id, user_id, role, status, joined_at)
      VALUES (?, ?, ?, 'member', 'active', ?)
    `);
    const spaceId = randomUUID();

    try {
      userIds.forEach((id, index) =>
        insertUser.run(id, `membro${index}@exemplo.com`, now, now),
      );
      db.prepare(
        'INSERT INTO spaces (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(spaceId, 'Nosso Espaço', userIds[0], now, now);

      insertMember.run(randomUUID(), spaceId, userIds[0], now);
      insertMember.run(randomUUID(), spaceId, userIds[1], now);

      expect(() =>
        insertMember.run(randomUUID(), spaceId, userIds[2], now),
      ).toThrow(/SPACE_MEMBER_LIMIT/);
    } finally {
      db.close();
    }
  });
});

describe('categorias padrão', () => {
  it('cria categorias compartilhadas e privadas sem duplicar', () => {
    const db = openDatabase(tempDatabasePath());
    runMigrations(db, config.migrationsDir);

    const now = new Date().toISOString();
    const userId = randomUUID();
    const spaceId = randomUUID();

    try {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
        VALUES (?, 'pessoa@exemplo.com', 'hash', 'Pessoa', ?, ?)
      `).run(userId, now, now);
      db.prepare(
        'INSERT INTO spaces (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(spaceId, 'Nosso Espaço', userId, now, now);

      seedDefaultCategories(db, { spaceId, userId });
      const firstCount = db
        .prepare('SELECT COUNT(*) AS total FROM categories')
        .get() as { total: number };

      seedDefaultCategories(db, { spaceId, userId });
      const secondCount = db
        .prepare('SELECT COUNT(*) AS total FROM categories')
        .get() as { total: number };

      expect(firstCount.total).toBeGreaterThan(30);
      expect(secondCount.total).toBe(firstCount.total);

      const shared = db
        .prepare(
          "SELECT COUNT(*) AS total FROM categories WHERE scope = 'shared' AND owner_user_id IS NULL",
        )
        .get() as { total: number };
      expect(shared.total).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });
});

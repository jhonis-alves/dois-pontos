import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Db } from './db.js';

export interface MigrationResult {
  applied: string[];
}

/**
 * Executa as migrações pendentes em ordem alfabética.
 * Cada arquivo roda em uma transação e só é registrado se concluir com sucesso.
 */
export function runMigrations(db: Db, migrationsDir: string): MigrationResult {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const rows = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as Array<{ version: string }>;
  const appliedVersions = new Set(rows.map((row) => row.version));

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const insert = db.prepare(
    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
  );
  const applied: string[] = [];

  for (const file of files) {
    if (appliedVersions.has(file)) continue;

    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      insert.run(file, new Date().toISOString());
    })();
    applied.push(file);
  }

  return { applied };
}

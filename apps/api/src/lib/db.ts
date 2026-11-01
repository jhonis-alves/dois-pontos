import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

/**
 * Abre o banco SQLite aplicando as configurações de durabilidade e concorrência.
 * WAL permite leitura e escrita simultâneas, importante para dois dispositivos.
 */
export function openDatabase(filePath: string): Db {
  if (filePath !== ':memory:') {
    mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

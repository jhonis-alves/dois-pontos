import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const APP_VERSION = '0.1.0';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

// Carrega primeiro o .env da raiz do repositório e depois o específico da API.
dotenv.config({ path: path.resolve(packageRoot, '../../.env'), quiet: true });
dotenv.config({ path: path.resolve(packageRoot, '.env'), quiet: true });

function resolveDatabasePath(value: string | undefined): string {
  if (!value) return path.join(packageRoot, 'data', 'dois-pontos.sqlite');
  if (value === ':memory:') return value;
  return path.resolve(packageRoot, value);
}

const port = Number(process.env.PORT ?? 3333);

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number.isInteger(port) && port > 0 ? port : 3333,
  host: process.env.HOST ?? '127.0.0.1',
  databasePath: resolveDatabasePath(process.env.DATABASE_PATH),
  migrationsDir: path.join(packageRoot, 'db', 'migrations'),
  webDistDir: path.resolve(packageRoot, '..', 'web', 'dist'),
  timezone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
} as const;

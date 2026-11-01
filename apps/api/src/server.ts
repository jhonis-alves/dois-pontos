import cookie from '@fastify/cookie';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { openDatabase } from './lib/db.js';
import { runMigrations } from './lib/migrations.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerFinanceRoutes } from './routes/finance.js';
import { registerHabitRoutes } from './routes/habits.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerInviteRoutes } from './routes/invites.js';
import { registerSpaceRoutes } from './routes/spaces.js';
import { registerTaskRoutes } from './routes/tasks.js';

export interface BuildServerOptions {
  databasePath?: string;
  migrationsDir?: string;
  logger?: boolean;
}

/**
 * Monta a instância Fastify com banco e migrações aplicadas.
 * Exportada separadamente para permitir testes sem abrir porta de rede.
 */
export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const db = openDatabase(options.databasePath ?? config.databasePath);
  runMigrations(db, options.migrationsDir ?? config.migrationsDir);

  // Sessões expiradas não precisam permanecer no banco.
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(
    new Date().toISOString(),
  );

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 1024 * 1024,
  });

  app.register(cookie);

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');
    return payload;
  });

  registerHealthRoutes(app, db);
  registerAuthRoutes(app, db);
  registerInviteRoutes(app, db);
  registerSpaceRoutes(app, db);
  registerTaskRoutes(app, db);
  registerHabitRoutes(app, db);
  registerFinanceRoutes(app, db);

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Rota não encontrada: ${request.method} ${request.url}`,
      },
    }),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;

    if (status === 500) {
      request.log.error({ err: error }, 'Erro não tratado');
    }

    reply.status(status).send({
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : (error.code ?? 'REQUEST_ERROR'),
        message:
          status === 500
            ? 'Erro interno do servidor. Tente novamente.'
            : error.message,
      },
    });
  });

  app.addHook('onClose', async () => {
    db.close();
  });

  return app;
}

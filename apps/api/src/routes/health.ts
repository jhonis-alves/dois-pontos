import type { FastifyInstance } from 'fastify';
import { APP_VERSION, config } from '../config.js';
import type { Db } from '../lib/db.js';

export function registerHealthRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/health', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');

    try {
      const result = db.prepare('SELECT 1 AS ok').get() as
        | { ok: number }
        | undefined;
      const databaseUp = result?.ok === 1;

      return {
        status: databaseUp ? 'ok' : 'degraded',
        app: 'Dois Pontos API',
        version: APP_VERSION,
        environment: config.env,
        database: databaseUp ? 'up' : 'down',
        timezone: config.timezone,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        status: 'degraded',
        app: 'Dois Pontos API',
        version: APP_VERSION,
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

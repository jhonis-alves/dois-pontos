import type { FastifyInstance } from 'fastify';
import { authenticate, requireAuth } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  habitCreateSchema,
  habitEntryParamSchema,
  habitEntrySchema,
  habitUpdateSchema,
  idParamSchema,
  parseWithSchema,
} from '../lib/validation.js';
import {
  archiveHabit,
  createHabit,
  deleteHabitEntry,
  listHabits,
  setHabitEntry,
  updateHabit,
} from '../services/habits-service.js';

export function registerHabitRoutes(app: FastifyInstance, db: Db): void {
  app.get(
    '/api/habits',
    { preHandler: authenticate(db) },
    async (request) => ({ habits: listHabits(db, requireAuth(request)) }),
  );

  app.post(
    '/api/habits',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(habitCreateSchema, request.body);
      const habit = createHabit(db, requireAuth(request), input);

      reply.status(201);
      return { habit };
    },
  );

  app.patch(
    '/api/habits/:id',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(habitUpdateSchema, request.body);
      const habit = updateHabit(db, requireAuth(request), id, input);

      return { habit };
    },
  );

  app.delete(
    '/api/habits/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      archiveHabit(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.put(
    '/api/habits/:id/entries/:date',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id, date } = parseWithSchema(
        habitEntryParamSchema,
        request.params,
      );
      const input = parseWithSchema(habitEntrySchema, request.body);
      const habit = setHabitEntry(db, requireAuth(request), id, date, input);

      return { habit };
    },
  );

  app.delete(
    '/api/habits/:id/entries/:date',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id, date } = parseWithSchema(
        habitEntryParamSchema,
        request.params,
      );
      const habit = deleteHabitEntry(db, requireAuth(request), id, date);

      return { habit };
    },
  );
}

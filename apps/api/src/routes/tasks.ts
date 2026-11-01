import type { FastifyInstance } from 'fastify';
import { authenticate, requireAuth } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  idParamSchema,
  parseWithSchema,
  subtaskCreateSchema,
  subtaskParamSchema,
  subtaskUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from '../lib/validation.js';
import {
  archiveTask,
  createSubtask,
  createTask,
  deleteSubtask,
  listTasks,
  updateSubtask,
  updateTask,
} from '../services/tasks-service.js';

export function registerTaskRoutes(app: FastifyInstance, db: Db): void {
  app.get(
    '/api/tasks',
    { preHandler: authenticate(db) },
    async (request) => ({ tasks: listTasks(db, requireAuth(request)) }),
  );

  app.post(
    '/api/tasks',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(taskCreateSchema, request.body);
      const task = createTask(db, requireAuth(request), input);

      reply.status(201);
      return { task };
    },
  );

  app.patch(
    '/api/tasks/:id',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(taskUpdateSchema, request.body);
      const task = updateTask(db, requireAuth(request), id, input);

      return { task };
    },
  );

  app.delete(
    '/api/tasks/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      archiveTask(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.post(
    '/api/tasks/:id/subtasks',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(subtaskCreateSchema, request.body);
      const task = createSubtask(db, requireAuth(request), id, input.title);

      reply.status(201);
      return { task };
    },
  );

  app.patch(
    '/api/tasks/:id/subtasks/:subtaskId',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id, subtaskId } = parseWithSchema(
        subtaskParamSchema,
        request.params,
      );
      const input = parseWithSchema(subtaskUpdateSchema, request.body);
      const task = updateSubtask(
        db,
        requireAuth(request),
        id,
        subtaskId,
        input,
      );

      return { task };
    },
  );

  app.delete(
    '/api/tasks/:id/subtasks/:subtaskId',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id, subtaskId } = parseWithSchema(
        subtaskParamSchema,
        request.params,
      );
      const task = deleteSubtask(db, requireAuth(request), id, subtaskId);

      return { task };
    },
  );
}

import type { FastifyInstance } from 'fastify';
import { authenticate, requireAuth } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  createInviteSchema,
  inviteIdParamSchema,
  parseWithSchema,
} from '../lib/validation.js';
import {
  createInvite,
  revokeInvite,
} from '../services/invites-service.js';
import { getSpaceDetails } from '../services/space-service.js';

export function registerSpaceRoutes(app: FastifyInstance, db: Db): void {
  app.get(
    '/api/spaces/current',
    { preHandler: authenticate(db) },
    async (request) => getSpaceDetails(db, requireAuth(request)),
  );

  app.post(
    '/api/spaces/invites',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(createInviteSchema, request.body ?? {});
      const invite = createInvite(db, requireAuth(request), input);

      reply.status(201);
      return { invite };
    },
  );

  app.delete(
    '/api/spaces/invites/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(inviteIdParamSchema, request.params);
      revokeInvite(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );
}

import type { FastifyInstance } from 'fastify';
import {
  createSession,
  optionalAuthenticate,
  setSessionCookie,
} from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  acceptInviteSchema,
  parseWithSchema,
  tokenParamSchema,
} from '../lib/validation.js';
import {
  acceptInvite,
  getInvitePreview,
} from '../services/invites-service.js';

export function registerInviteRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/invites/:token', async (request) => {
    const { token } = parseWithSchema(tokenParamSchema, request.params);
    return { invite: getInvitePreview(db, token) };
  });

  app.post(
    '/api/invites/:token/accept',
    { preHandler: optionalAuthenticate(db) },
    async (request, reply) => {
      const { token } = parseWithSchema(tokenParamSchema, request.params);
      const input = parseWithSchema(acceptInviteSchema, request.body ?? {});
      const result = await acceptInvite(db, token, input, request.auth);

      if (result.createdAccount) {
        const sessionToken = createSession(db, result.user.id, {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        });
        setSessionCookie(reply, sessionToken);
        reply.status(201);
      }

      return result;
    },
  );
}

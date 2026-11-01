import type { FastifyInstance } from 'fastify';
import {
  authenticate,
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  requireAuth,
  SESSION_COOKIE,
  setSessionCookie,
} from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  loginSchema,
  parseWithSchema,
  registerSchema,
} from '../lib/validation.js';
import {
  getSessionDetails,
  loginUser,
  registerUser,
} from '../services/auth-service.js';

export function registerAuthRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/auth/register', async (request, reply) => {
    const input = parseWithSchema(registerSchema, request.body);
    const session = await registerUser(db, input);

    const token = createSession(db, session.user.id, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
    setSessionCookie(reply, token);

    reply.status(201);
    return session;
  });

  app.post('/api/auth/login', async (request, reply) => {
    const input = parseWithSchema(loginSchema, request.body);
    const session = await loginUser(db, input);

    const token = createSession(db, session.user.id, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
    setSessionCookie(reply, token);

    return session;
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];

    if (token) {
      deleteSessionByToken(db, token);
    }

    clearSessionCookie(reply);
    return reply.status(204).send();
  });

  app.get(
    '/api/auth/me',
    { preHandler: authenticate(db) },
    async (request) => getSessionDetails(db, requireAuth(request)),
  );
}

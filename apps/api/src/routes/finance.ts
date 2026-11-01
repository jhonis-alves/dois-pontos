import type { FastifyInstance } from 'fastify';
import { authenticate, requireAuth } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import {
  financeAccountCreateSchema,
  financeAccountUpdateSchema,
  financeCardCreateSchema,
  financeCardUpdateSchema,
  financeInvoicePaySchema,
  financeMonthQuerySchema,
  financePurchaseCreateSchema,
  financeTransactionCreateSchema,
  financeTransactionUpdateSchema,
  idParamSchema,
  parseWithSchema,
} from '../lib/validation.js';
import {
  archiveCard,
  cancelPurchase,
  createCard,
  createPurchase,
  listCards,
  listInvoices,
  listPurchases,
  payInvoice,
  updateCard,
} from '../services/cards-service.js';
import {
  archiveAccount,
  cancelTransaction,
  createAccount,
  createTransaction,
  listAccounts,
  listFinanceCategories,
  listTransactions,
  updateAccount,
  updateTransaction,
} from '../services/finance-service.js';

export function registerFinanceRoutes(app: FastifyInstance, db: Db): void {
  app.get(
    '/api/finance/accounts',
    { preHandler: authenticate(db) },
    async (request) => ({ accounts: listAccounts(db, requireAuth(request)) }),
  );

  app.post(
    '/api/finance/accounts',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(financeAccountCreateSchema, request.body);
      const account = createAccount(db, requireAuth(request), input);

      reply.status(201);
      return { account };
    },
  );

  app.patch(
    '/api/finance/accounts/:id',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(financeAccountUpdateSchema, request.body);
      const account = updateAccount(db, requireAuth(request), id, input);

      return { account };
    },
  );

  app.delete(
    '/api/finance/accounts/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      archiveAccount(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.get(
    '/api/finance/categories',
    { preHandler: authenticate(db) },
    async (request) => ({
      categories: listFinanceCategories(db, requireAuth(request)),
    }),
  );

  app.get(
    '/api/finance/transactions',
    { preHandler: authenticate(db) },
    async (request) => {
      const { month } = parseWithSchema(
        financeMonthQuerySchema,
        request.query,
      );

      return listTransactions(db, requireAuth(request), month);
    },
  );

  app.post(
    '/api/finance/transactions',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(
        financeTransactionCreateSchema,
        request.body,
      );
      const transaction = createTransaction(db, requireAuth(request), input);

      reply.status(201);
      return { transaction };
    },
  );

  app.patch(
    '/api/finance/transactions/:id',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(
        financeTransactionUpdateSchema,
        request.body,
      );
      const transaction = updateTransaction(
        db,
        requireAuth(request),
        id,
        input,
      );

      return { transaction };
    },
  );

  app.delete(
    '/api/finance/transactions/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      cancelTransaction(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.get(
    '/api/finance/cards',
    { preHandler: authenticate(db) },
    async (request) => ({ cards: listCards(db, requireAuth(request)) }),
  );

  app.post(
    '/api/finance/cards',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const input = parseWithSchema(financeCardCreateSchema, request.body);
      const card = createCard(db, requireAuth(request), input);

      reply.status(201);
      return { card };
    },
  );

  app.patch(
    '/api/finance/cards/:id',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(financeCardUpdateSchema, request.body);
      const card = updateCard(db, requireAuth(request), id, input);

      return { card };
    },
  );

  app.delete(
    '/api/finance/cards/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      archiveCard(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.get(
    '/api/finance/cards/:id/purchases',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);

      return {
        purchases: listPurchases(db, requireAuth(request), id),
      };
    },
  );

  app.post(
    '/api/finance/cards/:id/purchases',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(financePurchaseCreateSchema, request.body);
      const purchase = createPurchase(
        db,
        requireAuth(request),
        id,
        input,
      );

      reply.status(201);
      return { purchase };
    },
  );

  app.delete(
    '/api/finance/purchases/:id',
    { preHandler: authenticate(db) },
    async (request, reply) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      cancelPurchase(db, requireAuth(request), id);

      return reply.status(204).send();
    },
  );

  app.get(
    '/api/finance/invoices',
    { preHandler: authenticate(db) },
    async (request) => {
      const { month } = parseWithSchema(
        financeMonthQuerySchema,
        request.query,
      );

      return { invoices: listInvoices(db, requireAuth(request), month) };
    },
  );

  app.post(
    '/api/finance/invoices/:id/pay',
    { preHandler: authenticate(db) },
    async (request) => {
      const { id } = parseWithSchema(idParamSchema, request.params);
      const input = parseWithSchema(financeInvoicePaySchema, request.body ?? {});

      return {
        invoice: payInvoice(db, requireAuth(request), id, input),
      };
    },
  );
}

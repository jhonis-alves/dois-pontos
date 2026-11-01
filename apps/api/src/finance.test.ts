import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from './config.js';
import { buildServer } from './server.js';

const PASSWORD = 'senha-segura-123';

const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

function createApp(): FastifyInstance {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dois-pontos-finance-'));
  tempDirs.push(dir);
  const app = buildServer({
    databasePath: path.join(dir, 'test.sqlite'),
    migrationsDir: config.migrationsDir,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
  }
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function sessionCookie(response: {
  headers: Record<string, unknown>;
}): Record<string, string> {
  const raw = response.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;

  if (typeof first !== 'string') return {};

  const match = first.match(/dp_session=([^;]+)/);
  return match?.[1] ? { dp_session: match[1] } : {};
}

async function register(
  app: FastifyInstance,
  email = 'ana@exemplo.com',
  displayName = 'Ana',
) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { displayName, email, password: PASSWORD },
  });
}

async function setupCouple(app: FastifyInstance) {
  const ana = await register(app);
  const anaCookie = sessionCookie(ana);

  const created = await app.inject({
    method: 'POST',
    url: '/api/spaces/invites',
    cookies: anaCookie,
    payload: { email: 'bia@exemplo.com' },
  });
  const token = created.json().invite.token as string;

  const bia = await app.inject({
    method: 'POST',
    url: `/api/invites/${token}/accept`,
    payload: {
      displayName: 'Bia',
      email: 'bia@exemplo.com',
      password: PASSWORD,
    },
  });

  return {
    app,
    anaCookie,
    biaCookie: sessionCookie(bia),
  };
}

function createAccount(
  app: FastifyInstance,
  cookies: Record<string, string>,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: 'POST',
    url: '/api/finance/accounts',
    cookies,
    payload,
  });
}

function createTransaction(
  app: FastifyInstance,
  cookies: Record<string, string>,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: 'POST',
    url: '/api/finance/transactions',
    cookies,
    payload,
  });
}

async function listCategories(
  app: FastifyInstance,
  cookies: Record<string, string>,
): Promise<{ id: string; kind: 'income' | 'expense' }[]> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/finance/categories',
    cookies,
  });

  return response.json().categories;
}

async function getMonthData(
  app: FastifyInstance,
  cookies: Record<string, string>,
  month: string,
) {
  const response = await app.inject({
    method: 'GET',
    url: `/api/finance/transactions?month=${month}`,
    cookies,
  });

  return response.json() as {
    transactions: { id: string; status: string; type: string }[];
    summary: {
      month: string;
      incomeCents: number;
      expenseCents: number;
      netCents: number;
      realizedIncomeCents: number;
      realizedExpenseCents: number;
      realizedNetCents: number;
      transactionCount: number;
    };
  };
}

describe('contas financeiras', () => {
  it('cria conta compartilhada visível ao parceiro e permite arquivar', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);

    const created = await createAccount(app, anaCookie, {
      name: 'Conta do casal',
      type: 'checking',
      initialBalanceCents: 100_000,
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().account).toMatchObject({
      name: 'Conta do casal',
      type: 'checking',
      initialBalanceCents: 100_000,
      balanceCents: 100_000,
      projectedBalanceCents: 100_000,
    });

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: biaCookie,
    });
    expect(biaList.json().accounts).toHaveLength(1);
    expect(biaList.json().accounts[0].name).toBe('Conta do casal');

    const accountId = created.json().account.id as string;
    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/finance/accounts/${accountId}`,
      cookies: biaCookie,
      payload: { name: 'Conta principal', initialBalanceCents: 250_000 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().account).toMatchObject({
      name: 'Conta principal',
      initialBalanceCents: 250_000,
      balanceCents: 250_000,
    });

    const archived = await app.inject({
      method: 'DELETE',
      url: `/api/finance/accounts/${accountId}`,
      cookies: anaCookie,
    });
    expect(archived.statusCode).toBe(204);

    const afterArchive = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    expect(afterArchive.json().accounts).toHaveLength(0);

    const category = (await listCategories(app, anaCookie)).find(
      (item) => item.kind === 'expense',
    )!;

    const blocked = await createTransaction(app, anaCookie, {
      type: 'expense',
      description: 'Compra',
      amountCents: 1_000,
      competenceDate: todayIso(),
      accountId,
      categoryId: category.id,
    });
    expect(blocked.statusCode).toBe(404);
  });
});

describe('transações financeiras', () => {
  it('calcula saldo realizado, previsto e resumo do mês', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const today = todayIso();
    const month = today.slice(0, 7);

    const account = await createAccount(app, anaCookie, {
      name: 'Conta corrente',
      type: 'digital',
      initialBalanceCents: 100_000,
    });
    const accountId = account.json().account.id as string;

    const categories = await listCategories(app, anaCookie);
    const incomeCategory = categories.find((item) => item.kind === 'income')!;
    const expenseCategory = categories.find(
      (item) => item.kind === 'expense',
    )!;

    const income = await createTransaction(app, anaCookie, {
      type: 'income',
      description: 'Salário',
      amountCents: 50_000,
      competenceDate: today,
      paymentDate: today,
      accountId,
      categoryId: incomeCategory.id,
    });
    expect(income.statusCode).toBe(201);
    expect(income.json().transaction.status).toBe('received');

    const paidExpense = await createTransaction(app, anaCookie, {
      type: 'expense',
      description: 'Mercado',
      amountCents: 20_000,
      competenceDate: today,
      paymentDate: today,
      accountId,
      categoryId: expenseCategory.id,
    });
    expect(paidExpense.json().transaction.status).toBe('paid');

    const pendingExpense = await createTransaction(app, biaCookie, {
      type: 'expense',
      description: 'Internet',
      amountCents: 15_000,
      competenceDate: today,
      accountId,
      categoryId: expenseCategory.id,
    });
    expect(pendingExpense.statusCode).toBe(201);
    expect(pendingExpense.json().transaction.status).toBe('pending');

    const data = await getMonthData(app, anaCookie, month);
    expect(data.summary).toMatchObject({
      incomeCents: 50_000,
      expenseCents: 35_000,
      netCents: 15_000,
      realizedIncomeCents: 50_000,
      realizedExpenseCents: 20_000,
      realizedNetCents: 30_000,
      transactionCount: 3,
    });

    const accounts = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: biaCookie,
    });
    expect(accounts.json().accounts[0]).toMatchObject({
      balanceCents: 130_000,
      projectedBalanceCents: 115_000,
    });

    const settled = await app.inject({
      method: 'PATCH',
      url: `/api/finance/transactions/${pendingExpense.json().transaction.id}`,
      cookies: biaCookie,
      payload: { status: 'paid' },
    });
    expect(settled.statusCode).toBe(200);
    expect(settled.json().transaction.paymentDate).toBe(today);

    const afterSettle = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    expect(afterSettle.json().accounts[0]).toMatchObject({
      balanceCents: 115_000,
      projectedBalanceCents: 115_000,
    });

    const cancelled = await app.inject({
      method: 'DELETE',
      url: `/api/finance/transactions/${income.json().transaction.id}`,
      cookies: anaCookie,
    });
    expect(cancelled.statusCode).toBe(204);

    const afterCancel = await getMonthData(app, anaCookie, month);
    expect(afterCancel.summary).toMatchObject({
      incomeCents: 0,
      expenseCents: 35_000,
      transactionCount: 2,
    });

    const afterCancelAccounts = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    expect(afterCancelAccounts.json().accounts[0].balanceCents).toBe(65_000);
  });

  it('valida categoria, status, tipo e contas de transferência', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const today = todayIso();

    const origin = await createAccount(app, anaCookie, {
      name: 'Origem',
      type: 'checking',
      initialBalanceCents: 100_000,
    });
    const destination = await createAccount(app, anaCookie, {
      name: 'Destino',
      type: 'savings',
      initialBalanceCents: 0,
    });
    const originId = origin.json().account.id as string;
    const destinationId = destination.json().account.id as string;

    const categories = await listCategories(app, anaCookie);
    const incomeCategory = categories.find((item) => item.kind === 'income')!;
    const expenseCategory = categories.find(
      (item) => item.kind === 'expense',
    )!;

    const wrongCategory = await createTransaction(app, anaCookie, {
      type: 'expense',
      description: 'Categoria errada',
      amountCents: 1_000,
      competenceDate: today,
      accountId: originId,
      categoryId: incomeCategory.id,
    });
    expect(wrongCategory.statusCode).toBe(400);
    expect(wrongCategory.json().error.code).toBe('INVALID_CATEGORY');

    const missingCategory = await createTransaction(app, anaCookie, {
      type: 'expense',
      description: 'Sem categoria',
      amountCents: 1_000,
      competenceDate: today,
      accountId: originId,
    });
    expect(missingCategory.statusCode).toBe(400);
    expect(missingCategory.json().error.code).toBe('CATEGORY_REQUIRED');

    const invalidStatus = await createTransaction(app, anaCookie, {
      type: 'expense',
      description: 'Status inválido',
      amountCents: 1_000,
      competenceDate: today,
      accountId: originId,
      categoryId: expenseCategory.id,
      status: 'received',
    });
    expect(invalidStatus.statusCode).toBe(400);
    expect(invalidStatus.json().error.code).toBe('INVALID_STATUS');

    const sameAccountTransfer = await createTransaction(app, anaCookie, {
      type: 'transfer',
      description: 'Transferência inválida',
      amountCents: 10_000,
      competenceDate: today,
      accountId: originId,
      transferAccountId: originId,
    });
    expect(sameAccountTransfer.statusCode).toBe(400);
    expect(sameAccountTransfer.json().error.code).toBe('INVALID_TRANSFER');

    const transferWithCategory = await createTransaction(app, anaCookie, {
      type: 'transfer',
      description: 'Transferência com categoria',
      amountCents: 10_000,
      competenceDate: today,
      accountId: originId,
      transferAccountId: destinationId,
      categoryId: expenseCategory.id,
    });
    expect(transferWithCategory.statusCode).toBe(400);
    expect(transferWithCategory.json().error.code).toBe('INVALID_CATEGORY');

    const transfer = await createTransaction(app, anaCookie, {
      type: 'transfer',
      description: 'Para a reserva',
      amountCents: 30_000,
      competenceDate: today,
      paymentDate: today,
      accountId: originId,
      transferAccountId: destinationId,
    });
    expect(transfer.statusCode).toBe(201);

    const pendingTransfer = await createTransaction(app, anaCookie, {
      type: 'transfer',
      description: 'Transferência prevista',
      amountCents: 10_000,
      competenceDate: today,
      accountId: originId,
      transferAccountId: destinationId,
    });
    expect(pendingTransfer.statusCode).toBe(201);
    expect(pendingTransfer.json().transaction.status).toBe('pending');

    const accounts = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    const originAccount = accounts
      .json()
      .accounts.find((account: { id: string }) => account.id === originId);
    const destinationAccount = accounts
      .json()
      .accounts.find((account: { id: string }) => account.id === destinationId);

    expect(originAccount).toMatchObject({
      balanceCents: 70_000,
      projectedBalanceCents: 60_000,
    });
    expect(destinationAccount).toMatchObject({
      balanceCents: 30_000,
      projectedBalanceCents: 40_000,
    });

    const data = await getMonthData(app, anaCookie, today.slice(0, 7));
    expect(data.summary).toMatchObject({
      incomeCents: 0,
      expenseCents: 0,
      transactionCount: 2,
    });

    const income = await createTransaction(app, anaCookie, {
      type: 'income',
      description: 'Renda',
      amountCents: 5_000,
      competenceDate: today,
      accountId: originId,
      categoryId: incomeCategory.id,
    });

    const typeChange = await app.inject({
      method: 'PATCH',
      url: `/api/finance/transactions/${income.json().transaction.id}`,
      cookies: anaCookie,
      payload: { type: 'expense' },
    });
    expect(typeChange.statusCode).toBe(400);
    expect(typeChange.json().error.code).toBe('TRANSACTION_TYPE_IMMUTABLE');
  });

  it('exige sessão para acessar o financeiro', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/finance/transactions',
    });

    expect(response.statusCode).toBe(401);
  });
});

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

function createApp(): FastifyInstance {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dois-pontos-cards-'));
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

async function setupCouple(app: FastifyInstance, suffix = '') {
  const ana = await register(app, `ana${suffix}@exemplo.com`, 'Ana');
  const anaCookie = sessionCookie(ana);

  const created = await app.inject({
    method: 'POST',
    url: '/api/spaces/invites',
    cookies: anaCookie,
    payload: { email: `bia${suffix}@exemplo.com` },
  });
  const token = created.json().invite.token as string;

  const bia = await app.inject({
    method: 'POST',
    url: `/api/invites/${token}/accept`,
    payload: {
      displayName: 'Bia',
      email: `bia${suffix}@exemplo.com`,
      password: PASSWORD,
    },
  });

  return {
    app,
    anaCookie,
    biaCookie: sessionCookie(bia),
  };
}

async function createAccount(
  app: FastifyInstance,
  cookies: Record<string, string>,
  initialBalanceCents = 100_000,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/finance/accounts',
    cookies,
    payload: {
      name: 'Conta corrente',
      type: 'checking',
      initialBalanceCents,
    },
  });

  return response.json().account.id as string;
}

async function createExpenseCategory(
  app: FastifyInstance,
  cookies: Record<string, string>,
): Promise<string> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/finance/categories',
    cookies,
  });

  const categories = response.json().categories as Array<{
    id: string;
    kind: string;
  }>;

  return categories.find((item) => item.kind === 'expense')!.id;
}

async function createCard(
  app: FastifyInstance,
  cookies: Record<string, string>,
  overrides: Record<string, unknown> = {},
) {
  return app.inject({
    method: 'POST',
    url: '/api/finance/cards',
    cookies,
    payload: {
      name: 'Cartão do casal',
      institution: 'Banco X',
      limitCents: 500_000,
      closingDay: 20,
      dueDay: 28,
      ...overrides,
    },
  });
}

async function createPurchase(
  app: FastifyInstance,
  cookies: Record<string, string>,
  cardId: string,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: 'POST',
    url: `/api/finance/cards/${cardId}/purchases`,
    cookies,
    payload,
  });
}

describe('cartões de crédito', () => {
  it('cria cartão compartilhado visível ao parceiro e valida dias', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);

    const created = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().card).toMatchObject({
      name: 'Cartão do casal',
      closingDay: 20,
      dueDay: 28,
      limitCents: 500_000,
      usedLimitCents: 0,
      availableLimitCents: 500_000,
      paymentAccountId: accountId,
    });

    const biaList = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
      cookies: biaCookie,
    });
    expect(biaList.json().cards).toHaveLength(1);
    expect(biaList.json().cards[0].name).toBe('Cartão do casal');

    const invalidDay = await createCard(app, anaCookie, { closingDay: 32 });
    expect(invalidDay.statusCode).toBe(400);

    const invalidAccount = await createCard(app, anaCookie, {
      paymentAccountId: '00000000-0000-4000-8000-000000000000',
    });
    expect(invalidAccount.statusCode).toBe(400);
    expect(invalidAccount.json().error.code).toBe('INVALID_ACCOUNT');

    const archived = await app.inject({
      method: 'DELETE',
      url: `/api/finance/cards/${created.json().card.id}`,
      cookies: biaCookie,
    });
    expect(archived.statusCode).toBe(204);

    const afterArchive = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
      cookies: anaCookie,
    });
    expect(afterArchive.json().cards).toHaveLength(0);
  });

  it('distribui compra parcelada entre faturas e calcula limite usado', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    const purchase = await createPurchase(app, biaCookie, cardId, {
      description: 'Geladeira',
      totalCents: 10_000,
      installmentsCount: 3,
      purchaseDate: '2026-11-10',
      categoryId,
    });

    expect(purchase.statusCode).toBe(201);
    const body = purchase.json().purchase;
    expect(body).toMatchObject({
      totalCents: 10_000,
      installmentsCount: 3,
      firstDueDate: '2026-11-28',
      status: 'active',
    });
    expect(body.installments).toHaveLength(3);
    expect(body.installments.map((item: { amountCents: number }) => item.amountCents)).toEqual(
      [3334, 3333, 3333],
    );
    expect(
      body.installments.map((item: { dueDate: string }) => item.dueDate),
    ).toEqual(['2026-11-28', '2026-12-28', '2027-01-28']);
    expect(
      body.installments.map((item: { invoiceId: string }) => Boolean(item.invoiceId)),
    ).toEqual([true, true, true]);

    const cards = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
      cookies: anaCookie,
    });
    expect(cards.json().cards[0]).toMatchObject({
      usedLimitCents: 10_000,
      availableLimitCents: 490_000,
    });

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });
    expect(invoices.json().invoices).toHaveLength(1);
    expect(invoices.json().invoices[0]).toMatchObject({
      referenceMonth: '2026-11',
      closingDate: '2026-11-20',
      dueDate: '2026-11-28',
      status: 'open',
      totalCents: 3334,
      pendingCents: 3334,
      installmentCount: 1,
    });
  });

  it('compra depois do fechamento entra na fatura seguinte', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    const purchase = await createPurchase(app, anaCookie, cardId, {
      description: 'Sofá',
      totalCents: 5_000,
      installmentsCount: 1,
      purchaseDate: '2026-11-25',
      categoryId,
    });

    expect(purchase.statusCode).toBe(201);
    expect(purchase.json().purchase.firstDueDate).toBe('2026-12-28');

    const november = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });
    expect(november.json().invoices).toHaveLength(0);

    const december = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-12',
      cookies: anaCookie,
    });
    expect(december.json().invoices[0]).toMatchObject({
      dueDate: '2026-12-28',
      totalCents: 5_000,
    });
  });

  it('paga a fatura sem duplicar despesa e libera o limite', async () => {
    const app = createApp();
    const { anaCookie, biaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    await createPurchase(app, anaCookie, cardId, {
      description: 'Geladeira',
      totalCents: 10_000,
      installmentsCount: 3,
      purchaseDate: '2026-11-10',
      categoryId,
    });

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });
    const invoiceId = invoices.json().invoices[0].id as string;

    const paid = await app.inject({
      method: 'POST',
      url: `/api/finance/invoices/${invoiceId}/pay`,
      cookies: biaCookie,
      payload: { paymentDate: '2026-11-28' },
    });

    expect(paid.statusCode).toBe(200);
    expect(paid.json().invoice).toMatchObject({
      status: 'paid',
      totalCents: 3334,
      paidCents: 3334,
      pendingCents: 0,
      paymentAccountId: accountId,
    });

    const accounts = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    expect(accounts.json().accounts).toHaveLength(1);
    expect(accounts.json().accounts[0]).toMatchObject({
      balanceCents: 100_000 - 3334,
    });

    const cards = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
      cookies: anaCookie,
    });
    expect(cards.json().cards[0].usedLimitCents).toBe(10_000 - 3334);

    const month = await app.inject({
      method: 'GET',
      url: '/api/finance/transactions?month=2026-11',
      cookies: anaCookie,
    });
    expect(month.json().summary).toMatchObject({
      expenseCents: 3334,
      realizedExpenseCents: 3334,
      transactionCount: 2,
      netCents: -3334,
    });

    const duplicated = await app.inject({
      method: 'POST',
      url: `/api/finance/invoices/${invoiceId}/pay`,
      cookies: anaCookie,
      payload: {},
    });
    expect(duplicated.statusCode).toBe(409);
    expect(duplicated.json().error.code).toBe('INVOICE_ALREADY_PAID');

    const after = await app.inject({
      method: 'GET',
      url: '/api/finance/accounts',
      cookies: anaCookie,
    });
    expect(after.json().accounts[0].balanceCents).toBe(100_000 - 3334);
  });

  it('exige conta de pagamento ao liquidar fatura', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie);
    const cardId = card.json().card.id as string;

    await createPurchase(app, anaCookie, cardId, {
      description: 'Fone',
      totalCents: 2_000,
      installmentsCount: 1,
      purchaseDate: '2026-11-10',
      categoryId,
    });

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });
    const invoiceId = invoices.json().invoices[0].id as string;

    const missing = await app.inject({
      method: 'POST',
      url: `/api/finance/invoices/${invoiceId}/pay`,
      cookies: anaCookie,
      payload: {},
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json().error.code).toBe('PAYMENT_ACCOUNT_REQUIRED');
  });
});

describe('cancelamento de compra', () => {
  it('cancela parcelas pendentes e libera o limite', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    const purchase = await createPurchase(app, anaCookie, cardId, {
      description: 'TV',
      totalCents: 4_000,
      installmentsCount: 2,
      purchaseDate: '2026-11-10',
      categoryId,
    });
    const purchaseId = purchase.json().purchase.id as string;

    const cancelled = await app.inject({
      method: 'DELETE',
      url: `/api/finance/purchases/${purchaseId}`,
      cookies: anaCookie,
    });
    expect(cancelled.statusCode).toBe(204);

    const cards = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
      cookies: anaCookie,
    });
    expect(cards.json().cards[0].usedLimitCents).toBe(0);

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });
    expect(invoices.json().invoices[0].totalCents).toBe(0);

    const month = await app.inject({
      method: 'GET',
      url: '/api/finance/transactions?month=2026-11',
      cookies: anaCookie,
    });
    expect(month.json().transactions).toHaveLength(0);
  });

  it('bloqueia cancelamento com parcela paga', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    const purchase = await createPurchase(app, anaCookie, cardId, {
      description: 'Notebook',
      totalCents: 6_000,
      installmentsCount: 2,
      purchaseDate: '2026-11-10',
      categoryId,
    });
    const purchaseId = purchase.json().purchase.id as string;

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: anaCookie,
    });

    await app.inject({
      method: 'POST',
      url: `/api/finance/invoices/${invoices.json().invoices[0].id}/pay`,
      cookies: anaCookie,
      payload: {},
    });

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/api/finance/purchases/${purchaseId}`,
      cookies: anaCookie,
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe('PURCHASE_HAS_PAID_INSTALLMENTS');
  });
});

describe('segurança das rotas de cartão', () => {
  it('isola cartões entre espaços e exige sessão', async () => {
    const app = createApp();
    const first = await setupCouple(app, '-um');
    const second = await setupCouple(app, '-dois');

    const accountId = await createAccount(app, first.anaCookie);
    const categoryId = await createExpenseCategory(app, first.anaCookie);

    const card = await createCard(app, first.anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    await createPurchase(app, first.anaCookie, cardId, {
      description: 'Item',
      totalCents: 1_000,
      installmentsCount: 1,
      purchaseDate: '2026-11-10',
      categoryId,
    });

    const invoices = await app.inject({
      method: 'GET',
      url: '/api/finance/invoices?month=2026-11',
      cookies: first.anaCookie,
    });
    const invoiceId = invoices.json().invoices[0].id as string;

    const foreignPurchases = await app.inject({
      method: 'GET',
      url: `/api/finance/cards/${cardId}/purchases`,
      cookies: second.anaCookie,
    });
    expect(foreignPurchases.statusCode).toBe(404);

    const foreignPay = await app.inject({
      method: 'POST',
      url: `/api/finance/invoices/${invoiceId}/pay`,
      cookies: second.anaCookie,
      payload: {},
    });
    expect(foreignPay.statusCode).toBe(404);

    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/finance/cards',
    });
    expect(anonymous.statusCode).toBe(401);
  });

  it('impede editar ou cancelar diretamente uma parcela de cartão', async () => {
    const app = createApp();
    const { anaCookie } = await setupCouple(app);
    const accountId = await createAccount(app, anaCookie);
    const categoryId = await createExpenseCategory(app, anaCookie);

    const card = await createCard(app, anaCookie, {
      paymentAccountId: accountId,
    });
    const cardId = card.json().card.id as string;

    await createPurchase(app, anaCookie, cardId, {
      description: 'Item',
      totalCents: 1_000,
      installmentsCount: 1,
      purchaseDate: '2026-11-10',
      categoryId,
    });

    const month = await app.inject({
      method: 'GET',
      url: '/api/finance/transactions?month=2026-11',
      cookies: anaCookie,
    });
    const transactionId = month.json().transactions[0].id as string;

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/finance/transactions/${transactionId}`,
      cookies: anaCookie,
      payload: { description: 'Alterada' },
    });
    expect(patch.statusCode).toBe(409);
    expect(patch.json().error.code).toBe('CARD_TRANSACTION_LOCKED');

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/finance/transactions/${transactionId}`,
      cookies: anaCookie,
    });
    expect(remove.statusCode).toBe(409);
  });
});

import { randomUUID } from 'node:crypto';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import { addMonthsClamped, todayIso } from '../lib/dates.js';
import { assertFinanceCategory } from './finance-service.js';

export type InstallmentStatus = 'pending' | 'paid' | 'cancelled';
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'cancelled';
export type PurchaseStatus = 'active' | 'cancelled';

export interface FinanceCardDto {
  id: string;
  name: string;
  institution: string | null;
  holderUserId: string | null;
  holderName: string | null;
  limitCents: number;
  usedLimitCents: number;
  availableLimitCents: number;
  closingDay: number;
  dueDay: number;
  paymentAccountId: string | null;
  paymentAccountName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInstallmentDto {
  id: string;
  number: number;
  amountCents: number;
  dueDate: string;
  status: InstallmentStatus;
  invoiceId: string | null;
  paidAt: string | null;
}

export interface FinancePurchaseDto {
  id: string;
  cardId: string;
  cardName: string;
  description: string;
  totalCents: number;
  installmentsCount: number;
  purchaseDate: string;
  firstDueDate: string;
  categoryId: string | null;
  categoryName: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  notes: string | null;
  status: PurchaseStatus;
  installments: FinanceInstallmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInvoiceDto {
  id: string;
  cardId: string;
  cardName: string;
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
  paymentAccountId: string | null;
  paymentAccountName: string | null;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  installmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCardInput {
  name: string;
  institution?: string | null;
  holderUserId?: string | null;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  paymentAccountId?: string | null;
}

export interface FinanceCardUpdateInput {
  name?: string;
  institution?: string | null;
  holderUserId?: string | null;
  limitCents?: number;
  closingDay?: number;
  dueDay?: number;
  paymentAccountId?: string | null;
}

export interface FinancePurchaseInput {
  description: string;
  totalCents: number;
  installmentsCount: number;
  purchaseDate: string;
  firstDueDate?: string | null;
  categoryId: string;
  responsibleUserId?: string | null;
  notes?: string | null;
}

export interface FinanceInvoicePayInput {
  paymentAccountId?: string | null;
  paymentDate?: string;
}

interface CardRow {
  id: string;
  space_id: string;
  name: string;
  institution: string | null;
  holder_user_id: string | null;
  holder_name: string | null;
  limit_cents: number;
  closing_day: number;
  due_day: number;
  payment_account_id: string | null;
  payment_account_name: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseRow {
  id: string;
  space_id: string;
  card_id: string;
  card_name: string;
  description: string;
  total_cents: number;
  installments_count: number;
  purchase_date: string;
  first_due_date: string;
  category_id: string | null;
  category_name: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  notes: string | null;
  status: PurchaseStatus;
  created_at: string;
  updated_at: string;
}

interface InstallmentRow {
  id: string;
  number: number;
  amount_cents: number;
  due_date: string;
  status: InstallmentStatus;
  invoice_id: string | null;
  paid_at: string | null;
}

interface InvoiceRow {
  id: string;
  card_id: string;
  card_name: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  status: InvoiceStatus;
  paid_at: string | null;
  payment_account_id: string | null;
  payment_account_name: string | null;
  total_cents: number;
  paid_cents: number;
  installment_count: number;
  created_at: string;
  updated_at: string;
}

const CARD_SELECT = `
  SELECT cc.*, u.display_name AS holder_name, a.name AS payment_account_name
  FROM credit_cards cc
  LEFT JOIN users u ON u.id = cc.holder_user_id
  LEFT JOIN accounts a ON a.id = cc.payment_account_id
`;

const PURCHASE_SELECT = `
  SELECT p.*, cc.name AS card_name, c.name AS category_name,
         u.display_name AS responsible_name
  FROM card_purchases p
  JOIN credit_cards cc ON cc.id = p.card_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN users u ON u.id = p.responsible_user_id
`;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateInMonth(referenceMonth: string, day: number): string {
  const [year = 1970, month = 1] = referenceMonth.split('-').map(Number);
  const safeDay = Math.min(day, lastDayOfMonth(year, month));
  return `${year}-${pad(month)}-${pad(safeDay)}`;
}

function previousMonth(referenceMonth: string): string {
  const [year = 1970, month = 1] = referenceMonth.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
}

/** Vencimento e fechamento da fatura de um mês de referência (AAAA-MM). */
function invoiceDates(
  card: Pick<CardRow, 'closing_day' | 'due_day'>,
  referenceMonth: string,
): { closingDate: string; dueDate: string } {
  const dueDate = dateInMonth(referenceMonth, card.due_day);
  const closingMonth =
    card.closing_day < card.due_day
      ? referenceMonth
      : previousMonth(referenceMonth);
  const closingDate = dateInMonth(closingMonth, card.closing_day);

  return { closingDate, dueDate };
}

/**
 * Primeira fatura que ainda aceita a compra: compras até o fechamento entram
 * na fatura corrente; depois do fechamento, na seguinte.
 */
function defaultFirstDueDate(
  card: Pick<CardRow, 'closing_day' | 'due_day'>,
  purchaseDate: string,
): string {
  const startMonth = purchaseDate.slice(0, 7);

  for (let offset = 0; offset <= 3; offset += 1) {
    const referenceMonth = addMonthsClamped(`${startMonth}-01`, offset).slice(
      0,
      7,
    );
    const { closingDate, dueDate } = invoiceDates(card, referenceMonth);

    if (closingDate >= purchaseDate && dueDate >= purchaseDate) {
      return dueDate;
    }
  }

  return invoiceDates(card, addMonthsClamped(`${startMonth}-01`, 3).slice(0, 7))
    .dueDate;
}

function assertMember(db: Db, spaceId: string, userId: string): void {
  const member = db
    .prepare(
      `SELECT 1 AS ok FROM space_members
       WHERE space_id = ? AND user_id = ? AND status = 'active'`,
    )
    .get(spaceId, userId);

  if (!member) {
    throw new ApiError(
      400,
      'INVALID_MEMBER',
      'O titular precisa ser um membro ativo do espaço.',
    );
  }
}

function assertActiveAccount(
  db: Db,
  spaceId: string,
  accountId: string,
): void {
  const account = db
    .prepare(
      `SELECT 1 AS ok FROM accounts
       WHERE id = ? AND space_id = ? AND archived_at IS NULL
         AND system_kind IS NULL`,
    )
    .get(accountId, spaceId);

  if (!account) {
    throw new ApiError(
      400,
      'INVALID_ACCOUNT',
      'A conta de pagamento precisa estar ativa.',
    );
  }
}

/** Conta interna invisível que recebe as transferências de pagamento de fatura. */
function ensureSettlementAccount(
  db: Db,
  spaceId: string,
  createdBy: string,
  now: string,
): string {
  const existing = db
    .prepare(
      `SELECT id FROM accounts WHERE space_id = ? AND system_kind = 'card_settlement'`,
    )
    .get(spaceId) as { id: string } | undefined;

  if (existing) return existing.id;

  const accountId = randomUUID();
  db.prepare(
    `INSERT INTO accounts
       (id, space_id, scope, owner_user_id, name, type, holder_user_id,
        initial_balance_cents, currency, archived_at, created_by, created_at,
        updated_at, system_kind)
     VALUES (?, ?, 'shared', NULL, ?, 'other', NULL, 0, 'BRL', NULL, ?, ?, ?,
             'card_settlement')`,
  ).run(
    accountId,
    spaceId,
    'Pagamentos de cartão (interno)',
    createdBy,
    now,
    now,
  );

  return accountId;
}

function usedLimitByCard(db: Db, spaceId: string): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT p.card_id AS card_id, COALESCE(SUM(i.amount_cents), 0) AS used
       FROM installments i
       JOIN card_purchases p ON p.id = i.purchase_id
       WHERE p.space_id = ? AND p.status = 'active' AND i.status = 'pending'
       GROUP BY p.card_id`,
    )
    .all(spaceId) as Array<{ card_id: string; used: number }>;

  return new Map(rows.map((row) => [row.card_id, row.used]));
}

function mapCard(row: CardRow, usedCents: number): FinanceCardDto {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    holderUserId: row.holder_user_id,
    holderName: row.holder_name,
    limitCents: row.limit_cents,
    usedLimitCents: usedCents,
    availableLimitCents: Math.max(0, row.limit_cents - usedCents),
    closingDay: row.closing_day,
    dueDay: row.due_day,
    paymentAccountId: row.payment_account_id,
    paymentAccountName: row.payment_account_name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPurchase(
  row: PurchaseRow,
  installments: InstallmentRow[],
): FinancePurchaseDto {
  return {
    id: row.id,
    cardId: row.card_id,
    cardName: row.card_name,
    description: row.description,
    totalCents: row.total_cents,
    installmentsCount: row.installments_count,
    purchaseDate: row.purchase_date,
    firstDueDate: row.first_due_date,
    categoryId: row.category_id,
    categoryName: row.category_name,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    notes: row.notes,
    status: row.status,
    installments: installments.map((installment) => ({
      id: installment.id,
      number: installment.number,
      amountCents: installment.amount_cents,
      dueDate: installment.due_date,
      status: installment.status,
      invoiceId: installment.invoice_id,
      paidAt: installment.paid_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoice(row: InvoiceRow): FinanceInvoiceDto {
  return {
    id: row.id,
    cardId: row.card_id,
    cardName: row.card_name,
    referenceMonth: row.reference_month,
    closingDate: row.closing_date,
    dueDate: row.due_date,
    status: row.status,
    paidAt: row.paid_at,
    paymentAccountId: row.payment_account_id,
    paymentAccountName: row.payment_account_name,
    totalCents: row.total_cents,
    paidCents: row.paid_cents,
    pendingCents: Math.max(0, row.total_cents - row.paid_cents),
    installmentCount: row.installment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireCardRow(
  db: Db,
  auth: AuthContext,
  cardId: string,
): CardRow {
  const row = db
    .prepare(`${CARD_SELECT} WHERE cc.id = ?`)
    .get(cardId) as CardRow | undefined;

  if (!row || row.space_id !== auth.space.id) {
    throw new ApiError(404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');
  }

  return row;
}

function requireActiveCardRow(
  db: Db,
  auth: AuthContext,
  cardId: string,
): CardRow {
  const row = requireCardRow(db, auth, cardId);

  if (row.archived_at) {
    throw new ApiError(404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');
  }

  return row;
}

function requirePurchaseRow(
  db: Db,
  auth: AuthContext,
  purchaseId: string,
): PurchaseRow {
  const row = db
    .prepare(`${PURCHASE_SELECT} WHERE p.id = ?`)
    .get(purchaseId) as PurchaseRow | undefined;

  if (!row || row.space_id !== auth.space.id) {
    throw new ApiError(404, 'PURCHASE_NOT_FOUND', 'Compra não encontrada.');
  }

  return row;
}

function listInstallments(
  db: Db,
  purchaseId: string,
): InstallmentRow[] {
  return db
    .prepare(
      `SELECT id, number, amount_cents, due_date, status, invoice_id, paid_at
       FROM installments WHERE purchase_id = ? ORDER BY number`,
    )
    .all(purchaseId) as InstallmentRow[];
}

export function listCards(db: Db, auth: AuthContext): FinanceCardDto[] {
  const rows = db
    .prepare(
      `${CARD_SELECT}
       WHERE cc.space_id = ? AND cc.archived_at IS NULL
       ORDER BY cc.created_at`,
    )
    .all(auth.space.id) as CardRow[];

  const used = usedLimitByCard(db, auth.space.id);

  return rows.map((row) => mapCard(row, used.get(row.id) ?? 0));
}

export function createCard(
  db: Db,
  auth: AuthContext,
  input: FinanceCardInput,
): FinanceCardDto {
  if (input.holderUserId) assertMember(db, auth.space.id, input.holderUserId);
  if (input.paymentAccountId) {
    assertActiveAccount(db, auth.space.id, input.paymentAccountId);
  }

  const now = new Date().toISOString();
  const cardId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO credit_cards
         (id, space_id, scope, owner_user_id, name, institution,
          holder_user_id, limit_cents, closing_day, due_day,
          payment_account_id, archived_at, created_by, created_at, updated_at)
       VALUES (?, ?, 'shared', NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    ).run(
      cardId,
      auth.space.id,
      input.name,
      input.institution ?? null,
      input.holderUserId ?? null,
      input.limitCents,
      input.closingDay,
      input.dueDay,
      input.paymentAccountId ?? null,
      auth.user.id,
      now,
      now,
    );

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'card',
      entityId: cardId,
      action: 'card.created',
      metadata: { closingDay: input.closingDay, dueDay: input.dueDay },
      now,
    });
  })();

  return listCards(db, auth).find((card) => card.id === cardId)!;
}

export function updateCard(
  db: Db,
  auth: AuthContext,
  cardId: string,
  input: FinanceCardUpdateInput,
): FinanceCardDto {
  const row = requireActiveCardRow(db, auth, cardId);

  if (input.holderUserId) assertMember(db, auth.space.id, input.holderUserId);
  if (input.paymentAccountId) {
    assertActiveAccount(db, auth.space.id, input.paymentAccountId);
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE credit_cards
     SET name = ?, institution = ?, holder_user_id = ?, limit_cents = ?,
         closing_day = ?, due_day = ?, payment_account_id = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name ?? row.name,
    input.institution !== undefined ? input.institution : row.institution,
    input.holderUserId !== undefined
      ? input.holderUserId
      : row.holder_user_id,
    input.limitCents ?? row.limit_cents,
    input.closingDay ?? row.closing_day,
    input.dueDay ?? row.due_day,
    input.paymentAccountId !== undefined
      ? input.paymentAccountId
      : row.payment_account_id,
    now,
    cardId,
  );

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'card',
    entityId: cardId,
    action: 'card.updated',
    now,
  });

  return listCards(db, auth).find((card) => card.id === cardId)!;
}

export function archiveCard(
  db: Db,
  auth: AuthContext,
  cardId: string,
): void {
  requireActiveCardRow(db, auth, cardId);
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE credit_cards SET archived_at = ?, updated_at = ? WHERE id = ?',
  ).run(now, now, cardId);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'card',
    entityId: cardId,
    action: 'card.archived',
    now,
  });
}

function ensureInvoice(
  db: Db,
  card: CardRow,
  referenceMonth: string,
  now: string,
): { id: string; dueDate: string } {
  const existing = db
    .prepare(
      `SELECT id, due_date FROM invoices
       WHERE card_id = ? AND reference_month = ?`,
    )
    .get(card.id, referenceMonth) as
    | { id: string; due_date: string }
    | undefined;

  if (existing) return { id: existing.id, dueDate: existing.due_date };

  const { closingDate, dueDate } = invoiceDates(card, referenceMonth);
  const invoiceId = randomUUID();

  db.prepare(
    `INSERT INTO invoices
       (id, card_id, reference_month, closing_date, due_date, status, paid_at,
        payment_account_id, payment_transaction_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, ?, ?)`,
  ).run(
    invoiceId,
    card.id,
    referenceMonth,
    closingDate,
    dueDate,
    now,
    now,
  );

  return { id: invoiceId, dueDate };
}

export function createPurchase(
  db: Db,
  auth: AuthContext,
  cardId: string,
  input: FinancePurchaseInput,
): FinancePurchaseDto {
  const card = requireActiveCardRow(db, auth, cardId);

  if (input.responsibleUserId) {
    assertMember(db, auth.space.id, input.responsibleUserId);
  }

  assertFinanceCategory(db, auth, input.categoryId, 'expense');

  const count = input.installmentsCount;

  if (input.totalCents < count) {
    throw new ApiError(
      400,
      'INSTALLMENT_AMOUNT_TOO_LOW',
      'O valor total precisa cobrir todas as parcelas.',
    );
  }

  const firstDueDate =
    input.firstDueDate ?? defaultFirstDueDate(card, input.purchaseDate);

  const now = new Date().toISOString();
  const purchaseId = randomUUID();
  const settlementAccountId = ensureSettlementAccount(
    db,
    auth.space.id,
    auth.user.id,
    now,
  );
  const baseAmount = Math.floor(input.totalCents / count);
  const remainder = input.totalCents % count;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO card_purchases
         (id, space_id, scope, owner_user_id, card_id, description,
          total_cents, installments_count, purchase_date, first_due_date,
          category_id, responsible_user_id, notes, status, created_by,
          created_at, updated_at)
       VALUES (?, ?, 'shared', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?,
               ?, ?)`,
    ).run(
      purchaseId,
      auth.space.id,
      card.id,
      input.description,
      input.totalCents,
      count,
      input.purchaseDate,
      firstDueDate,
      input.categoryId,
      input.responsibleUserId ?? null,
      input.notes ?? null,
      auth.user.id,
      now,
      now,
    );

    for (let number = 1; number <= count; number += 1) {
      const rawDueDate = addMonthsClamped(firstDueDate, number - 1);
      const referenceMonth = rawDueDate.slice(0, 7);
      const invoice = ensureInvoice(db, card, referenceMonth, now);
      const amountCents = baseAmount + (number <= remainder ? 1 : 0);
      const installmentId = randomUUID();
      const transactionId = randomUUID();
      const label =
        count > 1
          ? `${input.description} (${number}/${count})`
          : input.description;

      db.prepare(
        `INSERT INTO installments
           (id, purchase_id, number, amount_cents, due_date, status,
            invoice_id, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?, ?)`,
      ).run(
        installmentId,
        purchaseId,
        number,
        amountCents,
        invoice.dueDate,
        invoice.id,
        now,
        now,
      );

      db.prepare(
        `INSERT INTO transactions
           (id, space_id, scope, owner_user_id, type, description,
            amount_cents, competence_date, due_date, payment_date, status,
            category_id, account_id, card_id, installment_id,
            transfer_account_id, transfer_group_id, responsible_user_id,
            recurrence_id, notes, created_by, created_at, updated_at)
         VALUES (?, ?, 'shared', NULL, 'expense', ?, ?, ?, ?, NULL, 'pending',
                 ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?, ?, ?)`,
      ).run(
        transactionId,
        auth.space.id,
        label,
        amountCents,
        invoice.dueDate,
        invoice.dueDate,
        input.categoryId,
        settlementAccountId,
        card.id,
        installmentId,
        input.responsibleUserId ?? null,
        input.notes ?? null,
        auth.user.id,
        now,
        now,
      );
    }

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'purchase',
      entityId: purchaseId,
      action: 'purchase.created',
      metadata: { cardId: card.id, installments: count },
      now,
    });
  })();

  return getPurchase(db, auth, purchaseId);
}

export function getPurchase(
  db: Db,
  auth: AuthContext,
  purchaseId: string,
): FinancePurchaseDto {
  const row = requirePurchaseRow(db, auth, purchaseId);
  return mapPurchase(row, listInstallments(db, purchaseId));
}

export function listPurchases(
  db: Db,
  auth: AuthContext,
  cardId: string,
): FinancePurchaseDto[] {
  requireCardRow(db, auth, cardId);

  const rows = db
    .prepare(
      `${PURCHASE_SELECT}
       WHERE p.card_id = ? AND p.space_id = ?
       ORDER BY p.purchase_date DESC, p.created_at DESC`,
    )
    .all(cardId, auth.space.id) as PurchaseRow[];

  return rows.map((row) => mapPurchase(row, listInstallments(db, row.id)));
}

export function cancelPurchase(
  db: Db,
  auth: AuthContext,
  purchaseId: string,
): void {
  const row = requirePurchaseRow(db, auth, purchaseId);

  if (row.status === 'cancelled') return;

  const paid = db
    .prepare(
      `SELECT 1 AS ok FROM installments
       WHERE purchase_id = ? AND status = 'paid' LIMIT 1`,
    )
    .get(purchaseId);

  if (paid) {
    throw new ApiError(
      409,
      'PURCHASE_HAS_PAID_INSTALLMENTS',
      'Não é possível cancelar uma compra com parcelas já pagas.',
    );
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `UPDATE card_purchases SET status = 'cancelled', updated_at = ?
       WHERE id = ?`,
    ).run(now, purchaseId);

    db.prepare(
      `UPDATE installments SET status = 'cancelled', updated_at = ?
       WHERE purchase_id = ? AND status <> 'paid'`,
    ).run(now, purchaseId);

    db.prepare(
      `UPDATE transactions
       SET status = 'cancelled', payment_date = NULL, updated_at = ?
       WHERE installment_id IN (SELECT id FROM installments WHERE purchase_id = ?)
         AND status <> 'paid'`,
    ).run(now, purchaseId);

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'purchase',
      entityId: purchaseId,
      action: 'purchase.cancelled',
      now,
    });
  })();
}

const INVOICE_SELECT = `
  SELECT inv.*, cc.name AS card_name, a.name AS payment_account_name,
         COALESCE((
           SELECT SUM(i.amount_cents) FROM installments i
           WHERE i.invoice_id = inv.id AND i.status <> 'cancelled'
         ), 0) AS total_cents,
         COALESCE((
           SELECT SUM(i.amount_cents) FROM installments i
           WHERE i.invoice_id = inv.id AND i.status = 'paid'
         ), 0) AS paid_cents,
         (
           SELECT COUNT(*) FROM installments i
           WHERE i.invoice_id = inv.id AND i.status <> 'cancelled'
         ) AS installment_count
  FROM invoices inv
  JOIN credit_cards cc ON cc.id = inv.card_id
  LEFT JOIN accounts a ON a.id = inv.payment_account_id
`;

function requireInvoiceRow(
  db: Db,
  auth: AuthContext,
  invoiceId: string,
): InvoiceRow {
  const row = db
    .prepare(`${INVOICE_SELECT} WHERE inv.id = ?`)
    .get(invoiceId) as InvoiceRow | undefined;

  const card = row
    ? (db
        .prepare('SELECT space_id FROM credit_cards WHERE id = ?')
        .get(row.card_id) as { space_id: string } | undefined)
    : undefined;

  if (!row || !card || card.space_id !== auth.space.id) {
    throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Fatura não encontrada.');
  }

  return row;
}

export function listInvoices(
  db: Db,
  auth: AuthContext,
  month?: string,
): FinanceInvoiceDto[] {
  const params: string[] = [auth.space.id];
  let filter = '';

  if (month) {
    filter = ' AND inv.reference_month = ?';
    params.push(month);
  }

  const rows = db
    .prepare(
      `${INVOICE_SELECT}
       WHERE cc.space_id = ?${filter}
       ORDER BY inv.reference_month DESC, cc.name`,
    )
    .all(...params) as InvoiceRow[];

  return rows.map(mapInvoice);
}

export function payInvoice(
  db: Db,
  auth: AuthContext,
  invoiceId: string,
  input: FinanceInvoicePayInput,
): FinanceInvoiceDto {
  const row = requireInvoiceRow(db, auth, invoiceId);

  if (row.status === 'paid') {
    throw new ApiError(
      409,
      'INVOICE_ALREADY_PAID',
      'Esta fatura já foi paga.',
    );
  }

  if (row.status === 'cancelled') {
    throw new ApiError(409, 'INVOICE_CANCELLED', 'Fatura cancelada.');
  }

  if (row.total_cents <= 0) {
    throw new ApiError(
      400,
      'INVOICE_EMPTY',
      'A fatura não tem parcelas para pagar.',
    );
  }

  const card = db
    .prepare('SELECT * FROM credit_cards WHERE id = ?')
    .get(row.card_id) as CardRow;

  const paymentAccountId =
    input.paymentAccountId ??
    row.payment_account_id ??
    card.payment_account_id;

  if (!paymentAccountId) {
    throw new ApiError(
      400,
      'PAYMENT_ACCOUNT_REQUIRED',
      'Informe a conta usada para pagar a fatura.',
    );
  }

  assertActiveAccount(db, auth.space.id, paymentAccountId);

  const paymentDate = input.paymentDate ?? todayIso();
  const now = new Date().toISOString();
  const settlementAccountId = ensureSettlementAccount(
    db,
    auth.space.id,
    auth.user.id,
    now,
  );
  const transactionId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO transactions
         (id, space_id, scope, owner_user_id, type, description, amount_cents,
          competence_date, due_date, payment_date, status, category_id,
          account_id, card_id, installment_id, transfer_account_id,
          transfer_group_id, responsible_user_id, recurrence_id, notes,
          created_by, created_at, updated_at)
       VALUES (?, ?, 'shared', NULL, 'transfer', ?, ?, ?, ?, ?, 'paid', NULL,
               ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    ).run(
      transactionId,
      auth.space.id,
      `Pagamento fatura ${card.name} ${row.reference_month}`,
      row.total_cents,
      paymentDate,
      row.due_date,
      paymentDate,
      paymentAccountId,
      card.id,
      settlementAccountId,
      auth.user.id,
      now,
      now,
    );

    db.prepare(
      `UPDATE invoices
       SET status = 'paid', paid_at = ?, payment_account_id = ?,
           payment_transaction_id = ?, updated_at = ?
       WHERE id = ?`,
    ).run(paymentDate, paymentAccountId, transactionId, now, invoiceId);

    db.prepare(
      `UPDATE installments SET status = 'paid', paid_at = ?, updated_at = ?
       WHERE invoice_id = ? AND status = 'pending'`,
    ).run(paymentDate, now, invoiceId);

    db.prepare(
      `UPDATE transactions SET status = 'paid', payment_date = ?, updated_at = ?
       WHERE installment_id IN (
         SELECT id FROM installments WHERE invoice_id = ?
       ) AND status = 'pending'`,
    ).run(paymentDate, now, invoiceId);

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'invoice',
      entityId: invoiceId,
      action: 'invoice.paid',
      metadata: { amountCents: row.total_cents },
      now,
    });
  })();

  const updated = db
    .prepare(`${INVOICE_SELECT} WHERE inv.id = ?`)
    .get(invoiceId) as InvoiceRow;

  return mapInvoice(updated);
}

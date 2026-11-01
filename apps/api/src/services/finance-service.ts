import { randomUUID } from 'node:crypto';
import { logActivity } from '../lib/activity.js';
import { ApiError } from '../lib/api-error.js';
import type { AuthContext } from '../lib/auth.js';
import type { Db } from '../lib/db.js';
import { todayIso } from '../lib/dates.js';

export type AccountType =
  | 'checking'
  | 'digital'
  | 'cash'
  | 'savings'
  | 'reserve'
  | 'other';

export type FinanceTransactionType = 'income' | 'expense' | 'transfer';

export type FinanceTransactionStatus =
  | 'planned'
  | 'pending'
  | 'paid'
  | 'received'
  | 'cancelled';

export interface FinanceAccountDto {
  id: string;
  name: string;
  type: AccountType;
  holderUserId: string | null;
  holderName: string | null;
  initialBalanceCents: number;
  balanceCents: number;
  projectedBalanceCents: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategoryDto {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  color: string | null;
}

export interface FinanceTransactionDto {
  id: string;
  type: FinanceTransactionType;
  description: string;
  amountCents: number;
  competenceDate: string;
  dueDate: string | null;
  paymentDate: string | null;
  status: FinanceTransactionStatus;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  accountId: string;
  accountName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  cardId: string | null;
  cardName: string | null;
  installmentId: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummaryDto {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  realizedIncomeCents: number;
  realizedExpenseCents: number;
  realizedNetCents: number;
  transactionCount: number;
}

export interface FinanceAccountInput {
  name: string;
  type: AccountType;
  holderUserId?: string | null;
  initialBalanceCents: number;
}

export interface FinanceAccountUpdateInput {
  name?: string;
  type?: AccountType;
  holderUserId?: string | null;
  initialBalanceCents?: number;
}

export interface FinanceTransactionInput {
  type: FinanceTransactionType;
  description: string;
  amountCents: number;
  competenceDate: string;
  dueDate?: string | null;
  paymentDate?: string | null;
  status?: FinanceTransactionStatus;
  categoryId?: string | null;
  accountId: string;
  transferAccountId?: string | null;
  responsibleUserId?: string | null;
  notes?: string | null;
}

export interface FinanceTransactionUpdateInput {
  type?: FinanceTransactionType;
  description?: string;
  amountCents?: number;
  competenceDate?: string;
  dueDate?: string | null;
  paymentDate?: string | null;
  status?: FinanceTransactionStatus;
  categoryId?: string | null;
  accountId?: string;
  transferAccountId?: string | null;
  responsibleUserId?: string | null;
  notes?: string | null;
}

interface AccountRow {
  id: string;
  space_id: string;
  name: string;
  type: AccountType;
  holder_user_id: string | null;
  holder_name: string | null;
  initial_balance_cents: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BalanceRow {
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  amount_cents: number;
  account_id: string | null;
  transfer_account_id: string | null;
}

interface CategoryRow {
  id: string;
  space_id: string;
  scope: 'private' | 'shared';
  owner_user_id: string | null;
  domain: string;
  kind: 'income' | 'expense';
  name: string;
  color: string | null;
}

interface TransactionRow {
  id: string;
  space_id: string;
  type: FinanceTransactionType;
  description: string;
  amount_cents: number;
  competence_date: string;
  due_date: string | null;
  payment_date: string | null;
  status: FinanceTransactionStatus;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  account_id: string;
  account_name: string | null;
  transfer_account_id: string | null;
  transfer_account_name: string | null;
  card_id: string | null;
  card_name: string | null;
  installment_id: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const TRANSACTION_SELECT = `
  SELECT t.*,
         c.name AS category_name,
         c.color AS category_color,
         a.name AS account_name,
         ta.name AS transfer_account_name,
         cc.name AS card_name,
         u.display_name AS responsible_name
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN accounts a ON a.id = t.account_id
  LEFT JOIN accounts ta ON ta.id = t.transfer_account_id
  LEFT JOIN credit_cards cc ON cc.id = t.card_id
  LEFT JOIN users u ON u.id = t.responsible_user_id
`;

const STATUS_BY_TYPE: Record<
  FinanceTransactionType,
  FinanceTransactionStatus[]
> = {
  income: ['planned', 'received', 'cancelled'],
  expense: ['planned', 'pending', 'paid', 'cancelled'],
  transfer: ['pending', 'paid', 'cancelled'],
};

function mapAccount(
  row: AccountRow,
  balanceCents: number,
  projectedBalanceCents: number,
): FinanceAccountDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    holderUserId: row.holder_user_id,
    holderName: row.holder_name,
    initialBalanceCents: row.initial_balance_cents,
    balanceCents,
    projectedBalanceCents,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row: TransactionRow): FinanceTransactionDto {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amountCents: row.amount_cents,
    competenceDate: row.competence_date,
    dueDate: row.due_date,
    paymentDate: row.payment_date,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    accountId: row.account_id,
    accountName: row.account_name,
    transferAccountId: row.transfer_account_id,
    transferAccountName: row.transfer_account_name,
    cardId: row.card_id,
    cardName: row.card_name,
    installmentId: row.installment_id,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Calcula saldo realizado e previsto de cada conta a partir das transações.
 * Transferências movem o valor da conta de origem para a de destino.
 */
function computeBalances(
  db: Db,
  spaceId: string,
): {
  balance: Map<string, number>;
  projected: Map<string, number>;
} {
  const rows = db
    .prepare(
      `SELECT type, status, amount_cents, account_id, transfer_account_id
       FROM transactions
       WHERE space_id = ? AND status <> 'cancelled'`,
    )
    .all(spaceId) as BalanceRow[];

  const balance = new Map<string, number>();
  const projected = new Map<string, number>();

  const add = (
    map: Map<string, number>,
    accountId: string | null,
    delta: number,
  ) => {
    if (!accountId) return;
    map.set(accountId, (map.get(accountId) ?? 0) + delta);
  };

  for (const row of rows) {
    const amount = row.amount_cents;

    if (row.type === 'income') {
      add(projected, row.account_id, amount);
      if (row.status === 'received') add(balance, row.account_id, amount);
      continue;
    }

    if (row.type === 'expense') {
      add(projected, row.account_id, -amount);
      if (row.status === 'paid') add(balance, row.account_id, -amount);
      continue;
    }

    add(projected, row.account_id, -amount);
    add(projected, row.transfer_account_id, amount);

    if (row.status === 'paid') {
      add(balance, row.account_id, -amount);
      add(balance, row.transfer_account_id, amount);
    }
  }

  return { balance, projected };
}

export function listAccounts(
  db: Db,
  auth: AuthContext,
): FinanceAccountDto[] {
  const rows = db
    .prepare(
      `SELECT a.*, u.display_name AS holder_name
       FROM accounts a
        LEFT JOIN users u ON u.id = a.holder_user_id
        WHERE a.space_id = ? AND a.archived_at IS NULL
          AND a.system_kind IS NULL
        ORDER BY a.created_at`,
    )
    .all(auth.space.id) as AccountRow[];

  const { balance, projected } = computeBalances(db, auth.space.id);

  return rows.map((row) =>
    mapAccount(
      row,
      row.initial_balance_cents + (balance.get(row.id) ?? 0),
      row.initial_balance_cents + (projected.get(row.id) ?? 0),
    ),
  );
}

export function listFinanceCategories(
  db: Db,
  auth: AuthContext,
): FinanceCategoryDto[] {
  const rows = db
    .prepare(
      `SELECT id, name, kind, color
       FROM categories
       WHERE space_id = ?
         AND domain = 'finance'
         AND scope = 'shared'
       ORDER BY kind, sort_order, name`,
    )
    .all(auth.space.id) as Pick<CategoryRow, 'id' | 'name' | 'kind' | 'color'>[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    color: row.color,
  }));
}

function assertMember(db: Db, spaceId: string, userId: string): void {
  const member = db
    .prepare(
      `SELECT 1 AS ok
       FROM space_members
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

function requireActiveAccountRow(
  db: Db,
  auth: AuthContext,
  accountId: string,
): AccountRow {
  const row = db
    .prepare(
      `SELECT a.*, u.display_name AS holder_name
        FROM accounts a
        LEFT JOIN users u ON u.id = a.holder_user_id
        WHERE a.id = ? AND a.system_kind IS NULL`,
    )
    .get(accountId) as AccountRow | undefined;

  if (!row || row.space_id !== auth.space.id || row.archived_at) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.');
  }

  return row;
}

export function assertFinanceCategory(
  db: Db,
  auth: AuthContext,
  categoryId: string,
  kind: 'income' | 'expense',
): void {
  const category = db
    .prepare(
      `SELECT id, space_id, scope, owner_user_id, domain, kind, name, color
       FROM categories
       WHERE id = ?`,
    )
    .get(categoryId) as CategoryRow | undefined;

  const accessible =
    category &&
    category.space_id === auth.space.id &&
    category.domain === 'finance' &&
    category.scope === 'shared' &&
    category.kind === kind;

  if (!accessible) {
    throw new ApiError(
      400,
      'INVALID_CATEGORY',
      'A categoria informada não está disponível para esta transação.',
    );
  }
}

function assertStatusForType(
  type: FinanceTransactionType,
  status: FinanceTransactionStatus,
): void {
  if (!STATUS_BY_TYPE[type].includes(status)) {
    throw new ApiError(
      400,
      'INVALID_STATUS',
      'O status informado não é válido para este tipo de transação.',
    );
  }
}

function defaultStatus(
  type: FinanceTransactionType,
  paymentDate: string | null,
): FinanceTransactionStatus {
  if (type === 'income') return paymentDate ? 'received' : 'planned';
  if (type === 'expense') return paymentDate ? 'paid' : 'pending';
  return paymentDate ? 'paid' : 'pending';
}

function resolvePaymentDate(
  status: FinanceTransactionStatus,
  provided?: string | null,
  fallback?: string | null,
): string | null {
  if (status === 'paid' || status === 'received') {
    return provided ?? fallback ?? todayIso();
  }

  if (provided) {
    throw new ApiError(
      400,
      'INVALID_PAYMENT_DATE',
      'Só informe data de pagamento em transações pagas ou recebidas.',
    );
  }

  return null;
}

function requireTransactionRow(
  db: Db,
  auth: AuthContext,
  transactionId: string,
): TransactionRow {
  const row = db
    .prepare(`${TRANSACTION_SELECT} WHERE t.id = ?`)
    .get(transactionId) as TransactionRow | undefined;

  if (!row || row.space_id !== auth.space.id) {
    throw new ApiError(
      404,
      'TRANSACTION_NOT_FOUND',
      'Transação não encontrada.',
    );
  }

  return row;
}

export function getTransaction(
  db: Db,
  auth: AuthContext,
  transactionId: string,
): FinanceTransactionDto {
  return mapTransaction(requireTransactionRow(db, auth, transactionId));
}

export function createAccount(
  db: Db,
  auth: AuthContext,
  input: FinanceAccountInput,
): FinanceAccountDto {
  if (input.holderUserId) {
    assertMember(db, auth.space.id, input.holderUserId);
  }

  const now = new Date().toISOString();
  const accountId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO accounts
         (id, space_id, scope, owner_user_id, name, type, holder_user_id,
          initial_balance_cents, currency, archived_at, created_by, created_at,
          updated_at)
       VALUES (?, ?, 'shared', NULL, ?, ?, ?, ?, 'BRL', NULL, ?, ?, ?)`,
    ).run(
      accountId,
      auth.space.id,
      input.name,
      input.type,
      input.holderUserId ?? null,
      input.initialBalanceCents,
      auth.user.id,
      now,
      now,
    );

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'account',
      entityId: accountId,
      action: 'account.created',
      metadata: { type: input.type },
      now,
    });
  })();

  return listAccounts(db, auth).find((account) => account.id === accountId)!;
}

export function updateAccount(
  db: Db,
  auth: AuthContext,
  accountId: string,
  input: FinanceAccountUpdateInput,
): FinanceAccountDto {
  const row = requireActiveAccountRow(db, auth, accountId);

  if (input.holderUserId) {
    assertMember(db, auth.space.id, input.holderUserId);
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE accounts
     SET name = ?, type = ?, holder_user_id = ?, initial_balance_cents = ?,
         updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name ?? row.name,
    input.type ?? row.type,
    input.holderUserId !== undefined
      ? input.holderUserId
      : row.holder_user_id,
    input.initialBalanceCents ?? row.initial_balance_cents,
    now,
    accountId,
  );

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'account',
    entityId: accountId,
    action: 'account.updated',
    now,
  });

  return listAccounts(db, auth).find((account) => account.id === accountId)!;
}

export function archiveAccount(
  db: Db,
  auth: AuthContext,
  accountId: string,
): void {
  requireActiveAccountRow(db, auth, accountId);
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE accounts SET archived_at = ?, updated_at = ? WHERE id = ?',
  ).run(now, now, accountId);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'account',
    entityId: accountId,
    action: 'account.archived',
    now,
  });
}

export function listTransactions(
  db: Db,
  auth: AuthContext,
  month?: string,
): {
  transactions: FinanceTransactionDto[];
  summary: FinanceSummaryDto;
} {
  const period = month ?? todayIso().slice(0, 7);
  const rows = db
    .prepare(
      `${TRANSACTION_SELECT}
       WHERE t.space_id = ?
         AND t.status <> 'cancelled'
         AND t.competence_date LIKE ?
       ORDER BY t.competence_date DESC, t.created_at DESC`,
    )
    .all(auth.space.id, `${period}-%`) as TransactionRow[];

  const transactions = rows.map(mapTransaction);

  const summary = transactions.reduce<FinanceSummaryDto>(
    (accumulator, transaction) => {
      if (transaction.type === 'income') {
        accumulator.incomeCents += transaction.amountCents;
        if (transaction.status === 'received') {
          accumulator.realizedIncomeCents += transaction.amountCents;
        }
      }

      if (transaction.type === 'expense') {
        accumulator.expenseCents += transaction.amountCents;
        if (transaction.status === 'paid') {
          accumulator.realizedExpenseCents += transaction.amountCents;
        }
      }

      return accumulator;
    },
    {
      month: period,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      realizedIncomeCents: 0,
      realizedExpenseCents: 0,
      realizedNetCents: 0,
      transactionCount: transactions.length,
    },
  );

  summary.netCents = summary.incomeCents - summary.expenseCents;
  summary.realizedNetCents =
    summary.realizedIncomeCents - summary.realizedExpenseCents;

  return { transactions, summary };
}

function validateTransactionRelations(
  db: Db,
  auth: AuthContext,
  params: {
    type: FinanceTransactionType;
    accountId: string;
    transferAccountId: string | null;
    categoryId: string | null;
    responsibleUserId: string | null;
  },
): void {
  requireActiveAccountRow(db, auth, params.accountId);

  if (params.responsibleUserId) {
    assertMember(db, auth.space.id, params.responsibleUserId);
  }

  if (params.type === 'transfer') {
    if (!params.transferAccountId) {
      throw new ApiError(
        400,
        'TRANSFER_ACCOUNT_REQUIRED',
        'Informe a conta de destino da transferência.',
      );
    }

    if (params.transferAccountId === params.accountId) {
      throw new ApiError(
        400,
        'INVALID_TRANSFER',
        'A conta de destino precisa ser diferente da conta de origem.',
      );
    }

    if (params.categoryId) {
      throw new ApiError(
        400,
        'INVALID_CATEGORY',
        'Transferências não usam categoria.',
      );
    }

    requireActiveAccountRow(db, auth, params.transferAccountId);
    return;
  }

  if (!params.categoryId) {
    throw new ApiError(
      400,
      'CATEGORY_REQUIRED',
      'Informe uma categoria para a transação.',
    );
  }

  assertFinanceCategory(
    db,
    auth,
    params.categoryId,
    params.type === 'income' ? 'income' : 'expense',
  );
}

export function createTransaction(
  db: Db,
  auth: AuthContext,
  input: FinanceTransactionInput,
): FinanceTransactionDto {
  const status = input.status ?? defaultStatus(input.type, input.paymentDate ?? null);
  assertStatusForType(input.type, status);

  const paymentDate = resolvePaymentDate(status, input.paymentDate ?? null);

  if (input.type === 'transfer' && input.categoryId) {
    throw new ApiError(
      400,
      'INVALID_CATEGORY',
      'Transferências não usam categoria.',
    );
  }

  if (input.type !== 'transfer' && input.transferAccountId) {
    throw new ApiError(
      400,
      'INVALID_TRANSFER',
      'Só transferências podem ter conta de destino.',
    );
  }

  const categoryId =
    input.type === 'transfer' ? null : (input.categoryId ?? null);
  const transferAccountId =
    input.type === 'transfer' ? (input.transferAccountId ?? null) : null;

  validateTransactionRelations(db, auth, {
    type: input.type,
    accountId: input.accountId,
    transferAccountId,
    categoryId,
    responsibleUserId: input.responsibleUserId ?? null,
  });

  const now = new Date().toISOString();
  const transactionId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO transactions
         (id, space_id, scope, owner_user_id, type, description, amount_cents,
          competence_date, due_date, payment_date, status, category_id,
          account_id, card_id, installment_id, transfer_account_id,
          transfer_group_id, responsible_user_id, recurrence_id, notes,
          created_by, created_at, updated_at)
       VALUES (?, ?, 'shared', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?,
               NULL, ?, NULL, ?, ?, ?, ?)`,
    ).run(
      transactionId,
      auth.space.id,
      input.type,
      input.description,
      input.amountCents,
      input.competenceDate,
      input.dueDate ?? null,
      paymentDate,
      status,
      categoryId,
      input.accountId,
      transferAccountId,
      input.responsibleUserId ?? null,
      input.notes ?? null,
      auth.user.id,
      now,
      now,
    );

    logActivity(db, {
      spaceId: auth.space.id,
      actorUserId: auth.user.id,
      entityType: 'transaction',
      entityId: transactionId,
      action: 'transaction.created',
      metadata: { type: input.type, status },
      now,
    });
  })();

  return getTransaction(db, auth, transactionId);
}

export function updateTransaction(
  db: Db,
  auth: AuthContext,
  transactionId: string,
  input: FinanceTransactionUpdateInput,
): FinanceTransactionDto {
  const row = requireTransactionRow(db, auth, transactionId);

  if (row.card_id) {
    throw new ApiError(
      409,
      'CARD_TRANSACTION_LOCKED',
      'Parcelas de cartão são alteradas pela compra ou pela fatura.',
    );
  }

  if (row.status === 'cancelled') {
    throw new ApiError(
      409,
      'TRANSACTION_CANCELLED',
      'Transações canceladas não podem ser editadas.',
    );
  }

  if (input.type && input.type !== row.type) {
    throw new ApiError(
      400,
      'TRANSACTION_TYPE_IMMUTABLE',
      'O tipo da transação não pode ser alterado.',
    );
  }

  const status = input.status ?? row.status;
  assertStatusForType(row.type, status);

  const paymentDate = resolvePaymentDate(
    status,
    input.paymentDate !== undefined ? input.paymentDate : undefined,
    row.payment_date,
  );

  const accountId = input.accountId ?? row.account_id;
  const categoryId =
    row.type === 'transfer'
      ? null
      : input.categoryId !== undefined
        ? input.categoryId
        : row.category_id;
  const transferAccountId =
    row.type === 'transfer'
      ? input.transferAccountId !== undefined
        ? input.transferAccountId
        : row.transfer_account_id
      : null; // transferências usam conta de destino; demais tipos não.

  if (row.type === 'transfer' && input.categoryId) {
    throw new ApiError(
      400,
      'INVALID_CATEGORY',
      'Transferências não usam categoria.',
    );
  }

  if (row.type !== 'transfer' && input.transferAccountId) {
    throw new ApiError(
      400,
      'INVALID_TRANSFER',
      'Só transferências podem ter conta de destino.',
    );
  }

  validateTransactionRelations(db, auth, {
    type: row.type,
    accountId,
    transferAccountId,
    categoryId,
    responsibleUserId:
      input.responsibleUserId !== undefined
        ? input.responsibleUserId
        : row.responsible_user_id,
  });

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE transactions
     SET description = ?, amount_cents = ?, competence_date = ?, due_date = ?,
         payment_date = ?, status = ?, category_id = ?, account_id = ?,
         transfer_account_id = ?, responsible_user_id = ?, notes = ?,
         updated_at = ?
     WHERE id = ?`,
  ).run(
    input.description ?? row.description,
    input.amountCents ?? row.amount_cents,
    input.competenceDate ?? row.competence_date,
    input.dueDate !== undefined ? input.dueDate : row.due_date,
    paymentDate,
    status,
    categoryId,
    accountId,
    transferAccountId,
    input.responsibleUserId !== undefined
      ? input.responsibleUserId
      : row.responsible_user_id,
    input.notes !== undefined ? input.notes : row.notes,
    now,
    transactionId,
  );

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'transaction',
    entityId: transactionId,
    action:
      status === 'paid' || status === 'received'
        ? 'transaction.settled'
        : 'transaction.updated',
    metadata: { status },
    now,
  });

  return getTransaction(db, auth, transactionId);
}

export function cancelTransaction(
  db: Db,
  auth: AuthContext,
  transactionId: string,
): void {
  const row = requireTransactionRow(db, auth, transactionId);

  if (row.card_id) {
    throw new ApiError(
      409,
      'CARD_TRANSACTION_LOCKED',
      'Cancele a compra no cartão para remover as parcelas.',
    );
  }

  if (row.status === 'cancelled') return;

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE transactions
     SET status = 'cancelled', payment_date = NULL, updated_at = ?
     WHERE id = ?`,
  ).run(now, transactionId);

  logActivity(db, {
    spaceId: auth.space.id,
    actorUserId: auth.user.id,
    entityType: 'transaction',
    entityId: transactionId,
    action: 'transaction.cancelled',
    now,
  });
}

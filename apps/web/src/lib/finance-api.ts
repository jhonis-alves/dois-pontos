import { apiRequest } from './http';

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

export interface FinanceAccount {
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

export interface FinanceCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  color: string | null;
}

export interface FinanceTransaction {
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

export interface FinanceSummary {
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

export interface FinanceTransactionsResponse {
  transactions: FinanceTransaction[];
  summary: FinanceSummary;
}

export type InstallmentStatus = 'pending' | 'paid' | 'cancelled';
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'cancelled';
export type PurchaseStatus = 'active' | 'cancelled';

export interface FinanceCard {
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

export interface FinanceInstallment {
  id: string;
  number: number;
  amountCents: number;
  dueDate: string;
  status: InstallmentStatus;
  invoiceId: string | null;
  paidAt: string | null;
}

export interface FinancePurchase {
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
  installments: FinanceInstallment[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInvoice {
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

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const response = await apiRequest<{ accounts: FinanceAccount[] }>(
    '/api/finance/accounts',
  );
  return response.accounts;
}

export async function createFinanceAccount(
  input: FinanceAccountInput,
): Promise<FinanceAccount> {
  const response = await apiRequest<{ account: FinanceAccount }>(
    '/api/finance/accounts',
    { method: 'POST', body: input },
  );
  return response.account;
}

export async function updateFinanceAccount(
  accountId: string,
  input: FinanceAccountUpdateInput,
): Promise<FinanceAccount> {
  const response = await apiRequest<{ account: FinanceAccount }>(
    `/api/finance/accounts/${encodeURIComponent(accountId)}`,
    { method: 'PATCH', body: input },
  );
  return response.account;
}

export function archiveFinanceAccount(accountId: string): Promise<void> {
  return apiRequest(`/api/finance/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  });
}

export async function fetchFinanceCategories(): Promise<FinanceCategory[]> {
  const response = await apiRequest<{ categories: FinanceCategory[] }>(
    '/api/finance/categories',
  );
  return response.categories;
}

export function fetchFinanceTransactions(
  month: string,
): Promise<FinanceTransactionsResponse> {
  return apiRequest(
    `/api/finance/transactions?month=${encodeURIComponent(month)}`,
  );
}

export async function createFinanceTransaction(
  input: FinanceTransactionInput,
): Promise<FinanceTransaction> {
  const response = await apiRequest<{ transaction: FinanceTransaction }>(
    '/api/finance/transactions',
    { method: 'POST', body: input },
  );
  return response.transaction;
}

export async function updateFinanceTransaction(
  transactionId: string,
  input: Partial<FinanceTransactionInput>,
): Promise<FinanceTransaction> {
  const response = await apiRequest<{ transaction: FinanceTransaction }>(
    `/api/finance/transactions/${encodeURIComponent(transactionId)}`,
    { method: 'PATCH', body: input },
  );
  return response.transaction;
}

export function cancelFinanceTransaction(
  transactionId: string,
): Promise<void> {
  return apiRequest(
    `/api/finance/transactions/${encodeURIComponent(transactionId)}`,
    { method: 'DELETE' },
  );
}

export async function fetchFinanceCards(): Promise<FinanceCard[]> {
  const response = await apiRequest<{ cards: FinanceCard[] }>(
    '/api/finance/cards',
  );
  return response.cards;
}

export async function createFinanceCard(
  input: FinanceCardInput,
): Promise<FinanceCard> {
  const response = await apiRequest<{ card: FinanceCard }>(
    '/api/finance/cards',
    { method: 'POST', body: input },
  );
  return response.card;
}

export async function updateFinanceCard(
  cardId: string,
  input: FinanceCardUpdateInput,
): Promise<FinanceCard> {
  const response = await apiRequest<{ card: FinanceCard }>(
    `/api/finance/cards/${encodeURIComponent(cardId)}`,
    { method: 'PATCH', body: input },
  );
  return response.card;
}

export function archiveFinanceCard(cardId: string): Promise<void> {
  return apiRequest(`/api/finance/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
  });
}

export async function fetchFinancePurchases(
  cardId: string,
): Promise<FinancePurchase[]> {
  const response = await apiRequest<{ purchases: FinancePurchase[] }>(
    `/api/finance/cards/${encodeURIComponent(cardId)}/purchases`,
  );
  return response.purchases;
}

export async function createFinancePurchase(
  cardId: string,
  input: FinancePurchaseInput,
): Promise<FinancePurchase> {
  const response = await apiRequest<{ purchase: FinancePurchase }>(
    `/api/finance/cards/${encodeURIComponent(cardId)}/purchases`,
    { method: 'POST', body: input },
  );
  return response.purchase;
}

export function cancelFinancePurchase(purchaseId: string): Promise<void> {
  return apiRequest(
    `/api/finance/purchases/${encodeURIComponent(purchaseId)}`,
    { method: 'DELETE' },
  );
}

export async function fetchFinanceInvoices(
  month?: string,
): Promise<FinanceInvoice[]> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await apiRequest<{ invoices: FinanceInvoice[] }>(
    `/api/finance/invoices${query}`,
  );
  return response.invoices;
}

export async function payFinanceInvoice(
  invoiceId: string,
  input: FinanceInvoicePayInput,
): Promise<FinanceInvoice> {
  const response = await apiRequest<{ invoice: FinanceInvoice }>(
    `/api/finance/invoices/${encodeURIComponent(invoiceId)}/pay`,
    { method: 'POST', body: input },
  );
  return response.invoice;
}

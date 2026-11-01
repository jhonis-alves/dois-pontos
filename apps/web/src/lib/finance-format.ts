import type {
  AccountType,
  FinanceTransactionStatus,
  FinanceTransactionType,
  InstallmentStatus,
  InvoiceStatus,
} from './finance-api';
import { formatMonthYear } from './format';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  digital: 'Conta digital',
  cash: 'Dinheiro',
  savings: 'Poupança',
  reserve: 'Reserva',
  other: 'Outra',
};

export const TRANSACTION_TYPE_LABELS: Record<FinanceTransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
};

export const TRANSACTION_STATUS_LABELS: Record<
  FinanceTransactionStatus,
  string
> = {
  planned: 'Previsto',
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

/** Converte centavos em um valor aceitável por input numérico. */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Converte o valor digitado em centavos inteiros. */
export function parseAmountToCents(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Rótulo curto para o seletor de mês (AAAA-MM). */
export function formatMonthLabel(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 'Mês selecionado';
  const date = new Date(`${month}-01T12:00:00.000Z`);
  return formatMonthYear(date);
}

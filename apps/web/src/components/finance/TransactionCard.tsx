import { useState } from 'react';
import {
  ArrowRightLeft,
  CalendarDays,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceTransaction,
  FinanceTransactionInput,
} from '../../lib/finance-api';
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '../../lib/finance-format';
import {
  useCancelFinanceTransaction,
  useUpdateFinanceTransaction,
} from '../../lib/finance-hooks';
import { formatCurrencyFromCents, formatDate, todayIso } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TransactionForm } from './TransactionForm';

interface TransactionCardProps {
  transaction: FinanceTransaction;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  members: SpaceMember[];
}

function statusVariant(
  status: FinanceTransaction['status'],
): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'paid' || status === 'received') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

export function TransactionCard({
  transaction,
  accounts,
  categories,
  members,
}: TransactionCardProps) {
  const updateTransaction = useUpdateFinanceTransaction();
  const cancelTransaction = useCancelFinanceTransaction();

  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settled =
    transaction.status === 'paid' || transaction.status === 'received';
  const amountClass =
    transaction.type === 'income'
      ? 'text-[var(--success)]'
      : transaction.type === 'expense'
        ? 'text-[var(--danger)]'
        : 'text-[var(--text)]';
  const amountPrefix =
    transaction.type === 'income'
      ? '+'
      : transaction.type === 'expense'
        ? '-'
        : '';

  function reportError(submitError: unknown, fallback: string) {
    setError(
      submitError instanceof ApiError ? submitError.message : fallback,
    );
  }

  async function toggleSettled() {
    setError(null);

    try {
      await updateTransaction.mutateAsync({
        transactionId: transaction.id,
        input: settled
          ? {
              status:
                transaction.type === 'income' ? 'planned' : 'pending',
              paymentDate: null,
            }
          : {
              status:
                transaction.type === 'income' ? 'received' : 'paid',
              paymentDate: todayIso(),
            },
      });
    } catch (submitError) {
      reportError(submitError, 'Não foi possível atualizar a transação.');
    }
  }

  async function saveEdit(input: FinanceTransactionInput) {
    await updateTransaction.mutateAsync({
      transactionId: transaction.id,
      input,
    });
    setEditing(false);
  }

  async function cancel() {
    setError(null);

    try {
      await cancelTransaction.mutateAsync(transaction.id);
    } catch (submitError) {
      reportError(submitError, 'Não foi possível cancelar a transação.');
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold">
              {transaction.description}
            </h3>
            <Badge variant={statusVariant(transaction.status)}>
              {TRANSACTION_STATUS_LABELS[transaction.status]}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              {transaction.type === 'transfer' ? (
                <ArrowRightLeft size={13} aria-hidden="true" />
              ) : (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: transaction.categoryColor ?? '#64748b',
                  }}
                  aria-hidden="true"
                />
              )}
              {transaction.type === 'transfer'
                ? `${transaction.accountName ?? 'Conta'} → ${
                    transaction.cardName ??
                    transaction.transferAccountName ??
                    'Destino'
                  }`
                : (transaction.categoryName ??
                  TRANSACTION_TYPE_LABELS[transaction.type])}
            </span>

            {transaction.type !== 'transfer' && (
              <span>
                {transaction.cardName ?? transaction.accountName ?? 'Conta'}
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} aria-hidden="true" />
              {formatDate(transaction.competenceDate)}
            </span>

            {transaction.dueDate && (
              <span>Vence {formatDate(transaction.dueDate)}</span>
            )}

            {transaction.paymentDate && (
              <span>Pago em {formatDate(transaction.paymentDate)}</span>
            )}

            {transaction.responsibleName && (
              <span>{transaction.responsibleName}</span>
            )}
          </div>

          {transaction.notes && (
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--muted)]">
              {transaction.notes}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-base font-bold ${amountClass}`}>
            {amountPrefix}
            {formatCurrencyFromCents(transaction.amountCents)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {TRANSACTION_TYPE_LABELS[transaction.type]}
          </p>
        </div>
      </div>

      {!transaction.cardId && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="soft"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => void toggleSettled()}
            disabled={updateTransaction.isPending}
          >
            {settled ? (
              <RotateCcw size={14} aria-hidden="true" />
            ) : (
              <CalendarDays size={14} aria-hidden="true" />
            )}
            {settled
              ? 'Reabrir'
              : transaction.type === 'income'
                ? 'Marcar recebido'
                : 'Marcar pago'}
          </Button>

          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => {
              setEditing((current) => !current);
              setError(null);
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            Editar
          </Button>

          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => setConfirmingCancel(true)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Cancelar
          </Button>
        </div>
      )}

      {confirmingCancel && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5">
          <Badge variant="danger">Cancelar esta transação?</Badge>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => setConfirmingCancel(false)}
            >
              <X size={14} aria-hidden="true" />
              Não
            </Button>
            <Button
              variant="primary"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => void cancel()}
              disabled={cancelTransaction.isPending}
            >
              Cancelar transação
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            members={members}
            initial={transaction}
            submitLabel="Salvar alterações"
            onSubmit={saveEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {error && (
        <div className="form-error mt-3" role="alert">
          {error}
        </div>
      )}
    </Card>
  );
}

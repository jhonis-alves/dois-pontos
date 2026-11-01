import { useState } from 'react';
import { CheckCircle2, ReceiptText } from 'lucide-react';
import type { FinanceAccount, FinanceInvoice } from '../../lib/finance-api';
import { INVOICE_STATUS_LABELS } from '../../lib/finance-format';
import { usePayFinanceInvoice } from '../../lib/finance-hooks';
import { formatCurrencyFromCents, formatDate } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

interface InvoiceListProps {
  invoices: FinanceInvoice[];
  accounts: FinanceAccount[];
  monthLabel: string;
}

function statusVariant(
  status: FinanceInvoice['status'],
): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'paid') return 'success';
  if (status === 'open' || status === 'closed') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

function InvoiceCard({
  invoice,
  accounts,
}: {
  invoice: FinanceInvoice;
  accounts: FinanceAccount[];
}) {
  const payInvoice = usePayFinanceInvoice();
  const [paymentAccount, setPaymentAccount] = useState(
    invoice.paymentAccountId ?? accounts[0]?.id ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const payable =
    invoice.status !== 'paid' &&
    invoice.status !== 'cancelled' &&
    invoice.pendingCents > 0;

  async function pay() {
    setError(null);

    try {
      await payInvoice.mutateAsync({
        invoiceId: invoice.id,
        input: { paymentAccountId: paymentAccount || null },
      });
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível pagar a fatura.',
      );
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold">
              {invoice.cardName} · {invoice.referenceMonth}
            </h3>
            <Badge variant={statusVariant(invoice.status)}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Fecha {formatDate(invoice.closingDate)} · vence{' '}
            {formatDate(invoice.dueDate)} · {invoice.installmentCount}{' '}
            {invoice.installmentCount === 1 ? 'parcela' : 'parcelas'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold">
            {formatCurrencyFromCents(invoice.totalCents)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {formatCurrencyFromCents(invoice.pendingCents)} em aberto
          </p>
        </div>
      </div>

      {payable && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="field min-w-44 flex-1">
            <label
              className="field-label"
              htmlFor={`invoice-account-${invoice.id}`}
            >
              Conta de pagamento
            </label>
            <select
              id={`invoice-account-${invoice.id}`}
              className="input"
              value={paymentAccount}
              onChange={(event) => setPaymentAccount(event.target.value)}
            >
              <option value="">Selecione</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="min-h-9 px-3 py-1.5 text-xs"
            onClick={() => void pay()}
            disabled={payInvoice.isPending || !paymentAccount}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            {payInvoice.isPending ? 'Pagando...' : 'Pagar fatura'}
          </Button>
        </div>
      )}

      {invoice.status === 'paid' && invoice.paidAt && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Paga em {formatDate(invoice.paidAt)}
          {invoice.paymentAccountName
            ? ` pela conta ${invoice.paymentAccountName}`
            : ''}
        </p>
      )}

      {error && (
        <div className="form-error mt-3" role="alert">
          {error}
        </div>
      )}
    </Card>
  );
}

export function InvoiceList({
  invoices,
  accounts,
  monthLabel,
}: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ReceiptText}
          title="Nenhuma fatura neste mês"
          description={`Não há faturas de cartão em ${monthLabel}. Registre uma compra para gerar a primeira fatura.`}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          accounts={accounts}
        />
      ))}
    </div>
  );
}

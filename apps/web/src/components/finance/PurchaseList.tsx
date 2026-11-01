import { useState } from 'react';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import type { FinancePurchase } from '../../lib/finance-api';
import { INSTALLMENT_STATUS_LABELS } from '../../lib/finance-format';
import { useCancelFinancePurchase } from '../../lib/finance-hooks';
import { formatCurrencyFromCents, formatDate } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface PurchaseListProps {
  purchases: FinancePurchase[];
  cardName: string;
}

function PurchaseItem({ purchase }: { purchase: FinancePurchase }) {
  const cancelPurchase = useCancelFinancePurchase();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelled = purchase.status === 'cancelled';
  const hasPaid = purchase.installments.some(
    (installment) => installment.status === 'paid',
  );

  async function cancel() {
    setError(null);

    try {
      await cancelPurchase.mutateAsync(purchase.id);
      setConfirming(false);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível cancelar a compra.',
      );
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold">
              {purchase.description}
            </h3>
            {cancelled && <Badge variant="danger">Cancelada</Badge>}
            {hasPaid && !cancelled && (
              <Badge variant="success">Tem parcela paga</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Compra em {formatDate(purchase.purchaseDate)} ·{' '}
            {purchase.installmentsCount}x · 1ª em{' '}
            {formatDate(purchase.firstDueDate)}
            {purchase.categoryName ? ` · ${purchase.categoryName}` : ''}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold">
            {formatCurrencyFromCents(purchase.totalCents)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {purchase.installmentsCount > 1
              ? `${formatCurrencyFromCents(purchase.installments[0]?.amountCents ?? 0)} +`
              : 'à vista'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {purchase.installments.map((installment) => (
          <span
            key={installment.id}
            className="inset rounded-[var(--radius-sm)] px-2 py-1 text-[11px] text-[var(--muted)]"
            title={INSTALLMENT_STATUS_LABELS[installment.status]}
          >
            {installment.number}/{purchase.installmentsCount} ·{' '}
            {formatDate(installment.dueDate)} ·{' '}
            {formatCurrencyFromCents(installment.amountCents)}
          </span>
        ))}
      </div>

      {!cancelled && !hasPaid && (
        <div className="mt-3">
          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Cancelar compra
          </Button>
        </div>
      )}

      {confirming && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5">
          <Badge variant="danger">Cancelar esta compra?</Badge>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => setConfirming(false)}
            >
              <X size={14} aria-hidden="true" />
              Não
            </Button>
            <Button
              variant="primary"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => void cancel()}
              disabled={cancelPurchase.isPending}
            >
              Cancelar compra
            </Button>
          </div>
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

export function PurchaseList({ purchases, cardName }: PurchaseListProps) {
  if (purchases.length === 0) {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <ShoppingBag size={16} aria-hidden="true" />
          Nenhuma compra registrada {cardName ? `no cartão ${cardName}` : ''}.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {purchases.map((purchase) => (
        <PurchaseItem key={purchase.id} purchase={purchase} />
      ))}
    </div>
  );
}

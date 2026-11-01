import { useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
import type { FinanceCard } from '../../lib/finance-api';
import { useArchiveFinanceCard } from '../../lib/finance-hooks';
import { formatCurrencyFromCents } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CreditCardPanelProps {
  card: FinanceCard;
  onNewPurchase: (cardId: string) => void;
}

export function CreditCardPanel({ card, onNewPurchase }: CreditCardPanelProps) {
  const archiveCard = useArchiveFinanceCard();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usagePercent =
    card.limitCents > 0
      ? Math.min(100, Math.round((card.usedLimitCents / card.limitCents) * 100))
      : 0;

  async function archive() {
    setError(null);

    try {
      await archiveCard.mutateAsync(card.id);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível arquivar o cartão.',
      );
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 break-words text-sm font-semibold">
            <CreditCard size={15} aria-hidden="true" />
            {card.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {card.institution ?? 'Cartão do casal'}
            {card.holderName ? ` · ${card.holderName}` : ' · Casal'}
          </p>
        </div>

        <Button
          variant="ghost"
          className="min-h-8 shrink-0 px-2 py-1 text-xs"
          onClick={() => setConfirmingArchive(true)}
          aria-label={`Arquivar cartão ${card.name}`}
        >
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="inset rounded-[var(--radius-sm)] p-2.5">
          <dt className="text-[var(--muted)]">Limite disponível</dt>
          <dd className="mt-1 text-base font-bold">
            {formatCurrencyFromCents(card.availableLimitCents)}
          </dd>
        </div>
        <div className="inset rounded-[var(--radius-sm)] p-2.5">
          <dt className="text-[var(--muted)]">Em uso</dt>
          <dd className="mt-1 text-base font-bold">
            {formatCurrencyFromCents(card.usedLimitCents)}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"
          role="progressbar"
          aria-valuenow={usagePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Uso do limite do cartão"
        >
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span>
            Fecha dia {card.closingDay} · vence dia {card.dueDay}
          </span>
          <span>Limite {formatCurrencyFromCents(card.limitCents)}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Pagamento:{' '}
        {card.paymentAccountName ?? 'definir na hora de pagar a fatura'}
      </p>

      <div className="mt-3">
        <Button
          variant="soft"
          className="min-h-8 w-full px-2 py-1 text-xs"
          onClick={() => onNewPurchase(card.id)}
        >
          <Plus size={14} aria-hidden="true" />
          Nova compra neste cartão
        </Button>
      </div>

      {confirmingArchive && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5">
          <Badge variant="danger">Arquivar este cartão?</Badge>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => setConfirmingArchive(false)}
            >
              <X size={14} aria-hidden="true" />
              Não
            </Button>
            <Button
              variant="primary"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => void archive()}
              disabled={archiveCard.isPending}
            >
              Arquivar
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

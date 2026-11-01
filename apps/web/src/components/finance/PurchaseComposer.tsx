import { useState, type FormEvent } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type {
  FinanceCard,
  FinanceCategory,
  FinancePurchaseInput,
} from '../../lib/finance-api';
import { parseAmountToCents } from '../../lib/finance-format';
import { useCreateFinancePurchase } from '../../lib/finance-hooks';
import { ApiError } from '../../lib/http';
import { formatDate, todayIso } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface PurchaseComposerProps {
  cards: FinanceCard[];
  categories: FinanceCategory[];
  members: SpaceMember[];
  cardId: string;
  onCardChange: (cardId: string) => void;
}

export function PurchaseComposer({
  cards,
  categories,
  members,
  cardId,
  onCardChange,
}: PurchaseComposerProps) {
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [installments, setInstallments] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(() => todayIso());
  const [firstDueDate, setFirstDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const createPurchase = useCreateFinancePurchase();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const expenseCategories = categories.filter(
    (category) => category.kind === 'expense',
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!cardId) {
      setError('Escolha um cartão.');
      return;
    }

    if (!categoryId) {
      setError('Escolha uma categoria.');
      return;
    }

    const totalCents = parseAmountToCents(total);

    if (totalCents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    try {
      const input: FinancePurchaseInput = {
        description: description.trim(),
        totalCents,
        installmentsCount: Number(installments),
        purchaseDate,
        firstDueDate: firstDueDate || null,
        categoryId,
        responsibleUserId: responsible || null,
        notes: notes.trim() || null,
      };

      const created = await createPurchase.mutateAsync({ cardId, input });

      setFeedback(
        `Compra registrada: ${created.installmentsCount}x na fatura de ${formatDate(
          created.firstDueDate,
        )}.`,
      );
      setDescription('');
      setTotal('');
      setInstallments('1');
      setFirstDueDate('');
      setNotes('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível registrar a compra.',
      );
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <p className="eyebrow">Compra no cartão</p>
        <h3 className="section-title mt-1">Registrar compra parcelada</h3>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="field-label" htmlFor="purchase-card">
              Cartão
            </label>
            <select
              id="purchase-card"
              className="input"
              value={cardId}
              onChange={(event) => onCardChange(event.target.value)}
            >
              <option value="">Selecione</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-description">
              Descrição
            </label>
            <input
              id="purchase-description"
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: geladeira"
              maxLength={200}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-total">
              Valor total (R$)
            </label>
            <input
              id="purchase-total"
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-installments">
              Parcelas
            </label>
            <input
              id="purchase-installments"
              className="input"
              type="number"
              min="1"
              max="48"
              value={installments}
              onChange={(event) => setInstallments(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-date">
              Data da compra
            </label>
            <input
              id="purchase-date"
              className="input"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-first-due">
              Primeira parcela (opcional)
            </label>
            <input
              id="purchase-first-due"
              className="input"
              type="date"
              value={firstDueDate}
              onChange={(event) => setFirstDueDate(event.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Em branco: aloca automaticamente pela data de fechamento.
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-category">
              Categoria
            </label>
            <select
              id="purchase-category"
              className="input"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Selecione</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="purchase-responsible">
              Responsável
            </label>
            <select
              id="purchase-responsible"
              className="input"
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
            >
              <option value="">Casal (sem responsável)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="field sm:col-span-2">
            <label className="field-label" htmlFor="purchase-notes">
              Observações
            </label>
            <textarea
              id="purchase-notes"
              className="input min-h-20"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
            />
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {feedback && (
          <p className="text-sm text-[var(--success)]" role="status">
            {feedback}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createPurchase.isPending || !cardId}
          >
            <ShoppingCart size={17} aria-hidden="true" />
            {createPurchase.isPending ? 'Registrando...' : 'Registrar compra'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

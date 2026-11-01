import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceTransaction,
  FinanceTransactionInput,
  FinanceTransactionType,
} from '../../lib/finance-api';
import {
  centsToInputValue,
  parseAmountToCents,
} from '../../lib/finance-format';
import { todayIso } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Button } from '../ui/Button';

interface TransactionFormProps {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  members: SpaceMember[];
  initial?: FinanceTransaction;
  submitLabel: string;
  onSubmit: (input: FinanceTransactionInput) => Promise<void>;
  onCancel?: () => void;
}

const TYPE_OPTIONS: { value: FinanceTransactionType; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
];

export function TransactionForm({
  accounts,
  categories,
  members,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<FinanceTransactionType>(
    initial?.type ?? 'expense',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(
    initial ? centsToInputValue(initial.amountCents) : '',
  );
  const [competenceDate, setCompetenceDate] = useState(
    initial?.competenceDate ?? todayIso(),
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [settled, setSettled] = useState(
    initial
      ? initial.status === 'paid' || initial.status === 'received'
      : false,
  );
  const [paymentDate, setPaymentDate] = useState(
    initial?.paymentDate ?? todayIso(),
  );
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts[0]?.id ?? '',
  );
  const [transferAccountId, setTransferAccountId] = useState(
    initial?.transferAccountId ?? '',
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [responsible, setResponsible] = useState(
    initial?.responsibleUserId ?? '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const categoryKind = type === 'income' ? 'income' : 'expense';
  const filteredCategories = categories.filter(
    (category) => category.kind === categoryKind,
  );

  // Mantém a primeira conta como padrão sem sincronizar estado em efeito.
  const selectedAccountId = accountId || accounts[0]?.id || '';
  const selectedCategoryId = filteredCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountCents = parseAmountToCents(amount);
    const effectiveAccountId = accountId || accounts[0]?.id || '';
    const effectiveCategoryId = filteredCategories.some(
      (category) => category.id === categoryId,
    )
      ? categoryId
      : '';

    if (!description.trim()) {
      setError('Informe a descrição da transação.');
      return;
    }

    if (amountCents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    if (!effectiveAccountId) {
      setError('Selecione a conta da transação.');
      return;
    }

    if (type === 'transfer') {
      if (!transferAccountId) {
        setError('Selecione a conta de destino.');
        return;
      }

      if (transferAccountId === effectiveAccountId) {
        setError('A conta de destino precisa ser diferente da origem.');
        return;
      }
    } else if (!effectiveCategoryId) {
      setError('Selecione uma categoria.');
      return;
    }

    const status =
      type === 'income'
        ? settled
          ? 'received'
          : 'planned'
        : settled
          ? 'paid'
          : type === 'expense'
            ? 'pending'
            : 'pending';

    try {
      await onSubmit({
        type,
        description: description.trim(),
        amountCents,
        competenceDate,
        dueDate: dueDate || null,
        paymentDate: settled ? paymentDate || todayIso() : null,
        status,
        categoryId: type === 'transfer' ? null : effectiveCategoryId,
        accountId: effectiveAccountId,
        transferAccountId: type === 'transfer' ? transferAccountId : null,
        responsibleUserId: responsible || null,
        notes: notes.trim() || null,
      });

      if (!initial) {
        setDescription('');
        setAmount('');
        setDueDate('');
        setSettled(false);
        setPaymentDate(todayIso());
        setNotes('');
      }
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível salvar a transação.',
      );
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="field">
        <span className="field-label">Tipo</span>
        <div className="segmented" role="group" aria-label="Tipo da transação">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-active={type === option.value}
              aria-pressed={type === option.value}
              onClick={() => {
                setType(option.value);
                setCategoryId('');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="field">
          <label className="field-label" htmlFor={`tx-description-${initial?.id ?? 'new'}`}>
            Descrição
          </label>
          <input
            id={`tx-description-${initial?.id ?? 'new'}`}
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: mercado da semana"
            maxLength={200}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`tx-amount-${initial?.id ?? 'new'}`}>
            Valor (R$)
          </label>
          <input
            id={`tx-amount-${initial?.id ?? 'new'}`}
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="field">
          <label
            className="field-label"
            htmlFor={`tx-competence-${initial?.id ?? 'new'}`}
          >
            Competência
          </label>
          <input
            id={`tx-competence-${initial?.id ?? 'new'}`}
            className="input"
            type="date"
            value={competenceDate}
            onChange={(event) => setCompetenceDate(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label
            className="field-label"
            htmlFor={`tx-due-${initial?.id ?? 'new'}`}
          >
            Vencimento (opcional)
          </label>
          <input
            id={`tx-due-${initial?.id ?? 'new'}`}
            className="input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <div className="field">
          <label
            className="field-label"
            htmlFor={`tx-account-${initial?.id ?? 'new'}`}
          >
            {type === 'transfer' ? 'Conta de origem' : 'Conta'}
          </label>
          <select
            id={`tx-account-${initial?.id ?? 'new'}`}
            className="input"
            value={selectedAccountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              if (transferAccountId === event.target.value) {
                setTransferAccountId('');
              }
            }}
          >
            <option value="">Selecione</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {type === 'transfer' ? (
          <div className="field">
            <label
              className="field-label"
              htmlFor={`tx-transfer-account-${initial?.id ?? 'new'}`}
            >
              Conta de destino
            </label>
            <select
              id={`tx-transfer-account-${initial?.id ?? 'new'}`}
              className="input"
              value={transferAccountId}
              onChange={(event) => setTransferAccountId(event.target.value)}
            >
              <option value="">Selecione</option>
              {accounts
                .filter((account) => account.id !== selectedAccountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label
              className="field-label"
              htmlFor={`tx-category-${initial?.id ?? 'new'}`}
            >
              Categoria
            </label>
            <select
              id={`tx-category-${initial?.id ?? 'new'}`}
              className="input"
              value={selectedCategoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Selecione</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label
            className="field-label"
            htmlFor={`tx-responsible-${initial?.id ?? 'new'}`}
          >
            Responsável
          </label>
          <select
            id={`tx-responsible-${initial?.id ?? 'new'}`}
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

        <div className="field">
          <label
            className="field-label"
            htmlFor={`tx-notes-${initial?.id ?? 'new'}`}
          >
            Observações (opcional)
          </label>
          <input
            id={`tx-notes-${initial?.id ?? 'new'}`}
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settled}
            onChange={(event) => setSettled(event.target.checked)}
          />
          {type === 'income'
            ? 'Já foi recebido'
            : type === 'expense'
              ? 'Já foi pago'
              : 'Já foi transferido'}
        </label>

        {settled && (
          <div className="field min-w-40">
            <label
              className="field-label"
              htmlFor={`tx-payment-${initial?.id ?? 'new'}`}
            >
              Data de pagamento
            </label>
            <input
              id={`tx-payment-${initial?.id ?? 'new'}`}
              className="input"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit">
          <Check size={17} aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

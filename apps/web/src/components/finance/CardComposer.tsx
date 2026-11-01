import { useState, type FormEvent } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type { FinanceAccount } from '../../lib/finance-api';
import { parseAmountToCents } from '../../lib/finance-format';
import { useCreateFinanceCard } from '../../lib/finance-hooks';
import { ApiError } from '../../lib/http';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CardComposerProps {
  accounts: FinanceAccount[];
  members: SpaceMember[];
}

export function CardComposer({ accounts, members }: CardComposerProps) {
  const createCard = useCreateFinanceCard();

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [holder, setHolder] = useState('');
  const [limit, setLimit] = useState('0.00');
  const [closingDay, setClosingDay] = useState('20');
  const [dueDay, setDueDay] = useState('28');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome do cartão.');
      return;
    }

    try {
      await createCard.mutateAsync({
        name: name.trim(),
        institution: institution.trim() || null,
        holderUserId: holder || null,
        limitCents: parseAmountToCents(limit),
        closingDay: Number(closingDay),
        dueDay: Number(dueDay),
        paymentAccountId: paymentAccount || null,
      });

      setName('');
      setInstitution('');
      setHolder('');
      setLimit('0.00');
      setClosingDay('20');
      setDueDay('28');
      setPaymentAccount('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível criar o cartão.',
      );
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Novo cartão</p>
          <h2 className="section-title mt-1">Cartão de crédito do casal</h2>
        </div>
        <span className="text-xs text-[var(--muted)]">Visível ao casal</span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="field-label" htmlFor="card-name">
              Nome do cartão
            </label>
            <input
              id="card-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: cartão principal"
              maxLength={120}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-institution">
              Instituição
            </label>
            <input
              id="card-institution"
              className="input"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="Ex.: banco, bandeira"
              maxLength={120}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-holder">
              Titular
            </label>
            <select
              id="card-holder"
              className="input"
              value={holder}
              onChange={(event) => setHolder(event.target.value)}
            >
              <option value="">Casal (sem titular)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-limit">
              Limite (R$)
            </label>
            <input
              id="card-limit"
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-closing-day">
              Dia de fechamento
            </label>
            <input
              id="card-closing-day"
              className="input"
              type="number"
              min="1"
              max="31"
              value={closingDay}
              onChange={(event) => setClosingDay(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-due-day">
              Dia de vencimento
            </label>
            <input
              id="card-due-day"
              className="input"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(event) => setDueDay(event.target.value)}
              required
            />
          </div>

          <div className="field sm:col-span-2">
            <label className="field-label" htmlFor="card-payment-account">
              Conta de pagamento da fatura
            </label>
            <select
              id="card-payment-account"
              className="input"
              value={paymentAccount}
              onChange={(event) => setPaymentAccount(event.target.value)}
            >
              <option value="">Escolher ao pagar</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={createCard.isPending}>
            <Plus size={17} aria-hidden="true" />
            {createCard.isPending ? 'Criando...' : 'Criar cartão'}
          </Button>
        </div>

        {accounts.length === 0 && (
          <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <CreditCard size={14} aria-hidden="true" />
            Crie uma conta antes para vincular o pagamento da fatura.
          </p>
        )}
      </form>
    </Card>
  );
}

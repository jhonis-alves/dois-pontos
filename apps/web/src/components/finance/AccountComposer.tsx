import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type { AccountType } from '../../lib/finance-api';
import { ACCOUNT_TYPE_LABELS, parseAmountToCents } from '../../lib/finance-format';
import { useCreateFinanceAccount } from '../../lib/finance-hooks';
import { ApiError } from '../../lib/http';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AccountComposerProps {
  members: SpaceMember[];
}

export function AccountComposer({ members }: AccountComposerProps) {
  const createAccount = useCreateFinanceAccount();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [holder, setHolder] = useState('');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome da conta.');
      return;
    }

    try {
      await createAccount.mutateAsync({
        name: name.trim(),
        type,
        holderUserId: holder || null,
        initialBalanceCents: parseAmountToCents(initialBalance),
      });

      setName('');
      setType('checking');
      setHolder('');
      setInitialBalance('0.00');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível criar a conta.',
      );
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Nova conta</p>
          <h2 className="section-title mt-1">Onde o dinheiro fica?</h2>
        </div>
        <span className="text-xs text-[var(--muted)]">Visível ao casal</span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="field-label" htmlFor="account-name">
              Nome da conta
            </label>
            <input
              id="account-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: conta do casal"
              maxLength={120}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="account-type">
              Tipo
            </label>
            <select
              id="account-type"
              className="input"
              value={type}
              onChange={(event) => setType(event.target.value as AccountType)}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="account-holder">
              Titular
            </label>
            <select
              id="account-holder"
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
            <label className="field-label" htmlFor="account-initial-balance">
              Saldo inicial (R$)
            </label>
            <input
              id="account-initial-balance"
              className="input"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(event) => setInitialBalance(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={createAccount.isPending}>
            <Plus size={17} aria-hidden="true" />
            {createAccount.isPending ? 'Criando...' : 'Criar conta'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

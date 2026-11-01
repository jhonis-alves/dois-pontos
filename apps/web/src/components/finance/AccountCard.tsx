import { useState, type FormEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type { AccountType, FinanceAccount } from '../../lib/finance-api';
import {
  ACCOUNT_TYPE_LABELS,
  centsToInputValue,
  parseAmountToCents,
} from '../../lib/finance-format';
import {
  useArchiveFinanceAccount,
  useUpdateFinanceAccount,
} from '../../lib/finance-hooks';
import { formatCurrencyFromCents } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AccountCardProps {
  account: FinanceAccount;
  members: SpaceMember[];
}

export function AccountCard({ account, members }: AccountCardProps) {
  const updateAccount = useUpdateFinanceAccount();
  const archiveAccount = useArchiveFinanceAccount();

  const [editing, setEditing] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [holder, setHolder] = useState(account.holderUserId ?? '');
  const [initialBalance, setInitialBalance] = useState(
    centsToInputValue(account.initialBalanceCents),
  );
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(account.name);
    setType(account.type);
    setHolder(account.holderUserId ?? '');
    setInitialBalance(centsToInputValue(account.initialBalanceCents));
    setEditing(true);
    setError(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await updateAccount.mutateAsync({
        accountId: account.id,
        input: {
          name: name.trim(),
          type,
          holderUserId: holder || null,
          initialBalanceCents: parseAmountToCents(initialBalance),
        },
      });
      setEditing(false);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível salvar a conta.',
      );
    }
  }

  async function archive() {
    setError(null);
    try {
      await archiveAccount.mutateAsync(account.id);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível arquivar a conta.',
      );
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">{account.name}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {ACCOUNT_TYPE_LABELS[account.type]}
            {account.holderName ? ` · ${account.holderName}` : ' · Casal'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={startEditing}
            aria-label={`Editar conta ${account.name}`}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className="min-h-8 px-2 py-1 text-xs"
            onClick={() => setConfirmingArchive(true)}
            aria-label={`Arquivar conta ${account.name}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="inset rounded-[var(--radius-sm)] p-2.5">
          <dt className="text-[var(--muted)]">Saldo atual</dt>
          <dd className="mt-1 text-base font-bold">
            {formatCurrencyFromCents(account.balanceCents)}
          </dd>
        </div>
        <div className="inset rounded-[var(--radius-sm)] p-2.5">
          <dt className="text-[var(--muted)]">Previsto</dt>
          <dd className="mt-1 text-base font-bold">
            {formatCurrencyFromCents(account.projectedBalanceCents)}
          </dd>
        </div>
      </dl>

      {confirmingArchive && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5">
          <Badge variant="danger">Arquivar esta conta?</Badge>
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
              disabled={archiveAccount.isPending}
            >
              Arquivar
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
          onSubmit={saveEdit}
        >
          <div className="field">
            <label
              className="field-label"
              htmlFor={`account-edit-name-${account.id}`}
            >
              Nome
            </label>
            <input
              id={`account-edit-name-${account.id}`}
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label
                className="field-label"
                htmlFor={`account-edit-type-${account.id}`}
              >
                Tipo
              </label>
              <select
                id={`account-edit-type-${account.id}`}
                className="input"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as AccountType)
                }
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label
                className="field-label"
                htmlFor={`account-edit-holder-${account.id}`}
              >
                Titular
              </label>
              <select
                id={`account-edit-holder-${account.id}`}
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

            <div className="field sm:col-span-2">
              <label
                className="field-label"
                htmlFor={`account-edit-balance-${account.id}`}
              >
                Saldo inicial (R$)
              </label>
              <input
                id={`account-edit-balance-${account.id}`}
                className="input"
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(event) => setInitialBalance(event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => setEditing(false)}
            >
              <X size={14} aria-hidden="true" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-8 px-2 py-1 text-xs"
              disabled={updateAccount.isPending}
            >
              Salvar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="form-error mt-3" role="alert">
          {error}
        </div>
      )}
    </Card>
  );
}

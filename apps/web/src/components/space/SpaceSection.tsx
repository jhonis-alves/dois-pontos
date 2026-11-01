import { useState, type FormEvent } from 'react';
import { Check, Copy, Link2, Trash2, UserPlus } from 'lucide-react';
import { useCreateInvite, useRevokeInvite, useSpaceDetails } from '../../lib/auth-hooks';
import { formatDate } from '../../lib/format';
import { ApiError } from '../../lib/http';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function SpaceSection() {
  const spaceQuery = useSpaceDetails();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();

  const [email, setEmail] = useState('');
  const [days, setDays] = useState(7);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdExpiresAt, setCreatedExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (spaceQuery.isLoading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted)]">Carregando espaço...</p>
      </Card>
    );
  }

  if (spaceQuery.isError || !spaceQuery.data) {
    return (
      <Card className="p-6">
        <div className="form-error" role="alert">
          Não foi possível carregar o espaço do casal.
        </div>
      </Card>
    );
  }

  const { space, members, invites } = spaceQuery.data;
  const isFull = members.length >= 2;
  const activeInvites = invites.filter((invite) => invite.status === 'valid');

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);

    try {
      const result = await createInvite.mutateAsync({
        email: email.trim() || undefined,
        expiresInDays: days,
      });
      setCreatedUrl(`${window.location.origin}${result.invite.url}`);
      setCreatedExpiresAt(result.invite.expiresAt);
      setEmail('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível gerar o convite.',
      );
    }
  }

  async function copyLink() {
    if (!createdUrl) return;

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard indisponível');
      }
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setError(null);
    } catch {
      setError(
        'Não foi possível copiar automaticamente. Selecione o link e copie manualmente.',
      );
    }
  }

  async function handleRevoke(inviteId: string) {
    setError(null);

    try {
      await revokeInvite.mutateAsync(inviteId);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível revogar o convite.',
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Espaço do casal</p>
          <h2 className="section-title mt-1">{space.name}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {members.length} de 2 membros ativos
          </p>
        </div>
        <Badge variant={isFull ? 'success' : 'warning'}>
          {isFull ? 'Completo' : 'Aguardando convite'}
        </Badge>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="inset flex items-center gap-3 rounded-[var(--radius-sm)] p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
              {member.displayName.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {member.displayName}
              </span>
              <span className="block text-xs text-[var(--muted)]">
                {member.role === 'owner' ? 'Criador do espaço' : 'Membro'}
              </span>
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="form-error mt-4" role="alert">
          {error}
        </div>
      )}

      {isFull ? (
        <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
          O espaço já possui duas pessoas ativas. Para trocar de membro, será
          necessário um fluxo de saída seguro, previsto para uma fase futura.
        </p>
      ) : (
        <>
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end"
            onSubmit={handleCreate}
          >
            <div className="field">
              <label className="field-label" htmlFor="invite-email-optional">
                E-mail do parceiro (opcional)
              </label>
              <input
                id="invite-email-optional"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Deixe em branco para gerar um link livre"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="invite-days">
                Validade
              </label>
              <select
                id="invite-days"
                className="input"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={1}>1 dia</option>
                <option value={3}>3 dias</option>
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </div>

            <Button type="submit" disabled={createInvite.isPending}>
              <UserPlus size={17} aria-hidden="true" />
              {createInvite.isPending ? 'Gerando...' : 'Gerar convite'}
            </Button>
          </form>

          {createdUrl && (
            <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-semibold">
                Link de uso único gerado. Envie para a outra pessoa:
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className="input"
                  readOnly
                  value={createdUrl}
                  onFocus={(event) => event.target.select()}
                  aria-label="Link do convite"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void copyLink()}
                  aria-label="Copiar link do convite"
                >
                  {copied ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Copy size={17} aria-hidden="true" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                O link expira em{' '}
                {createdExpiresAt ? formatDate(createdExpiresAt) : 'breve'}. Ele
                só pode ser usado uma vez.
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Convites ativos</h3>
        {activeInvites.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Nenhum convite ativo no momento.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {activeInvites.map((invite) => (
              <li
                key={invite.id}
                className="inset flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] p-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  <Link2
                    size={14}
                    className="shrink-0 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                  <span className="truncate font-semibold">
                    {invite.email ?? 'Link sem e-mail'}
                  </span>
                  <span className="text-[var(--muted)]">
                    expira em {formatDate(invite.expiresAt)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-8 px-2 py-1 text-xs"
                  onClick={() => void handleRevoke(invite.id)}
                  disabled={revokeInvite.isPending}
                  aria-label={`Revogar convite ${invite.email ?? 'sem e-mail'}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Revogar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        Convites expiram, são de uso único e podem ser revogados. Cada pessoa
        mantém sua própria conta e seus dados privados permanecem isolados.
      </p>
    </Card>
  );
}

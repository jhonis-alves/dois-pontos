import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import type { GenderPalette, InviteStatus } from '../lib/auth-api';
import { useAcceptInvite, useInvite, useSession } from '../lib/auth-hooks';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { ApiError } from '../lib/http';

const STATUS_MESSAGES: Record<Exclude<InviteStatus, 'valid'>, string> = {
  used: 'Este convite já foi utilizado.',
  revoked: 'Este convite foi revogado pelo criador.',
  expired: 'Este convite expirou. Peça um novo link.',
};

const PALETTE_OPTIONS: Array<{
  value: GenderPalette;
  label: string;
  swatch: string;
}> = [
  { value: 'male', label: 'Azul', swatch: 'bg-[#2563eb]' },
  { value: 'female', label: 'Ameixa', swatch: 'bg-[#a855f7]' },
];

export function InvitePage() {
  const { token = '' } = useParams();
  const inviteQuery = useInvite(token);
  const session = useSession();
  const accept = useAcceptInvite(token);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [genderPalette, setGenderPalette] = useState<GenderPalette>('male');
  const [error, setError] = useState<string | null>(null);

  if (inviteQuery.isLoading || session.isLoading) {
    return <FullPageLoader label="Verificando convite..." />;
  }

  if (inviteQuery.isError) {
    return (
      <AuthLayout
        title="Convite indisponível"
        description="Não foi possível carregar este convite. Ele pode ter sido removido ou o link está incorreto."
        footer={
          <Link
            to="/"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Voltar para o início
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Peça um novo link para a pessoa que criou o convite.
        </p>
      </AuthLayout>
    );
  }

  const invite = inviteQuery.data?.invite;

  if (!invite) {
    return <FullPageLoader label="Carregando convite..." />;
  }

  if (invite.status !== 'valid') {
    return (
      <AuthLayout
        title="Convite não disponível"
        description={`${invite.spaceName} · convite de ${invite.inviterName}`}
        footer={
          <Link
            to="/"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Ir para o início
          </Link>
        }
      >
        <div className="form-error" role="alert">
          {STATUS_MESSAGES[invite.status]}
        </div>
      </AuthLayout>
    );
  }

  const inviteEmail = invite.email;
  const effectiveEmail = inviteEmail ?? email;
  const emailTaken =
    accept.error instanceof ApiError && accept.error.code === 'EMAIL_TAKEN';

  async function handleAcceptExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await accept.mutateAsync({});
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível aceitar o convite.',
      );
    }
  }

  async function handleCreateAndAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      await accept.mutateAsync({
        displayName,
        email: effectiveEmail,
        password,
        genderPalette,
      });
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível aceitar o convite.',
      );
    }
  }

  const message = error ?? (emailTaken ? accept.error?.message : null);

  return (
    <AuthLayout
      title={`Convite para ${invite.spaceName}`}
      description={`${invite.inviterName} convidou você para compartilhar a rotina e as finanças.`}
      footer={
        session.data ? (
          <span>
            Conectado como{' '}
            <strong className="text-[var(--text)]">
              {session.data.user.displayName}
            </strong>
          </span>
        ) : (
          <span>
            Já tem conta?{' '}
            <Link
              to="/entrar"
              state={{ from: `/convite/${token}` }}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Entrar para aceitar
            </Link>
          </span>
        )
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="success">Convite válido</Badge>
        <Badge>Expira em {formatDate(invite.expiresAt)}</Badge>
        {inviteEmail && <Badge variant="primary">{inviteEmail}</Badge>}
      </div>

      {message && (
        <div className="form-error mb-4" role="alert">
          <span>
            {message}
            {emailTaken && (
              <>
                {' '}
                <Link
                  to="/entrar"
                  state={{ from: `/convite/${token}` }}
                  className="underline"
                >
                  Entrar
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      {session.data ? (
        <form onSubmit={handleAcceptExisting} className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Sua conta será vinculada ao espaço{' '}
            <strong className="text-[var(--text)]">{invite.spaceName}</strong>.
            Cada pessoa mantém seus dados privados isolados.
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={accept.isPending}
          >
            {accept.isPending ? 'Aceitando...' : 'Aceitar convite'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleCreateAndAccept}
          className="space-y-4"
          noValidate
        >
          <div className="field">
            <label className="field-label" htmlFor="invite-name">
              Seu nome
            </label>
            <input
              id="invite-name"
              className="input"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="invite-email">
              E-mail
            </label>
            <input
              id="invite-email"
              className="input"
              type="email"
              autoComplete="email"
              value={effectiveEmail}
              onChange={(event) => setEmail(event.target.value)}
              disabled={Boolean(inviteEmail)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="field-label" htmlFor="invite-password">
                Senha
              </label>
              <input
                id="invite-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="invite-confirm">
                Confirmar senha
              </label>
              <input
                id="invite-confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="field">
            <span className="field-label">Paleta inicial</span>
            <div
              className="segmented"
              role="group"
              aria-label="Paleta inicial"
            >
              {PALETTE_OPTIONS.map(({ value, label, swatch }) => (
                <button
                  key={value}
                  type="button"
                  data-active={genderPalette === value}
                  aria-pressed={genderPalette === value}
                  onClick={() => setGenderPalette(value)}
                >
                  <span
                    className={cn('h-3.5 w-3.5 rounded-full', swatch)}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={accept.isPending}
          >
            {accept.isPending
              ? 'Criando conta e aceitando...'
              : 'Criar conta e aceitar'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

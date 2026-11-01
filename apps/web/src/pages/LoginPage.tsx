import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useLogin } from '../lib/auth-hooks';
import { ApiError } from '../lib/http';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as LocationState | null)?.from ?? '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await login.mutateAsync({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível entrar. Tente novamente.',
      );
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta para organizar a rotina e as finanças do casal."
      footer={
        <span>
          Ainda não tem conta?{' '}
          <Link
            to="/cadastro"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Criar conta
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Senha
          </label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={login.isPending}
        >
          {login.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--muted)]">
        A recuperação de senha será habilitada quando o envio de e-mail estiver
        configurado. Nenhuma senha é armazenada no navegador.
      </div>
    </AuthLayout>
  );
}

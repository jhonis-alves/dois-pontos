import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useRegister } from '../lib/auth-hooks';
import type { GenderPalette } from '../lib/auth-api';
import { cn } from '../lib/cn';
import { ApiError } from '../lib/http';

const PALETTE_OPTIONS: Array<{
  value: GenderPalette;
  label: string;
  swatch: string;
}> = [
  { value: 'male', label: 'Azul', swatch: 'bg-[#2563eb]' },
  { value: 'female', label: 'Ameixa', swatch: 'bg-[#a855f7]' },
];

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [genderPalette, setGenderPalette] = useState<GenderPalette>('male');
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      await register.mutateAsync({
        displayName,
        email,
        password,
        genderPalette,
      });
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Não foi possível criar a conta. Tente novamente.',
      );
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      description="Seu espaço do casal é criado automaticamente. Depois você poderá convidar a outra pessoa."
      footer={
        <span>
          Já tem conta?{' '}
          <Link
            to="/entrar"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Entrar
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
          <label className="field-label" htmlFor="register-name">
            Nome de exibição
          </label>
          <input
            id="register-name"
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
          <label className="field-label" htmlFor="register-email">
            E-mail
          </label>
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="field-label" htmlFor="register-password">
              Senha
            </label>
            <input
              id="register-password"
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
            <label className="field-label" htmlFor="register-confirm">
              Confirmar senha
            </label>
            <input
              id="register-confirm"
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
          <div className="segmented" role="group" aria-label="Paleta inicial">
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
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Você pode trocar a paleta e o tema depois, em Configurações.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={register.isPending}
        >
          {register.isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  );
}

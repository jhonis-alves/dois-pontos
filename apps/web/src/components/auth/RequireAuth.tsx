import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../lib/auth-hooks';
import { Button } from '../ui/Button';
import { FullPageLoader } from '../ui/FullPageLoader';

/**
 * Bloqueia as rotas internas até existir uma sessão confirmada pela API.
 * A decisão de acesso aos dados continua sendo do servidor.
 */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.isLoading) {
    return <FullPageLoader label="Carregando sua sessão..." />;
  }

  if (session.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="card max-w-md p-6 text-center">
          <h1 className="section-title">Não foi possível carregar sua sessão</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Verifique se a API está em execução e tente novamente.
          </p>
          <Button className="mt-4" onClick={() => void session.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!session.data) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

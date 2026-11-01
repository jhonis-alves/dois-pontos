import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../../lib/auth-hooks';
import { FullPageLoader } from '../ui/FullPageLoader';

/** Mantém login e cadastro fora do alcance de quem já está autenticado. */
export function PublicOnly() {
  const session = useSession();

  if (session.isLoading) {
    return <FullPageLoader label="Verificando sessão..." />;
  }

  if (session.data) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

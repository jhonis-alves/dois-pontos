import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogout, useSession } from '../../lib/auth-hooks';

export function UserMenu() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  const user = session.data?.user;

  if (!user) return null;

  const initial = user.displayName.trim().charAt(0).toUpperCase() || '?';

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      navigate('/entrar', { replace: true });
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inset hidden h-9 items-center gap-2 rounded-full px-2.5 sm:flex"
        title={user.email}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">
          {initial}
        </span>
        <span className="max-w-[120px] truncate text-xs font-semibold">
          {user.displayName}
        </span>
      </span>

      <button
        type="button"
        className="icon-btn"
        onClick={() => void handleLogout()}
        aria-label="Sair da conta"
        title="Sair da conta"
        disabled={logout.isPending}
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

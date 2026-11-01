import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';
import { ContextSwitcher } from './ContextSwitcher';
import { HealthPill } from './HealthPill';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Topbar() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--border)]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:h-16 lg:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center lg:hidden"
          aria-label="Dois Pontos — ir para o dashboard"
        >
          <LogoMark size={30} />
        </Link>

        <div className="hidden min-w-0 lg:block">
          <ContextSwitcher />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <HealthPill />
          <ThemeToggle />
          <UserMenu />
          <Link
            to="/configuracoes"
            className="icon-btn"
            aria-label="Configurações"
            title="Configurações"
          >
            <Settings size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex px-3 pb-2 sm:px-4 lg:hidden">
        <ContextSwitcher fluid />
      </div>
    </header>
  );
}

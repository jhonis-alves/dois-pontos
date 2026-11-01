import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';
import { Button } from '../ui/Button';
import { NAV_ITEMS } from './nav-items';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 lg:flex"
      style={{ width: 'var(--dp-sidebar)' }}
      aria-label="Barra lateral"
    >
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Dois Pontos — ir para o dashboard"
        >
          <LogoMark size={32} />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-sm font-bold tracking-tight">
                Dois Pontos
              </span>
              <span className="mt-1 truncate text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                rotina &amp; finanças
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav
        className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-4"
        aria-label="Navegação principal"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="nav-link"
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <Icon size={19} aria-hidden="true" className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border)] p-3">
        {!collapsed && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="eyebrow">Fase 3 de 6</p>
            <p className="mt-1 text-xs font-semibold">Rotina concluída</p>
            <div className="progress-track mt-2 h-1.5" aria-hidden="true">
              <div className="progress-fill" style={{ width: '50%' }} />
            </div>
            <Link
              to="/configuracoes"
              className="mt-2 inline-block text-[11px] font-semibold text-[var(--primary)] hover:underline"
            >
              Ajustar aparência
            </Link>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
          {!collapsed && <span>Recolher</span>}
        </Button>
      </div>
    </aside>
  );
}

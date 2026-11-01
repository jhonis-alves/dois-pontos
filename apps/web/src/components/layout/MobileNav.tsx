import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { MOBILE_NAV_ITEMS } from './nav-items';

export function MobileNav() {
  return (
    <nav className="mobile-nav lg:hidden" aria-label="Navegação principal">
      <div className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[10px] font-semibold text-[var(--muted)] transition-colors',
                  isActive && 'text-[var(--primary)]',
                )
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

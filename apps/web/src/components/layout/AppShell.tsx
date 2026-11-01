import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { STORAGE_KEYS } from '../../context/PreferencesProvider';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.sidebar) === 'true';
  } catch {
    return false;
  }
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sidebar, String(collapsed));
    } catch {
      // Preferência não essencial.
    }
  }, [collapsed]);

  const shellStyle = {
    '--dp-sidebar': collapsed
      ? 'var(--sidebar-collapsed)'
      : 'var(--sidebar-width)',
  } as CSSProperties;

  return (
    <div style={shellStyle}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="transition-[padding-left] duration-200 lg:pl-[var(--dp-sidebar)]">
        <Topbar />
        <main
          id="conteudo"
          className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12"
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

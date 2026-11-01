import { Moon, Sun } from 'lucide-react';
import { usePreferences } from '../../context/preferences';

export function ThemeToggle() {
  const { resolvedMode, setMode } = usePreferences();
  const nextMode = resolvedMode === 'dark' ? 'light' : 'dark';
  const label =
    nextMode === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro';

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setMode(nextMode)}
      aria-label={label}
      title={label}
    >
      {resolvedMode === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}

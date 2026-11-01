import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PreferencesContext,
  type ActivePalette,
  type Palette,
  type ResolvedMode,
  type SpaceContext,
  type ThemeMode,
} from './preferences';

const STORAGE_KEYS = {
  mode: 'dp.theme-mode',
  palette: 'dp.palette',
  space: 'dp.space',
  sidebar: 'dp.sidebar-collapsed',
} as const;

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.mode);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Preferência indisponível (modo privado restritivo): usa padrão.
  }
  return 'auto';
}

function readPalette(): Palette {
  try {
    if (localStorage.getItem(STORAGE_KEYS.palette) === 'female') {
      return 'female';
    }
  } catch {
    // Ignora falha de leitura.
  }
  return 'male';
}

function readSpace(): SpaceContext {
  try {
    if (localStorage.getItem(STORAGE_KEYS.space) === 'shared') {
      return 'shared';
    }
  } catch {
    // Ignora falha de leitura.
  }
  return 'me';
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferências são opcionais; não interrompe o uso do app.
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [palette, setPaletteState] = useState<Palette>(readPalette);
  const [space, setSpaceState] = useState<SpaceContext>(readSpace);
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const resolvedMode: ResolvedMode =
    mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode;
  const activePalette: ActivePalette =
    space === 'shared' ? 'shared' : palette;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedMode;
    root.dataset.palette = activePalette;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const background = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (background) meta.setAttribute('content', background);
    }
  }, [resolvedMode, activePalette]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist(STORAGE_KEYS.mode, next);
  }, []);

  const setPalette = useCallback((next: Palette) => {
    setPaletteState(next);
    persist(STORAGE_KEYS.palette, next);
  }, []);

  const setSpace = useCallback((next: SpaceContext) => {
    setSpaceState(next);
    persist(STORAGE_KEYS.space, next);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      palette,
      space,
      resolvedMode,
      activePalette,
      setMode,
      setPalette,
      setSpace,
    }),
    [mode, palette, space, resolvedMode, activePalette, setMode, setPalette, setSpace],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export { STORAGE_KEYS };

import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Palette = 'male' | 'female';
export type SpaceContext = 'me' | 'shared';
export type ActivePalette = Palette | 'shared';
export type ResolvedMode = 'light' | 'dark';

export interface PreferencesValue {
  mode: ThemeMode;
  palette: Palette;
  space: SpaceContext;
  resolvedMode: ResolvedMode;
  activePalette: ActivePalette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: Palette) => void;
  setSpace: (space: SpaceContext) => void;
}

export const PreferencesContext = createContext<PreferencesValue | null>(null);

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);

  if (!value) {
    throw new Error(
      'usePreferences precisa ser usado dentro de PreferencesProvider.',
    );
  }

  return value;
}

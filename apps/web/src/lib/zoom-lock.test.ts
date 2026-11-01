import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStandaloneApp } from './zoom-lock';

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function setNavigatorStandalone(value: boolean): void {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value,
  });
}

function setDisplayModeStandalone(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList);
}

afterEach(() => {
  delete (window.navigator as NavigatorWithStandalone).standalone;
  vi.restoreAllMocks();
});

describe('isStandaloneApp', () => {
  it('detecta o PWA instalado pelo navegador do iOS', () => {
    setNavigatorStandalone(true);
    setDisplayModeStandalone(false);

    expect(isStandaloneApp()).toBe(true);
  });

  it('detecta o PWA instalado pelo display-mode', () => {
    setNavigatorStandalone(false);
    setDisplayModeStandalone(true);

    expect(isStandaloneApp()).toBe(true);
  });

  it('mantém o zoom liberado ao acessar pelo navegador', () => {
    setNavigatorStandalone(false);
    setDisplayModeStandalone(false);

    expect(isStandaloneApp()).toBe(false);
  });
});

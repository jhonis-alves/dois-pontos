import { HeartHandshake, UserRound } from 'lucide-react';
import { usePreferences } from '../../context/preferences';
import { cn } from '../../lib/cn';

interface ContextSwitcherProps {
  fluid?: boolean;
}

export function ContextSwitcher({ fluid = false }: ContextSwitcherProps) {
  const { space, setSpace } = usePreferences();

  return (
    <div
      className={cn('segmented', fluid && 'segmented-fluid')}
      role="group"
      aria-label="Contexto de dados"
    >
      <button
        type="button"
        data-active={space === 'me'}
        aria-pressed={space === 'me'}
        onClick={() => setSpace('me')}
        title="Meu Espaço: seus dados individuais"
      >
        <UserRound size={15} aria-hidden="true" />
        <span>Meu Espaço</span>
      </button>
      <button
        type="button"
        data-active={space === 'shared'}
        aria-pressed={space === 'shared'}
        onClick={() => setSpace('shared')}
        title="Nosso Espaço: dados compartilhados do casal"
      >
        <HeartHandshake size={15} aria-hidden="true" />
        <span>Nosso Espaço</span>
      </button>
    </div>
  );
}

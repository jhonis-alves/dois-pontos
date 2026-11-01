import { useId } from 'react';
import { cn } from '../../lib/cn';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Identidade provisória do Dois Pontos: duas pessoas (pontos) conectadas.
 * Substituir pelo arquivo oficial quando a logo definitiva estiver disponível.
 */
export function LogoMark({ size = 36, className }: LogoMarkProps) {
  const rawId = useId();
  const gradientId = `dp-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <path
        d="M16 31.5 32 16.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="14.5" cy="33.5" r="7.5" fill="#2563EB" />
      <circle cx="33.5" cy="14.5" r="7.5" fill="#A855F7" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 36, withWordmark = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[0.98rem] font-bold tracking-tight text-[var(--text)]">
            Dois Pontos
          </span>
          <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            rotina &amp; finanças
          </span>
        </span>
      )}
    </span>
  );
}

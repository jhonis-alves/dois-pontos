import type { ReactNode } from 'react';
import { Logo } from '../brand/Logo';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--primary) 14%, transparent), transparent), var(--bg)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={42} />
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="page-title text-[1.55rem]">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-4 text-center text-sm text-[var(--muted)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

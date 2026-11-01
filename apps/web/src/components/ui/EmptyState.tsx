import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <span className="inset mb-4 flex h-12 w-12 items-center justify-center rounded-full text-[var(--primary)]">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

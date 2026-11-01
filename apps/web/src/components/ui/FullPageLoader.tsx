interface FullPageLoaderProps {
  label?: string;
}

export function FullPageLoader({
  label = 'Carregando...',
}: FullPageLoaderProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--muted)]" role="status">
          {label}
        </p>
      </div>
    </div>
  );
}

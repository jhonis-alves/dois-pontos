import { useHealth } from '../../lib/health';

export function HealthPill() {
  const { data, isError, isLoading } = useHealth();

  const status = isLoading ? 'pending' : isError || data?.status !== 'ok' ? 'offline' : 'online';
  const label =
    status === 'online'
      ? 'API e banco online'
      : status === 'offline'
        ? 'API offline'
        : 'Conectando…';

  return (
    <div
      className="inset flex h-9 items-center gap-2 rounded-full px-2.5"
      title={label}
      aria-label={label}
    >
      <span className="status-dot" data-status={status} aria-hidden="true" />
      <span className="hidden text-[11px] font-semibold text-[var(--muted)] md:inline">
        {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Conectando'}
      </span>
    </div>
  );
}

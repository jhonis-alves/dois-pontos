import type { LucideIcon } from 'lucide-react';
import { Badge } from './Badge';
import { Card } from './Card';

interface PhaseNoticeProps {
  icon: LucideIcon;
  phase: string;
  title: string;
  description: string;
  items?: string[];
}

/**
 * Bloco informativo para módulos cuja interface ainda não foi implementada.
 * Deixa explícito o que existe (banco/estrutura) e o que falta, sem simular dados.
 */
export function PhaseNotice({
  icon: Icon,
  phase,
  title,
  description,
  items = [],
}: PhaseNoticeProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="inset flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--primary)]">
          <Icon size={22} aria-hidden="true" />
        </span>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="section-title">{title}</h2>
            <Badge variant="primary">{phase}</Badge>
          </div>

          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>

          {items.length > 0 && (
            <ul className="grid gap-1.5 text-sm text-[var(--muted)] sm:grid-cols-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

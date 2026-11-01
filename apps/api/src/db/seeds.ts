import { randomUUID } from 'node:crypto';
import type { Db } from '../lib/db.js';

interface CategorySeed {
  domain: 'routine' | 'finance';
  kind: string;
  name: string;
  color: string;
}

const ROUTINE_SHARED: CategorySeed[] = [
  { domain: 'routine', kind: 'task', name: 'Casa e limpeza', color: '#0ea5e9' },
  { domain: 'routine', kind: 'task', name: 'Compras', color: '#22c55e' },
  { domain: 'routine', kind: 'task', name: 'Refeições', color: '#f59e0b' },
  { domain: 'routine', kind: 'task', name: 'Família', color: '#a855f7' },
  { domain: 'routine', kind: 'task', name: 'Lazer', color: '#ec4899' },
  { domain: 'routine', kind: 'task', name: 'Saúde', color: '#14b8a6' },
  { domain: 'routine', kind: 'task', name: 'Contas a pagar', color: '#ef4444' },
];

const ROUTINE_PRIVATE: CategorySeed[] = [
  { domain: 'routine', kind: 'task', name: 'Trabalho', color: '#3b82f6' },
  { domain: 'routine', kind: 'task', name: 'Estudos', color: '#8b5cf6' },
  { domain: 'routine', kind: 'task', name: 'Treino', color: '#10b981' },
  { domain: 'routine', kind: 'task', name: 'Pessoal', color: '#f97316' },
];

const FINANCE_EXPENSE: CategorySeed[] = [
  { domain: 'finance', kind: 'expense', name: 'Moradia', color: '#ef4444' },
  { domain: 'finance', kind: 'expense', name: 'Água', color: '#0ea5e9' },
  { domain: 'finance', kind: 'expense', name: 'Energia', color: '#f59e0b' },
  { domain: 'finance', kind: 'expense', name: 'Internet', color: '#6366f1' },
  { domain: 'finance', kind: 'expense', name: 'Alimentação', color: '#22c55e' },
  { domain: 'finance', kind: 'expense', name: 'Transporte', color: '#14b8a6' },
  { domain: 'finance', kind: 'expense', name: 'Saúde', color: '#ec4899' },
  { domain: 'finance', kind: 'expense', name: 'Lazer', color: '#a855f7' },
  { domain: 'finance', kind: 'expense', name: 'Educação', color: '#3b82f6' },
  { domain: 'finance', kind: 'expense', name: 'Assinaturas', color: '#f97316' },
  { domain: 'finance', kind: 'expense', name: 'Compras', color: '#84cc16' },
  { domain: 'finance', kind: 'expense', name: 'Outros', color: '#64748b' },
];

const FINANCE_INCOME: CategorySeed[] = [
  { domain: 'finance', kind: 'income', name: 'Salário', color: '#16a34a' },
  { domain: 'finance', kind: 'income', name: 'Renda extra', color: '#0d9488' },
  { domain: 'finance', kind: 'income', name: 'Freelance', color: '#2563eb' },
  { domain: 'finance', kind: 'income', name: 'Comissões', color: '#7c3aed' },
  { domain: 'finance', kind: 'income', name: 'Reembolsos', color: '#0891b2' },
  { domain: 'finance', kind: 'income', name: 'Outros', color: '#64748b' },
];

/**
 * Cria as categorias padrão de um espaço: as compartilhadas e as privadas
 * do membro que está sendo vinculado. O índice único garante idempotência.
 */
export function seedDefaultCategories(
  db: Db,
  params: { spaceId: string; userId: string; now?: string },
): void {
  const now = params.now ?? new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories
      (id, space_id, scope, owner_user_id, domain, kind, name, color, icon,
       is_default, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    const apply = (
      items: CategorySeed[],
      scope: 'shared' | 'private',
      ownerUserId: string | null,
    ) => {
      items.forEach((item, index) => {
        insert.run(
          randomUUID(),
          params.spaceId,
          scope,
          ownerUserId,
          item.domain,
          item.kind,
          item.name,
          item.color,
          index,
          now,
          now,
        );
      });
    };

    apply(ROUTINE_SHARED, 'shared', null);
    apply(FINANCE_EXPENSE, 'shared', null);
    apply(FINANCE_INCOME, 'shared', null);
    apply(ROUTINE_PRIVATE, 'private', params.userId);
    apply(FINANCE_EXPENSE, 'private', params.userId);
    apply(FINANCE_INCOME, 'private', params.userId);
  });

  insertMany();
}

import { ApiError } from './api-error.js';
import type { AuthContext } from './auth.js';

export type RecordScope = 'private' | 'shared';

export interface ScopedRecord {
  spaceId: string;
  scope: RecordScope;
  ownerUserId: string | null;
}

/**
 * Regra central de autorização por escopo. Deve ser usada no servidor por
 * qualquer rota que leia ou altere tarefas, eventos, transações etc.
 *
 * - Registros de outro espaço nunca são acessíveis.
 * - Registros compartilhados são acessíveis aos membros do espaço.
 * - Registros privados só são acessíveis ao próprio dono.
 */
export function canAccessScopedRecord(
  auth: AuthContext,
  record: ScopedRecord,
): boolean {
  if (record.spaceId !== auth.space.id) return false;
  if (record.scope === 'shared') return true;
  return record.ownerUserId === auth.user.id;
}

export function assertCanAccessScopedRecord(
  auth: AuthContext,
  record: ScopedRecord,
): void {
  if (!canAccessScopedRecord(auth, record)) {
    // 404 evita confirmar a existência de dados privados do parceiro.
    throw new ApiError(404, 'NOT_FOUND', 'Registro não encontrado.');
  }
}

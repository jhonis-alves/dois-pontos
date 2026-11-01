import { randomUUID } from 'node:crypto';
import type { Db } from './db.js';

interface ActivityParams {
  spaceId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
  now?: string;
}

/** Registra uma ação relevante sem incluir dados sensíveis desnecessários. */
export function logActivity(db: Db, params: ActivityParams): void {
  db.prepare(
    `INSERT INTO activity_log
       (id, space_id, actor_user_id, entity_type, entity_id, action, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    params.spaceId,
    params.actorUserId,
    params.entityType,
    params.entityId,
    params.action,
    JSON.stringify(params.metadata ?? {}),
    params.now ?? new Date().toISOString(),
  );
}

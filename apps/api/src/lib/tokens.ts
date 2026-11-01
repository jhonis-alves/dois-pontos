import { createHash, randomBytes } from 'node:crypto';

/** Gera um token opaco aleatório para sessões e convites. */
export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Guarda apenas o hash do token no banco; o valor bruto nunca é persistido. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

import { describe, expect, it } from 'vitest';
import { ApiError } from './lib/api-error.js';
import type { AuthContext } from './lib/auth.js';
import {
  assertCanAccessScopedRecord,
  canAccessScopedRecord,
} from './lib/scope.js';

function auth(userId: string, spaceId: string): AuthContext {
  return {
    user: {
      id: userId,
      email: `${userId}@exemplo.com`,
      displayName: userId,
      avatarUrl: null,
      genderPalette: 'female',
      themeMode: 'auto',
    },
    space: { id: spaceId, name: 'Nosso Espaço', role: 'member' },
    sessionId: `session-${userId}`,
  };
}

const ana = auth('ana', 'space-1');
const bia = auth('bia', 'space-1');

describe('autorização por escopo', () => {
  it('permite que ambos os membros acessem registros compartilhados do espaço', () => {
    const record = {
      spaceId: 'space-1',
      scope: 'shared' as const,
      ownerUserId: null,
    };

    expect(canAccessScopedRecord(ana, record)).toBe(true);
    expect(canAccessScopedRecord(bia, record)).toBe(true);
  });

  it('permite ao dono acessar o próprio registro privado', () => {
    const record = {
      spaceId: 'space-1',
      scope: 'private' as const,
      ownerUserId: 'ana',
    };

    expect(canAccessScopedRecord(ana, record)).toBe(true);
  });

  it('bloqueia o parceiro de acessar registro privado do outro', () => {
    const record = {
      spaceId: 'space-1',
      scope: 'private' as const,
      ownerUserId: 'ana',
    };

    expect(canAccessScopedRecord(bia, record)).toBe(false);
  });

  it('bloqueia registros de outro espaço, mesmo compartilhados', () => {
    const record = {
      spaceId: 'space-2',
      scope: 'shared' as const,
      ownerUserId: null,
    };

    expect(canAccessScopedRecord(ana, record)).toBe(false);
  });

  it('responde 404 ao negar acesso, sem revelar a existência do registro', () => {
    const record = {
      spaceId: 'space-1',
      scope: 'private' as const,
      ownerUserId: 'ana',
    };

    expect(() => assertCanAccessScopedRecord(ana, record)).not.toThrow();

    try {
      assertCanAccessScopedRecord(bia, record);
      expect.unreachable('deveria lançar erro');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    }
  });
});

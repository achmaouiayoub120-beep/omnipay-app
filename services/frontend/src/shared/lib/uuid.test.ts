import { describe, it, expect, afterEach, vi } from 'vitest';
import { uuid } from './uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renvoie un UUID v4 valide et unique', () => {
    const ids = new Set(Array.from({ length: 200 }, () => uuid()));
    expect(ids.size).toBe(200);
    ids.forEach((id) => expect(id).toMatch(UUID_V4));
  });

  it('fonctionne sans crypto.randomUUID (HTTP hors localhost : contexte non sécurisé)', () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => original.getRandomValues(a) } as unknown as Crypto);
    const id = uuid();
    expect(id).toMatch(UUID_V4);
    expect(uuid()).not.toBe(id);
  });
});

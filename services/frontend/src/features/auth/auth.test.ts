import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';

describe('Auth Store (In-Memory Session)', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with empty session', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
    expect(state.requiresMfa).toBe(false);
  });

  it('triggers MFA flow upon successful credentials submission', async () => {
    await useAuthStore.getState().login({ username: 'alice', password: 'password' });
    const state = useAuthStore.getState();
    expect(state.requiresMfa).toBe(true);
    expect(state.pendingUsername).toBe('alice');
    expect(state.isAuthenticated).toBe(false);
  });

  it('validates 6-digit MFA code and sets in-memory session', async () => {
    await useAuthStore.getState().login({ username: 'alice', password: 'password' });
    await useAuthStore.getState().verifyMfa('123456');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.requiresMfa).toBe(false);
    expect(state.session).not.toBeNull();
    expect(state.session?.username).toBe('alice');
    expect(state.session?.roles).toContain('ROLE_USER');
  });

  it('rejects invalid MFA code length', async () => {
    await useAuthStore.getState().login({ username: 'alice', password: 'password' });
    await expect(useAuthStore.getState().verifyMfa('123')).rejects.toThrow();
  });

  it('clears session on logout', async () => {
    await useAuthStore.getState().login({ username: 'alice', password: 'password' });
    await useAuthStore.getState().verifyMfa('123456');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
  });
});

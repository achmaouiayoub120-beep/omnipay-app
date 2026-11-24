import { describe, it, expect, beforeEach } from 'vitest';
import {
  canPerformTransfers,
  canManageCards,
  canAccessControlTower,
  hasRole,
  isAuditor,
  isAdmin,
  getRoleBadgeInfo,
} from './rbac';
import { useSecurityStore } from './security.store';
import { UserSession } from '../auth/auth.types';

describe('Security & RBAC Enforcement Engine', () => {
  const userSession: UserSession = {
    username: 'user',
    roles: ['ROLE_USER'],
    token: 'jwt-user-token',
    expiresAt: Date.now() + 900,
  };

  const auditorSession: UserSession = {
    username: 'auditor',
    roles: ['ROLE_AUDITOR'],
    token: 'jwt-auditor-token',
    expiresAt: Date.now() + 900,
  };

  const adminSession: UserSession = {
    username: 'admin',
    roles: ['ROLE_ADMIN'],
    token: 'jwt-admin-token',
    expiresAt: Date.now() + 900,
  };

  it('correctly evaluates role predicates', () => {
    expect(hasRole(userSession, 'ROLE_USER')).toBe(true);
    expect(hasRole(userSession, 'ROLE_ADMIN')).toBe(false);

    expect(isAuditor(auditorSession)).toBe(true);
    expect(isAuditor(userSession)).toBe(false);

    expect(isAdmin(adminSession)).toBe(true);
    expect(isAdmin(auditorSession)).toBe(false);
  });

  it('strictly prohibits transfer execution for ROLE_AUDITOR', () => {
    expect(canPerformTransfers(userSession)).toBe(true);
    expect(canPerformTransfers(adminSession)).toBe(true);
    // AUDITOR must never have transfer rights
    expect(canPerformTransfers(auditorSession)).toBe(false);
  });

  it('strictly prohibits card freezing/management for ROLE_AUDITOR', () => {
    expect(canManageCards(userSession)).toBe(true);
    expect(canManageCards(adminSession)).toBe(true);
    // AUDITOR must never manage cards
    expect(canManageCards(auditorSession)).toBe(false);
  });

  it('restricts Control Tower / Mode Jury access to ADMIN or demo mode', () => {
    expect(canAccessControlTower(adminSession)).toBe(true);
  });

  it('provides comprehensive role badge descriptions', () => {
    const adminInfo = getRoleBadgeInfo(['ROLE_ADMIN']);
    expect(adminInfo.primaryRole).toBe('ROLE_ADMIN');
    expect(adminInfo.label).toContain('Administrateur');

    const auditorInfo = getRoleBadgeInfo(['ROLE_AUDITOR']);
    expect(auditorInfo.primaryRole).toBe('ROLE_AUDITOR');
    expect(auditorInfo.label).toContain('Auditeur');

    const userInfo = getRoleBadgeInfo(['ROLE_USER']);
    expect(userInfo.primaryRole).toBe('ROLE_USER');
    expect(userInfo.label).toContain('Client');
  });

  describe('Security Store active sessions and audit logs', () => {
    beforeEach(() => {
      useSecurityStore.setState({
        filterSeverity: 'ALL',
        searchQuery: '',
      });
    });

    it('manages session revocation', () => {
      const initialCount = useSecurityStore.getState().activeSessions.length;
      expect(initialCount).toBeGreaterThan(1);

      const toRevoke = useSecurityStore.getState().activeSessions.find((s) => !s.isCurrent);
      if (toRevoke) {
        useSecurityStore.getState().revokeSession(toRevoke.id);
        const nextSessions = useSecurityStore.getState().activeSessions;
        expect(nextSessions.find((s) => s.id === toRevoke.id)).toBeUndefined();
      }
    });

    it('revokes all other non-current sessions in one action', () => {
      useSecurityStore.getState().revokeAllOtherSessions();
      const sessions = useSecurityStore.getState().activeSessions;
      expect(sessions.every((s) => s.isCurrent)).toBe(true);
    });

    it('filters audit logs by severity and search query', () => {
      useSecurityStore.getState().setFilterSeverity('CRITICAL');
      const filtered = useSecurityStore.getState().getFilteredLogs();
      expect(filtered.every((l) => l.severity === 'CRITICAL')).toBe(true);

      useSecurityStore.getState().setFilterSeverity('ALL');
      useSecurityStore.getState().setSearchQuery('Vault');
      const searchResults = useSecurityStore.getState().getFilteredLogs();
      expect(searchResults.some((l) => l.details.includes('Vault'))).toBe(true);
    });
  });
});

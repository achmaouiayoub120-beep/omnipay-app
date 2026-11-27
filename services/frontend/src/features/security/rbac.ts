/**
 * OmniPay Zero-Trust - Role-Based Access Control (RBAC) Guard Utilities
 * Strict client-side permission evaluation aligning with backend Spring Security.
 * Unauthorized elements are ABSENT from the DOM (never just disabled).
 */

import { Role, UserSession } from '../auth/auth.types';

export function hasRole(session: UserSession | null, role: Role): boolean {
  if (!session || !session.roles) return false;
  return session.roles.includes(role);
}

export function isAuditor(session: UserSession | null): boolean {
  return hasRole(session, 'ROLE_AUDITOR');
}

export function isAdmin(session: UserSession | null): boolean {
  return hasRole(session, 'ROLE_ADMIN');
}

/**
 * Checks if the current session has authority to create bank transfers.
 * ROLE_AUDITOR has strictly NO execution authority (read-only audit role).
 */
export function canPerformTransfers(session: UserSession | null): boolean {
  if (!session) return false;
  if (isAuditor(session)) return false;
  return hasRole(session, 'ROLE_USER') || hasRole(session, 'ROLE_ADMIN');
}

/**
 * Checks if the current session has authority to freeze, reveal, or manage payment cards.
 * ROLE_AUDITOR cannot freeze cards or alter card limits.
 */
export function canManageCards(session: UserSession | null): boolean {
  if (!session) return false;
  if (isAuditor(session)) return false;
  return hasRole(session, 'ROLE_USER') || hasRole(session, 'ROLE_ADMIN');
}

/**
 * Checks if the current session can access the DevSecOps Mode Jury / Control Tower.
 * Strictly reserved for ROLE_ADMIN (and demo mode evaluators).
 */
export function canAccessControlTower(session: UserSession | null): boolean {
  if (!session) return false;
  const isDemoMode =
    (import.meta as unknown as { env?: { VITE_DEMO_MODE?: string } }).env?.VITE_DEMO_MODE === 'true';
  return isAdmin(session) || isDemoMode;
}

/**
 * Helper to display human-friendly role information.
 */
export function getRoleBadgeInfo(roles: Role[] = []): {
  primaryRole: Role;
  label: string;
  badgeClass: string;
  description: string;
} {
  if (roles.includes('ROLE_ADMIN')) {
    return {
      primaryRole: 'ROLE_ADMIN',
      label: 'Administrateur Système (DevSecOps)',
      badgeClass: 'bg-gold-400/10 text-gold-400 border-gold-400/30',
      description: 'Accès complet au registre bancaire, Tour de Contrôle et injection de pannes canary.',
    };
  }

  if (roles.includes('ROLE_AUDITOR')) {
    return {
      primaryRole: 'ROLE_AUDITOR',
      label: 'Auditeur de Sécurité & Conformité',
      badgeClass: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
      description: 'Accès en lecture seule aux flux et traçabilité intégrale du journal eBPF/Vault.',
    };
  }

  return {
    primaryRole: 'ROLE_USER',
    label: 'Client Titulaire de Compte',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    description: 'Gestion des comptes personnels, virements instantanés et cartes physiques/virtuelles.',
  };
}

/**
 * OmniPay Zero-Trust - Security Store (Zustand)
 * Manages active sessions, trusted devices, and security audit log events.
 */

import { create } from 'zustand';
import {
  ActiveSession,
  AuditSeverity,
  SecurityAuditEvent,
  TrustedDevice,
} from './security.types';

const INITIAL_SESSIONS: ActiveSession[] = [
  {
    id: 'sess-current-01',
    deviceName: 'Poste de travail principal (Ce navigateur)',
    browser: 'Chrome 131 / Windows 11',
    os: 'Windows 11 Enterprise',
    ipAddress: '192.168.1.42 (Réseau local sécurisé)',
    location: 'Paris, France',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
    fingerprint: 'fp-sha256-8a9018f9204b',
  },
  {
    id: 'sess-mobile-02',
    deviceName: 'iPhone 15 Pro Max (Application OmniPay)',
    browser: 'OmniPay iOS 2.0.4',
    os: 'iOS 18.1',
    ipAddress: '82.64.120.91 (Orange 5G)',
    location: 'Boulogne-Billancourt, France',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    isCurrent: false,
    fingerprint: 'fp-sha256-4b2190ee8109',
  },
  {
    id: 'sess-laptop-03',
    deviceName: 'MacBook Pro M3 (Poste DevSecOps)',
    browser: 'Safari 18.0 / macOS Sonoma',
    os: 'macOS 14.6',
    ipAddress: '195.154.122.8 (VPN Wireguard ESTC)',
    location: 'La Défense, France',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isCurrent: false,
    fingerprint: 'fp-sha256-778210bf9821',
  },
];

const INITIAL_TRUSTED_DEVICES: TrustedDevice[] = [
  {
    id: 'dev-win-01',
    deviceName: 'Station de Travail Fixe Windows 11',
    registeredAt: '2026-09-15T08:30:00Z',
    trustScore: 99,
    biometricEnrolled: true,
    fingerprint: 'DEV-FINGERPRINT-W11-8921',
    status: 'TRUSTED',
  },
  {
    id: 'dev-iphone-02',
    deviceName: 'iPhone 15 Pro Max (Face ID Certifié)',
    registeredAt: '2026-10-02T14:15:00Z',
    trustScore: 97,
    biometricEnrolled: true,
    fingerprint: 'DEV-FINGERPRINT-IOS-4402',
    status: 'TRUSTED',
  },
  {
    id: 'dev-mac-03',
    deviceName: 'MacBook Pro 16" TouchID',
    registeredAt: '2026-10-20T10:00:00Z',
    trustScore: 95,
    biometricEnrolled: true,
    fingerprint: 'DEV-FINGERPRINT-MAC-7102',
    status: 'TRUSTED',
  },
];

const INITIAL_AUDIT_LOGS: SecurityAuditEvent[] = [
  {
    id: 'aud-9801',
    timestamp: new Date().toISOString(),
    eventType: 'AUTH_SESSION_VALIDATE',
    severity: 'INFO',
    actor: 'user (Ayoub Achmaoui)',
    ipAddress: '192.168.1.42',
    details: 'Jeton JWT Zero-Trust validé en mémoire. Chiffrement TLS 1.3 / mTLS actif.',
    status: 'SUCCESS',
  },
  {
    id: 'aud-9800',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    eventType: 'STEP_UP_MFA_CHALLENGE',
    severity: 'INFO',
    actor: 'user (Ayoub Achmaoui)',
    ipAddress: '192.168.1.42',
    details: 'Authentification forte SCA validée pour ordre de virement SEPA.',
    status: 'SUCCESS',
  },
  {
    id: 'aud-9799',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    eventType: 'TRANSFER_IDEMPOTENCY_VERIFIED',
    severity: 'INFO',
    actor: 'user (Ayoub Achmaoui)',
    ipAddress: '192.168.1.42',
    details: 'Virement de 150,00 € exécuté avec clé X-Idempotency-Key unique enregistrée.',
    status: 'SUCCESS',
  },
  {
    id: 'aud-9798',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    eventType: 'VAULT_SECRET_LEASE_RENEWAL',
    severity: 'INFO',
    actor: 'system (Vault Agent)',
    ipAddress: '10.244.1.15 (Cluster k3s)',
    details: 'Renouvellement automatique du bail de secrets Vault de signature JWT (TTL 30m).',
    status: 'SUCCESS',
  },
  {
    id: 'aud-9797',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    eventType: 'ANOMALY_RATE_LIMIT_PREVENTED',
    severity: 'WARNING',
    actor: 'unknown_scanner',
    ipAddress: '45.143.201.88',
    details: 'Tentatives répétées sur /api/auth/login ralenties et bloquées par le reverse-proxy.',
    status: 'BLOCKED',
  },
  {
    id: 'aud-9796',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    eventType: 'EBPF_FALCO_RULE_MATCH',
    severity: 'CRITICAL',
    actor: 'pod/transaction-service',
    ipAddress: '10.244.2.8',
    details: 'Sonde Falco eBPF : exécution de commande suspecte interceptée en sandbox.',
    status: 'FLAGGED',
  },
];

interface SecurityState {
  activeSessions: ActiveSession[];
  trustedDevices: TrustedDevice[];
  auditLogs: SecurityAuditEvent[];
  filterSeverity: AuditSeverity | 'ALL';
  searchQuery: string;

  // Actions
  revokeSession: (id: string) => void;
  revokeAllOtherSessions: () => void;
  setFilterSeverity: (sev: AuditSeverity | 'ALL') => void;
  setSearchQuery: (q: string) => void;
  addAuditLog: (event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>) => void;
  getFilteredLogs: () => SecurityAuditEvent[];
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  activeSessions: INITIAL_SESSIONS,
  trustedDevices: INITIAL_TRUSTED_DEVICES,
  auditLogs: INITIAL_AUDIT_LOGS,
  filterSeverity: 'ALL',
  searchQuery: '',

  revokeSession: (id: string) => {
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== id),
    }));
  },

  revokeAllOtherSessions: () => {
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.isCurrent),
    }));
  },

  setFilterSeverity: (sev) => set({ filterSeverity: sev }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addAuditLog: (event) => {
    const newLog: SecurityAuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    set((state) => ({
      auditLogs: [newLog, ...state.auditLogs],
    }));
  },

  getFilteredLogs: () => {
    const { auditLogs, filterSeverity, searchQuery } = get();

    return auditLogs.filter((log) => {
      if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.eventType.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.ipAddress.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  },
}));

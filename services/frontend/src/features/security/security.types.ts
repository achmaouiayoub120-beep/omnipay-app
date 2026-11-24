/**
 * OmniPay Zero-Trust - Security & RBAC Types
 * Strict typing for active sessions, trusted devices, and security audit logs.
 */

export interface ActiveSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
  fingerprint: string;
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  registeredAt: string;
  trustScore: number; // e.g. 98%
  biometricEnrolled: boolean;
  fingerprint: string;
  status: 'TRUSTED' | 'REVOKED';
}

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: AuditSeverity;
  actor: string;
  ipAddress: string;
  details: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
  metadata?: Record<string, string>;
}

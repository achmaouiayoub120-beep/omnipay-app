import React from 'react';
import {
  ShieldCheck,
  DeviceMobile,
  Lock,
  UserCheck,
  SignOut,
  Fingerprint,
  ShieldWarning,
  Key,
  Pulse,
} from '@phosphor-icons/react';
import { useSecurityStore } from '../security.store';
import { useAuthStore } from '../../auth/auth.store';
import { useJuryStore } from '../../jury/jury.store';
import { SessionCard } from './SessionCard';
import { AuditLogTable } from './AuditLogTable';
import { getRoleBadgeInfo } from '../rbac';
import { Role } from '../../auth/auth.types';
import { Card, Badge, Button } from '@/shared/ui';

export const SecurityCenter: React.FC = () => {
  const { session } = useAuthStore();
  const { activeSessions, trustedDevices, auditLogs, revokeSession, revokeAllOtherSessions } =
    useSecurityStore();
  const { metrics } = useJuryStore();

  const isDemoMode =
    (import.meta as unknown as { env?: { VITE_DEMO_MODE?: string } }).env?.VITE_DEMO_MODE === 'true';

  const roleInfo = getRoleBadgeInfo(session?.roles || ['ROLE_USER']);

  const handleSwitchDemoRole = (targetRole: Role) => {
    if (!session) return;
    useAuthStore.setState({
      session: {
        ...session,
        roles: [targetRole],
      },
    });
  };

  const otherSessionsCount = activeSessions.filter((s) => !s.isCurrent).length;
  const criticalCount = auditLogs.filter((l) => l.severity === 'CRITICAL').length;
  const warningCount = auditLogs.filter((l) => l.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <Card className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-400/10 text-gold-400 border border-gold-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="heading-6 text-platinum-50">
                Centre de commandement Zero-Trust
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${roleInfo.badgeClass}`}
              >
                {roleInfo.label}
              </span>
            </div>
            <p className="caption-2 text-platinum-400">
              Contrôle RBAC, surveillance eBPF Falco, sessions cryptographiques et journal d’audit immuable.
            </p>
          </div>
        </div>

        {/* Demo Mode Role Switcher */}
        {isDemoMode && (
          <div className="p-3 bg-obsidian-950 border border-obsidian-700/80 rounded-xl shrink-0">
            <span className="caption-3 text-gold-400 block mb-2">
              Simulateur de rôle RBAC (Jury ESTC)
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_USER')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors duration-300 active:scale-[0.98] cursor-pointer ${
                  session?.roles.includes('ROLE_USER') && !session?.roles.includes('ROLE_ADMIN')
                    ? 'bg-gold-400 text-obsidian-950'
                    : 'bg-obsidian-800 text-platinum-400 hover:text-platinum-50'
                }`}
              >
                ROLE_USER
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_AUDITOR')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors duration-300 active:scale-[0.98] cursor-pointer ${
                  session?.roles.includes('ROLE_AUDITOR')
                    ? 'bg-sky-500 text-white'
                    : 'bg-obsidian-800 text-platinum-400 hover:text-platinum-50'
                }`}
              >
                ROLE_AUDITOR
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_ADMIN')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors duration-300 active:scale-[0.98] cursor-pointer ${
                  session?.roles.includes('ROLE_ADMIN')
                    ? 'bg-crimson-500 text-white'
                    : 'bg-obsidian-800 text-platinum-400 hover:text-platinum-50'
                }`}
              >
                ROLE_ADMIN
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Enterprise Posture Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-700/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="caption-5 text-platinum-400">Surveillance runtime eBPF</span>
            <Pulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="title-1 font-mono tabular-nums text-emerald-500 font-semibold">
            {metrics.falco.status}
          </div>
          <p className="caption-5 text-platinum-500">
            {metrics.falco.alertsCount} alerte active · {metrics.kyverno.verifiedSignatureCount} images signées
          </p>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-700/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="caption-5 text-platinum-400">Incidents détectés</span>
            <ShieldWarning className={`w-4 h-4 ${criticalCount > 0 ? 'text-crimson-500' : 'text-gold-400'}`} />
          </div>
          <div className="title-1 font-mono tabular-nums text-platinum-50 font-semibold">
            {criticalCount} critique{criticalCount > 1 ? 's' : ''}
          </div>
          <p className="caption-5 text-platinum-500 tabular-nums">
            {warningCount} avertissement{warningCount > 1 ? 's' : ''} sur {auditLogs.length} événements
          </p>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-700/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="caption-5 text-platinum-400">Authentification & sessions</span>
            <Lock className="w-4 h-4 text-gold-400" />
          </div>
          <div className="title-1 font-mono tabular-nums text-platinum-50 font-semibold">
            {activeSessions.length} active{activeSessions.length > 1 ? 's' : ''}
          </div>
          <p className="caption-5 text-platinum-500 tabular-nums">
            {trustedDevices.length} clés matérielles FIDO2 enrôlées
          </p>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-700/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="caption-5 text-platinum-400">Bail Vault & PKI</span>
            <Key className="w-4 h-4 text-gold-400" />
          </div>
          <div className="title-1 font-mono tabular-nums text-platinum-50 font-semibold">
            {Math.floor(metrics.vault.leaseTtlSeconds / 60)}m {metrics.vault.leaseTtlSeconds % 60}s
          </div>
          <p className="caption-5 text-platinum-500 truncate font-mono">
            {metrics.vault.engine}
          </p>
        </div>
      </div>

      {/* Role explanation alert */}
      <div className="p-4 bg-obsidian-900/70 border border-obsidian-700/80 rounded-xl flex items-start gap-3 caption-2 text-platinum-200">
        <UserCheck className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div>
            <strong className="text-platinum-50">Privilèges actifs : </strong>
            <span className="text-platinum-400">{roleInfo.description}</span>
          </div>
          {session?.roles.includes('ROLE_AUDITOR') && (
            <p className="text-amber-500 caption-3">
              Mode Auditeur actif : les fonctionnalités transactionnelles (Virements, Gel/dégel de carte) sont retirées de l’interface conformément à la politique RBAC bancaire.
            </p>
          )}
        </div>
      </div>

      {/* Asymmetrical 12-Col Grid: Active Sessions (7) + Trusted Devices (5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Sessions (7/12) */}
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-obsidian-700/60">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-gold-400 shrink-0" />
              <div>
                <h3 className="title-3 text-platinum-50 font-semibold">
                  Activité d’authentification & sessions
                </h3>
                <p className="caption-5 text-platinum-400">
                  Périphériques authentifiés avec jetons JWT en mémoire.
                </p>
              </div>
            </div>

            {otherSessionsCount > 0 && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={revokeAllOtherSessions}
              >
                <SignOut className="w-4 h-4 shrink-0" />
                <span>Révoquer ({otherSessionsCount})</span>
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {activeSessions.map((sess) => (
              <SessionCard key={sess.id} session={sess} onRevoke={revokeSession} />
            ))}
          </div>
        </Card>

        {/* Trusted FIDO2 Devices (5/12) */}
        <Card variant="flat" className="lg:col-span-5 p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-obsidian-700/60">
            <DeviceMobile className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <h3 className="title-3 text-platinum-50 font-semibold">
                Appareils de confiance FIDO2
              </h3>
              <p className="caption-5 text-platinum-400">
                Clés WebAuthn associées à votre identité.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {trustedDevices.map((dev) => (
              <div
                key={dev.id}
                className="p-4 bg-obsidian-950/70 border border-obsidian-700/70 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="body-4 text-platinum-50">
                    {dev.deviceName}
                  </span>
                  <Badge variant="success" size="sm" className="font-mono tabular-nums">
                    Confiance {dev.trustScore}%
                  </Badge>
                </div>

                <div className="space-y-1.5 caption-5 text-platinum-400">
                  <div className="flex items-center justify-between">
                    <span>Enrôlement biométrique</span>
                    <span className="text-emerald-500 font-semibold">Actif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enregistré le</span>
                    <span className="text-platinum-200 font-mono tabular-nums">
                      {new Date(dev.registeredAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-obsidian-700/60 flex items-center justify-between caption-5 font-mono text-platinum-500">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-gold-400" />
                    Empreinte
                  </span>
                  <span className="tabular-nums">{dev.fingerprint}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Live Security Audit Trail */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-obsidian-700/60">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <h3 className="title-3 text-platinum-50 font-semibold">
                Journal d’audit de sécurité en temps réel
              </h3>
              <p className="caption-5 text-platinum-400">
                Chronologie des authentifications, signatures JWT et détections eBPF Falco.
              </p>
            </div>
          </div>
          <Badge variant="success" dot>
            Journal immuable vérifié
          </Badge>
        </div>

        <AuditLogTable />
      </Card>
    </div>
  );
};

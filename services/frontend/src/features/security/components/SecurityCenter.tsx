import React from 'react';
import {
  Shield,
  Smartphone,
  Lock,
  UserCheck,
  LogOut,
  Fingerprint,
} from 'lucide-react';
import { useSecurityStore } from '../security.store';
import { useAuthStore } from '../../auth/auth.store';
import { SessionCard } from './SessionCard';
import { AuditLogTable } from './AuditLogTable';
import { getRoleBadgeInfo } from '../rbac';
import { Role } from '../../auth/auth.types';

export const SecurityCenter: React.FC = () => {
  const { session } = useAuthStore();
  const { activeSessions, trustedDevices, revokeSession, revokeAllOtherSessions } =
    useSecurityStore();

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0B101E] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Centre de Sécurité & Audit Zero-Trust
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleInfo.badgeClass}`}
              >
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Contrôle strict des accès RBAC, sessions cryptographiques et traçabilité eBPF/Vault.
            </p>
          </div>
        </div>

        {/* Demo Mode Role Switcher */}
        {isDemoMode && (
          <div className="p-3 bg-[#070A12] border border-white/10 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)] block mb-1.5">
              Simulateur de Rôle (Jury ESTC)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_USER')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  session?.roles.includes('ROLE_USER') && !session?.roles.includes('ROLE_ADMIN')
                    ? 'bg-[var(--color-gold)] text-[#070A12]'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                ROLE_USER
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_AUDITOR')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  session?.roles.includes('ROLE_AUDITOR')
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                ROLE_AUDITOR
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('ROLE_ADMIN')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  session?.roles.includes('ROLE_ADMIN')
                    ? 'bg-[var(--color-crimson)] text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                ROLE_ADMIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role explanation alert */}
      <div className="p-4 bg-[#070A12] border border-white/10 rounded-2xl flex items-start gap-3 text-xs text-gray-300">
        <UserCheck className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Privilèges actifs : </span>
          <span>{roleInfo.description}</span>
          {session?.roles.includes('ROLE_AUDITOR') && (
            <p className="text-[var(--color-amber)] mt-1 font-semibold">
              Mode Auditeur actif : les fonctionnalités transactionnelles (Virements, Gel/dégel de carte) sont complètement retirées de l'interface conformément à la politique RBAC bancaire.
            </p>
          )}
        </div>
      </div>

      {/* Section 1: Active Sessions */}
      <div className="bg-[#0B101E] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-base font-bold text-white">Sessions Actives & Appareils</h3>
              <p className="text-xs text-gray-400">
                Périphériques actuellement authentifiés avec des jetons JWT en mémoire.
              </p>
            </div>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={revokeAllOtherSessions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--color-crimson)] bg-[var(--color-crimson)]/10 border border-[var(--color-crimson)]/20 hover:bg-[var(--color-crimson)]/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnecter toutes les autres sessions ({otherSessionsCount})</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {activeSessions.map((sess) => (
            <SessionCard key={sess.id} session={sess} onRevoke={revokeSession} />
          ))}
        </div>
      </div>

      {/* Section 2: Trusted Devices */}
      <div className="bg-[#0B101E] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Smartphone className="w-5 h-5 text-[var(--color-gold)]" />
          <div>
            <h3 className="text-base font-bold text-white">Appareils de Confiance Enrôlés</h3>
            <p className="text-xs text-gray-400">
              Clés cryptographiques FIDO2 / WebAuthn associées à votre profil.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trustedDevices.map((dev) => (
            <div
              key={dev.id}
              className="p-4 bg-[#070A12] border border-white/5 rounded-2xl space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-xs text-white block">
                  {dev.deviceName}
                </span>
                <span className="text-[10px] font-mono font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
                  {dev.trustScore}% SCORE
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Enrôlement biométrique</span>
                  <span className="text-[var(--color-emerald)] font-semibold">Actif</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Enregistré le</span>
                  <span className="text-gray-300">
                    {new Date(dev.registeredAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  <Fingerprint className="w-3 h-3 text-[var(--color-gold)]" />
                  Empreinte
                </span>
                <span>{dev.fingerprint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Live Security Audit Trail */}
      <div className="bg-[#0B101E] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-base font-bold text-white">
                Journal d'Audit de Sécurité en Temps Réel
              </h3>
              <p className="text-xs text-gray-400">
                Traçabilité des événements d'authentification, signatures JWT et sondes eBPF.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-2.5 py-1 rounded-full border border-[var(--color-emerald)]/20">
            IMMUTABLE AUDIT TRAIL
          </span>
        </div>

        <AuditLogTable />
      </div>
    </div>
  );
};

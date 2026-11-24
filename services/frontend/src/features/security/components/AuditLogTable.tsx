import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Search,
  Filter,
} from 'lucide-react';
import { useSecurityStore } from '../security.store';
import { AuditSeverity } from '../security.types';

const SEVERITY_CONFIG: Record<
  AuditSeverity,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  INFO: {
    label: 'Information',
    icon: Info,
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  WARNING: {
    label: 'Avertissement',
    icon: AlertTriangle,
    badgeClass: 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] border-[var(--color-amber)]/20',
  },
  CRITICAL: {
    label: 'Critique / Falco',
    icon: ShieldAlert,
    badgeClass: 'bg-[var(--color-crimson)]/10 text-[var(--color-crimson)] border-[var(--color-crimson)]/20',
  },
};

export const AuditLogTable: React.FC = () => {
  const {
    filterSeverity,
    searchQuery,
    setFilterSeverity,
    setSearchQuery,
    getFilteredLogs,
  } = useSecurityStore();

  const filtered = getFilteredLogs();

  return (
    <div className="space-y-4">
      {/* Search and severity filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par événement, acteur, IP ou détail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070A12] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
          />
        </div>

        {/* Severity pills */}
        <div className="flex items-center gap-1.5 bg-[#070A12] p-1 rounded-xl border border-white/10">
          <span className="text-[11px] font-medium text-gray-500 uppercase px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Sévérité :
          </span>
          {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as (AuditSeverity | 'ALL')[]).map((sev) => {
            const isSelected = filterSeverity === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-gold)] text-[#070A12] font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {sev === 'ALL' ? 'Tous' : sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#070A12]/80">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-[#0B101E] text-gray-400 font-semibold border-b border-white/5 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Horodatage (CET)</th>
              <th className="py-3 px-4">Sévérité</th>
              <th className="py-3 px-4">Événement & Acteur</th>
              <th className="py-3 px-4">Adresse IP</th>
              <th className="py-3 px-4">Détails de traçabilité</th>
              <th className="py-3 px-4 text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                  Aucun événement d'audit ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filtered.map((log) => {
                const config = SEVERITY_CONFIG[log.severity];
                const Icon = config.icon;

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sans font-medium border ${config.badgeClass}`}
                      >
                        <Icon className="w-3 h-3" />
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <div className="font-semibold text-white text-xs">{log.eventType}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{log.actor}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-300 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]'
                            : log.status === 'BLOCKED'
                            ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                            : 'bg-[var(--color-crimson)]/10 text-[var(--color-crimson)]'
                        }`}
                      >
                        {log.status === 'SUCCESS' && <ShieldCheck className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

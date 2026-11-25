import React, { useId } from 'react';
import {
  ShieldWarning,
  ShieldCheck,
  Warning,
  Info,
  MagnifyingGlass,
  Funnel,
} from '@phosphor-icons/react';
import { useSecurityStore } from '../security.store';
import { AuditSeverity } from '../security.types';

const SEVERITY_CONFIG: Record<
  AuditSeverity,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  INFO: {
    label: 'Information',
    icon: Info,
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  },
  WARNING: {
    label: 'Avertissement',
    icon: Warning,
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
  },
  CRITICAL: {
    label: 'Critique / Falco',
    icon: ShieldWarning,
    badgeClass: 'bg-crimson-500/10 text-crimson-500 border-crimson-500/25',
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

  const searchInputId = useId();
  const filtered = getFilteredLogs();

  return (
    <div className="space-y-4">
      {/* Search and severity filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor={searchInputId} className="sr-only">
            Rechercher dans le journal d’audit
          </label>
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-platinum-400 pointer-events-none" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Rechercher par événement, acteur, IP ou détail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-obsidian-950 border border-obsidian-700 rounded-lg pl-10 pr-4 body-6 text-platinum-50 placeholder-platinum-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
          />
        </div>

        {/* Severity pills */}
        <div className="flex items-center gap-1.5 bg-obsidian-950 p-1 rounded-lg border border-obsidian-700/80 overflow-x-auto">
          <span className="caption-4 text-platinum-400 px-2 flex items-center gap-1.5 shrink-0">
            <Funnel className="w-3.5 h-3.5" />
            <span>Sévérité</span>
          </span>
          {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as (AuditSeverity | 'ALL')[]).map((sev) => {
            const isSelected = filterSeverity === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1.5 rounded-md caption-4 transition-colors duration-300 active:scale-[0.98] cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gold-400 text-obsidian-950 font-semibold'
                    : 'text-platinum-400 hover:text-platinum-50'
                }`}
              >
                {sev === 'ALL' ? 'Tous' : sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-obsidian-700/80 bg-obsidian-950/80">
        <table className="w-full text-left text-xs text-platinum-200">
          <thead className="bg-obsidian-900 text-platinum-400 border-b border-obsidian-700/70 caption-3">
            <tr>
              <th className="py-3 px-4 font-semibold">Horodatage (CET)</th>
              <th className="py-3 px-4 font-semibold">Sévérité</th>
              <th className="py-3 px-4 font-semibold">Événement & acteur</th>
              <th className="py-3 px-4 font-semibold">Adresse IP</th>
              <th className="py-3 px-4 font-semibold">Détails de traçabilité</th>
              <th className="py-3 px-4 text-right font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-700/50 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-platinum-500 font-sans caption-2">
                  Aucun événement d’audit ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filtered.map((log) => {
                const config = SEVERITY_CONFIG[log.severity];
                const Icon = config.icon;

                return (
                  <tr key={log.id} className="hover:bg-obsidian-900/70 transition-colors">
                    <td className="py-3 px-4 text-platinum-400 whitespace-nowrap tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-sans font-medium border ${config.badgeClass}`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <div className="caption-3 text-platinum-50">{log.eventType}</div>
                      <div className="caption-5 text-platinum-400 font-mono">{log.actor}</div>
                    </td>
                    <td className="py-3 px-4 text-platinum-400 whitespace-nowrap tabular-nums">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 font-sans text-platinum-200 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : log.status === 'BLOCKED'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-crimson-500/10 text-crimson-500'
                        }`}
                      >
                        {log.status === 'SUCCESS' && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
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

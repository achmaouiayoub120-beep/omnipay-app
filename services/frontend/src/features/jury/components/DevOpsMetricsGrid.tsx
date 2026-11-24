import React from 'react';
import {
  GitBranch,
  ShieldAlert,
  Key,
  Gauge,
  Activity,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DevSecOpsMetrics } from '../jury.types';

interface DevOpsMetricsGridProps {
  metrics: DevSecOpsMetrics;
}

export const DevOpsMetricsGrid: React.FC<DevOpsMetricsGridProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      {/* Sincerity Banner (BFF or REPLAY) */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#070A12] border border-white/10">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
              metrics.isReplay
                ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] border border-[var(--color-amber)]/30'
                : 'bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30'
            }`}
          >
            {metrics.isReplay ? '● REPLAY CERTIFIÉ (CLUSTER SÉPARÉ)' : '● EN DIRECT DU CLUSTER K3S'}
          </span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            {metrics.isReplay
              ? 'Données de télémétrie enregistrées lors du run officiel de qualification DevSecOps.'
              : 'Flux temps réel connecté au BFF cluster.'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
          <span>Dernière trace:</span>
          <a
            href={`#trace-${metrics.lastTraceId}`}
            className="text-[var(--color-gold)] hover:underline inline-flex items-center gap-1"
            title="Lien Jaeger / Grafana Tempo"
          >
            <span>{metrics.lastTraceId.slice(0, 8)}...</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Grid of 8 Metrics Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Jenkins Pipeline */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400">CI Jenkins Pipeline</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              BUILD #{metrics.jenkins.buildNumber}
            </span>
          </div>
          <div className="text-white font-semibold text-sm">
            Statut : {metrics.jenkins.status} ({metrics.jenkins.duration})
          </div>
          <div className="text-[11px] text-gray-400 truncate font-mono">
            {metrics.jenkins.lastCommit}
          </div>
        </div>

        {/* 2. ArgoCD GitOps */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400">CD ArgoCD GitOps</span>
            <span className="text-[10px] font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
              {metrics.argoCd.syncStatus}
            </span>
          </div>
          <div className="text-white font-semibold text-sm">
            Santé : {metrics.argoCd.healthStatus}
          </div>
          <div className="text-[11px] text-gray-400 font-mono">
            Révision Git : {metrics.argoCd.revision}
          </div>
        </div>

        {/* 3. Canary Traffic Split */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--color-gold)] flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Canary Split
            </span>
            <span className="text-[10px] font-mono font-bold text-white">
              {metrics.canary.stableWeight}% / {metrics.canary.canaryWeight}%
            </span>
          </div>
          {/* Visual bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
            <div
              className="bg-[var(--color-emerald)] h-full"
              style={{ width: `${metrics.canary.stableWeight}%` }}
              title="Trafic Stable v1.0.0"
            />
            <div
              className="bg-[var(--color-gold)] h-full"
              style={{ width: `${metrics.canary.canaryWeight}%` }}
              title="Trafic Canary v1.1.0"
            />
          </div>
          <div className="text-[11px] text-gray-400 truncate font-mono">
            {metrics.canary.stableVersion}
          </div>
        </div>

        {/* 4. Kyverno Policy Rejections */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400">Kyverno & Cosign</span>
            <span className="text-[10px] font-bold text-[var(--color-crimson)] bg-[var(--color-crimson)]/10 px-1.5 py-0.5 rounded">
              {metrics.kyverno.blockedCount} REJETS
            </span>
          </div>
          <div className="text-white font-semibold text-sm">
            {metrics.kyverno.verifiedSignatureCount} signatures vérifiées
          </div>
          <div className="text-[11px] text-gray-400 truncate font-mono">
            Règle : {metrics.kyverno.lastBlockedRule}
          </div>
        </div>

        {/* 5. Falco eBPF */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-[var(--color-gold)]" />
              Falco eBPF
            </span>
            <span className="text-[10px] font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
              {metrics.falco.status}
            </span>
          </div>
          <div className="text-white font-semibold text-sm">
            Alertes actives : {metrics.falco.alertsCount}
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            {metrics.falco.lastEvent}
          </div>
        </div>

        {/* 6. HashiCorp Vault TTL */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <Key className="w-3 h-3 text-[var(--color-gold)]" />
              Bail Vault
            </span>
            <span className="text-[10px] font-mono font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
              {metrics.vault.renewalStatus}
            </span>
          </div>
          <div className="text-white font-semibold text-sm font-mono">
            TTL : {Math.floor(metrics.vault.leaseTtlSeconds / 60)}m {metrics.vault.leaseTtlSeconds % 60}s
          </div>
          <div className="text-[11px] text-gray-400 truncate font-mono">
            {metrics.vault.engine}
          </div>
        </div>

        {/* 7. SLO & Error Budget */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-[var(--color-gold)]" />
              SLO Disponibilité
            </span>
            <span className="text-[10px] font-mono font-bold text-[var(--color-emerald)]">
              {metrics.slo.availabilityPercent}%
            </span>
          </div>
          <div className="text-white font-semibold text-sm">
            Budget restant : {metrics.slo.errorBudgetRemainingPercent}%
          </div>
          <div className="text-[11px] text-gray-400">
            Objectif contractuel : ≥ {metrics.slo.targetPercent}%
          </div>
        </div>

        {/* 8. DORA Metrics */}
        <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[var(--color-emerald)]" />
              DORA 4 Keys
            </span>
            <span className="text-[10px] font-bold text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-1.5 py-0.5 rounded">
              ELITE TIER
            </span>
          </div>
          <div className="text-white font-semibold text-xs grid grid-cols-2 gap-1 font-mono">
            <span>Freq: {metrics.dora.deploymentFrequency.split(' ')[0]}</span>
            <span>Lead: {metrics.dora.leadTimeForChanges}</span>
            <span>Fail: {metrics.dora.changeFailureRate}</span>
            <span>MTTR: {metrics.dora.meanTimeToRestore}</span>
          </div>
          <div className="text-[10px] text-gray-500">
            Norme Google DevOps Research & Assessment
          </div>
        </div>
      </div>
    </div>
  );
};

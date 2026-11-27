import React from 'react';
import {
  GitBranch,
  ShieldWarning,
  Key,
  Gauge,
  Pulse,
  CheckCircle,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { DevSecOpsMetrics } from '../jury.types';

interface DevOpsMetricsGridProps {
  metrics: DevSecOpsMetrics;
}

export const DevOpsMetricsGrid: React.FC<DevOpsMetricsGridProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      {/* Sincerity Banner (BFF or REPLAY) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-700/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono border ${
              metrics.isReplay
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            }`}
          >
            {metrics.isReplay ? '● Replay certifié (cluster séparé)' : '● En direct du cluster K3s'}
          </span>
          <span className="caption-5 text-platinum-400">
            {metrics.isReplay
              ? 'Télémétrie enregistrée lors du run officiel de qualification DevSecOps.'
              : 'Flux temps réel connecté au BFF cluster.'}
          </span>
        </div>

        <div className="flex items-center gap-2 caption-5 font-mono text-platinum-400 shrink-0">
          <span>Trace</span>
          <a
            href={`#trace-${metrics.lastTraceId}`}
            className="text-gold-400 hover:underline inline-flex items-center gap-1"
            title="Lien Jaeger / Grafana Tempo"
          >
            <span>{metrics.lastTraceId.slice(0, 8)}...</span>
            <ArrowSquareOut className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Grid of 8 Metrics Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Jenkins Pipeline */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400">CI Jenkins Pipeline</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md tabular-nums">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              #{metrics.jenkins.buildNumber}
            </span>
          </div>
          <div className="text-platinum-50 body-4 tabular-nums">
            {metrics.jenkins.status} ({metrics.jenkins.duration})
          </div>
          <div className="caption-5 text-platinum-400 truncate font-mono">
            {metrics.jenkins.lastCommit}
          </div>
        </div>

        {/* 2. ArgoCD GitOps */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400">CD ArgoCD GitOps</span>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {metrics.argoCd.syncStatus}
            </span>
          </div>
          <div className="text-platinum-50 body-4">
            Santé : {metrics.argoCd.healthStatus}
          </div>
          <div className="caption-5 text-platinum-400 font-mono">
            Révision : {metrics.argoCd.revision}
          </div>
        </div>

        {/* 3. Canary Traffic Split */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-gold-400 flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              Canary Split
            </span>
            <span className="text-xs font-mono tabular-nums font-semibold text-platinum-50">
              {metrics.canary.stableWeight}% / {metrics.canary.canaryWeight}%
            </span>
          </div>
          <div className="w-full h-2 bg-obsidian-950 rounded-full overflow-hidden flex border border-obsidian-700/70">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${metrics.canary.stableWeight}%` }}
              title="Trafic Stable v1.0.0"
            />
            <div
              className="bg-gold-400 h-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${metrics.canary.canaryWeight}%` }}
              title="Trafic Canary v1.1.0"
            />
          </div>
          <div className="caption-5 text-platinum-400 truncate font-mono">
            {metrics.canary.stableVersion}
          </div>
        </div>

        {/* 4. Kyverno Policy Rejections */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400">Kyverno & Cosign</span>
            <span className="text-xs font-semibold text-crimson-500 bg-crimson-500/10 px-2 py-0.5 rounded-md tabular-nums">
              {metrics.kyverno.blockedCount} rejets
            </span>
          </div>
          <div className="text-platinum-50 body-4 tabular-nums">
            {metrics.kyverno.verifiedSignatureCount} signatures vérifiées
          </div>
          <div className="caption-5 text-platinum-400 truncate font-mono">
            {metrics.kyverno.lastBlockedRule}
          </div>
        </div>

        {/* 5. Falco eBPF */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400 flex items-center gap-1">
              <ShieldWarning className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              Falco eBPF
            </span>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {metrics.falco.status}
            </span>
          </div>
          <div className="text-platinum-50 body-4 tabular-nums">
            Alertes actives : {metrics.falco.alertsCount}
          </div>
          <div className="caption-5 text-platinum-400 truncate">
            {metrics.falco.lastEvent}
          </div>
        </div>

        {/* 6. HashiCorp Vault TTL */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              Bail Vault
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {metrics.vault.renewalStatus}
            </span>
          </div>
          <div className="text-platinum-50 body-4 font-mono tabular-nums">
            TTL {Math.floor(metrics.vault.leaseTtlSeconds / 60)}m {metrics.vault.leaseTtlSeconds % 60}s
          </div>
          <div className="caption-5 text-platinum-400 truncate font-mono">
            {metrics.vault.engine}
          </div>
        </div>

        {/* 7. SLO & Error Budget */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              SLO Disponibilité
            </span>
            <span className="text-xs font-mono tabular-nums font-semibold text-emerald-500">
              {metrics.slo.availabilityPercent}%
            </span>
          </div>
          <div className="text-platinum-50 body-4 tabular-nums">
            Budget restant : {metrics.slo.errorBudgetRemainingPercent}%
          </div>
          <div className="caption-5 text-platinum-400 tabular-nums">
            Objectif : ≥ {metrics.slo.targetPercent}%
          </div>
        </div>

        {/* 8. DORA Metrics */}
        <div className="p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="caption-4 text-platinum-400 flex items-center gap-1">
              <Pulse className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              DORA 4 Keys
            </span>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              Elite
            </span>
          </div>
          <div className="text-platinum-50 caption-3 grid grid-cols-2 gap-1 font-mono tabular-nums">
            <span>Freq: {metrics.dora.deploymentFrequency.split(' ')[0]}</span>
            <span>Lead: {metrics.dora.leadTimeForChanges}</span>
            <span>Fail: {metrics.dora.changeFailureRate}</span>
            <span>MTTR: {metrics.dora.meanTimeToRestore}</span>
          </div>
          <div className="caption-5 text-platinum-500">
            Référentiel DevOps DORA
          </div>
        </div>
      </div>
    </div>
  );
};

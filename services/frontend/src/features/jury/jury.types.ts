/**
 * OmniPay Zero-Trust - Mode Jury / Control Tower Types
 * Real-time DevSecOps metrics, certified REPLAY mode, and 5 jury scenarios.
 */

export interface DevSecOpsMetrics {
  jenkins: {
    buildNumber: number;
    status: 'SUCCESS' | 'RUNNING' | 'FAILED';
    duration: string;
    lastCommit: string;
  };
  argoCd: {
    syncStatus: 'Synced' | 'OutOfSync';
    healthStatus: 'Healthy' | 'Degraded';
    revision: string;
  };
  canary: {
    stableWeight: number;
    canaryWeight: number;
    stableVersion: string;
    canaryVersion: string;
  };
  kyverno: {
    blockedCount: number;
    lastBlockedRule: string;
    verifiedSignatureCount: number;
  };
  falco: {
    alertsCount: number;
    status: 'SECURE' | 'INVESTIGATING';
    lastEvent: string;
  };
  vault: {
    leaseTtlSeconds: number;
    engine: string;
    renewalStatus: 'ACTIVE' | 'PENDING';
  };
  slo: {
    availabilityPercent: number;
    targetPercent: number;
    errorBudgetRemainingPercent: number;
  };
  dora: {
    deploymentFrequency: string;
    leadTimeForChanges: string;
    changeFailureRate: string;
    meanTimeToRestore: string;
  };
  lastTraceId: string;
  isReplay: boolean; // Must be true if cluster BFF is offline
}

export type ScenarioStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface JuryScenario {
  id: string;
  number: number;
  title: string;
  category: string;
  description: string;
  prerequisites: string[];
  expectedOutcome: string;
  status: ScenarioStatus;
  logs: string[];
  executionTime?: string;
  traceId?: string;
}

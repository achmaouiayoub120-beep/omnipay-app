import { describe, it, expect, beforeEach } from 'vitest';
import { useJuryStore } from './jury.store';

describe('Jury Mode & Control Tower Engine', () => {
  beforeEach(() => {
    useJuryStore.setState({
      isOpen: false,
      isExecuting: false,
    });
  });

  it('manages drawer open and close state', () => {
    expect(useJuryStore.getState().isOpen).toBe(false);

    useJuryStore.getState().openDrawer();
    expect(useJuryStore.getState().isOpen).toBe(true);

    useJuryStore.getState().closeDrawer();
    expect(useJuryStore.getState().isOpen).toBe(false);

    useJuryStore.getState().toggleDrawer();
    expect(useJuryStore.getState().isOpen).toBe(true);
  });

  it('initializes with certified REPLAY mode for sincerity when cluster is disconnected', () => {
    const metrics = useJuryStore.getState().metrics;
    expect(metrics.isReplay).toBe(true);
    expect(metrics.jenkins.status).toBe('SUCCESS');
    expect(metrics.canary.stableWeight).toBe(90);
    expect(metrics.canary.canaryWeight).toBe(10);
    expect(metrics.kyverno.blockedCount).toBeGreaterThan(0);
    expect(metrics.slo.availabilityPercent).toBeGreaterThanOrEqual(99.9);
  });

  it('verifies all 5 official jury scenarios exist', () => {
    const scenarios = useJuryStore.getState().scenarios;
    expect(scenarios).toHaveLength(5);

    const ids = scenarios.map((s) => s.id);
    expect(ids).toContain('canary-rollback');
    expect(ids).toContain('kyverno-cosign');
    expect(ids).toContain('falco-ebpf');
    expect(ids).toContain('vault-rotation');
    expect(ids).toContain('gameday-slo');
  });

  it('executes scenario 1 (Canary Rollback) and produces live execution logs and trace ID', async () => {
    const promise = useJuryStore.getState().executeScenario('canary-rollback');
    // Initially running
    const runningScenario = useJuryStore.getState().scenarios.find((s) => s.id === 'canary-rollback');
    expect(runningScenario?.status).toBe('RUNNING');
    expect(runningScenario?.logs.length).toBeGreaterThan(0);

    await promise;

    const finished = useJuryStore.getState().scenarios.find((s) => s.id === 'canary-rollback');
    expect(finished?.status).toBe('SUCCESS');
    expect(finished?.logs.some((l) => l.includes('ROLLBACK'))).toBe(true);
    expect(finished?.traceId).toBeTruthy();
    expect(useJuryStore.getState().isExecuting).toBe(false);
  });

  it('resets a completed scenario back to IDLE state', () => {
    useJuryStore.getState().resetScenario('canary-rollback');
    const reset = useJuryStore.getState().scenarios.find((s) => s.id === 'canary-rollback');
    expect(reset?.status).toBe('IDLE');
    expect(reset?.logs).toHaveLength(0);
  });
});

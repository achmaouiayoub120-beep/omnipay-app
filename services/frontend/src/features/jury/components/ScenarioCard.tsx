import React from 'react';
import {
  Play,
  ArrowsClockwise,
  CheckCircle,
  Terminal,
  ShieldCheck,
  CircleNotch,
  Sparkle,
} from '@phosphor-icons/react';
import { JuryScenario } from '../jury.types';
import { Button } from '@/shared/ui';

interface ScenarioCardProps {
  scenario: JuryScenario;
  onExecute: (id: string) => void;
  onReset: (id: string) => void;
  isExecutingAny: boolean;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onExecute,
  onReset,
  isExecutingAny,
}) => {
  const isRunning = scenario.status === 'RUNNING';
  const isSuccess = scenario.status === 'SUCCESS';

  return (
    <div
      className={`p-5 rounded-xl border transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] space-y-4 ${
        isSuccess
          ? 'bg-obsidian-900 border-emerald-500/40'
          : isRunning
          ? 'bg-obsidian-900 border-gold-400/50'
          : 'bg-obsidian-900/70 border-obsidian-700/80 hover:border-obsidian-600'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-obsidian-700/60">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-gold-400/10 text-gold-400 border border-gold-400/30 caption-3 flex items-center justify-center font-mono tabular-nums">
              {scenario.number}
            </span>
            <h4 className="body-4 text-platinum-50">{scenario.title}</h4>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-obsidian-800 text-platinum-200 border border-obsidian-700">
              {scenario.category}
            </span>
          </div>
          <p className="caption-5 text-platinum-400">{scenario.description}</p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isSuccess && (
            <Button
              type="button"
              variant="secondary"
              size="iconSm"
              onClick={() => onReset(scenario.id)}
              disabled={isExecutingAny}
              title="Réinitialiser le scénario"
              aria-label="Réinitialiser le scénario"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </Button>
          )}

          <Button
            type="button"
            variant={isSuccess ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => onExecute(scenario.id)}
            disabled={isRunning || isExecutingAny}
            className={
              isRunning
                ? 'bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/15'
                : isSuccess
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35 hover:bg-emerald-500/25'
                : ''
            }
          >
            {isRunning ? (
              <>
                <CircleNotch className="w-4 h-4 animate-spin shrink-0" />
                <span>Exécution...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Rejouer la démo</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 shrink-0" weight="fill" />
                <span>Lancer la démo</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Prerequisites Checklist */}
      <div className="space-y-2">
        <span className="caption-3 text-platinum-400 block">
          Prérequis validés dans le cluster
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 caption-5 text-platinum-200">
          {scenario.prerequisites.map((prereq, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 p-2.5 bg-obsidian-950/70 rounded-lg border border-obsidian-700/60"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">{prereq}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expected Outcome */}
      <div className="p-3.5 bg-obsidian-950/70 border border-obsidian-700/60 rounded-lg space-y-1">
        <span className="caption-3 text-gold-400 block">
          Résultat attendu
        </span>
        <p className="caption-5 leading-relaxed text-platinum-400">
          {scenario.expectedOutcome}
        </p>
      </div>

      {/* Live Execution Log Stream (when running or completed) */}
      {scenario.logs.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 caption-5 font-mono text-platinum-400">
            <span className="flex items-center gap-1.5 text-platinum-200">
              <Terminal className="w-4 h-4 text-gold-400 shrink-0" />
              Journal d’exécution DevSecOps en direct
            </span>
            {scenario.traceId && (
              <span className="text-emerald-500">
                Trace ID : {scenario.traceId}
              </span>
            )}
          </div>

          <div className="bg-obsidian-950 border border-obsidian-700/80 rounded-lg p-3.5 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
            {scenario.logs.map((log, lIdx) => (
              <div key={lIdx} className="text-platinum-200 leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Stamp */}
      {isSuccess && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-obsidian-700/60 caption-4 text-emerald-500">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkle className="w-4 h-4 shrink-0" />
            Décrochage de conformité ESTC validé avec succès
          </span>
          <span className="text-platinum-400 font-mono tabular-nums">
            Exécuté à {scenario.executionTime}
          </span>
        </div>
      )}
    </div>
  );
};

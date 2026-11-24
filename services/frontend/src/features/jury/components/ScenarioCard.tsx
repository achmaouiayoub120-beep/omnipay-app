import React from 'react';
import {
  Play,
  RotateCw,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { JuryScenario } from '../jury.types';

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
      className={`p-5 rounded-2xl border transition-all space-y-4 ${
        isSuccess
          ? 'bg-[#0B101E] border-[var(--color-emerald)]/40 shadow-lg shadow-[var(--color-emerald)]/5'
          : isRunning
          ? 'bg-[#0B101E] border-[var(--color-gold)]/50 shadow-lg shadow-[var(--color-gold)]/10'
          : 'bg-[#070A12] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 font-bold text-xs flex items-center justify-center font-mono">
              {scenario.number}
            </span>
            <h4 className="text-sm font-bold text-white">{scenario.title}</h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10">
              {scenario.category}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{scenario.description}</p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isSuccess && (
            <button
              type="button"
              onClick={() => onReset(scenario.id)}
              disabled={isExecutingAny}
              className="p-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
              title="Réinitialiser le scénario"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onExecute(scenario.id)}
            disabled={isRunning || isExecutingAny}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isRunning
                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/40'
                : isSuccess
                ? 'bg-[var(--color-emerald)]/20 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 hover:bg-[var(--color-emerald)]/30'
                : 'bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-md shadow-[var(--color-gold)]/20 hover:opacity-95'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exécution...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rejouer la démo</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lancer la démo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prerequisites Checklist */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
          Prérequis validés dans le cluster :
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-300">
          {scenario.prerequisites.map((prereq, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 p-2 bg-[#0B101E] rounded-lg border border-white/5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-emerald)] shrink-0" />
              <span className="truncate">{prereq}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expected Outcome */}
      <div className="p-3 bg-[#070A12] border border-white/5 rounded-xl text-xs text-gray-300 space-y-1">
        <span className="text-[10px] uppercase font-bold text-[var(--color-gold)] block">
          Résultat attendu :
        </span>
        <p className="text-[11px] leading-relaxed text-gray-400">
          {scenario.expectedOutcome}
        </p>
      </div>

      {/* Live Terminal Log Stream (when running or completed) */}
      {scenario.logs.length > 0 && (
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span className="flex items-center gap-1.5 text-gray-300">
              <Terminal className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              Journal d'exécution DevSecOps en direct
            </span>
            {scenario.traceId && (
              <span className="text-[var(--color-emerald)]">
                Trace ID : {scenario.traceId}
              </span>
            )}
          </div>

          <div className="bg-[#05070D] border border-white/10 rounded-xl p-3.5 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {scenario.logs.map((log, lIdx) => (
              <div key={lIdx} className="text-gray-300 leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Stamp */}
      {isSuccess && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-[var(--color-emerald)]">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Décrochage de conformité ESTC validé avec succès
          </span>
          <span className="text-gray-400 font-mono">
            Exécuté à {scenario.executionTime}
          </span>
        </div>
      )}
    </div>
  );
};

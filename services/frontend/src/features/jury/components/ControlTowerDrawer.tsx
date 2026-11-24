import React, { useEffect } from 'react';
import {
  X,
  Gauge,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useJuryStore } from '../jury.store';
import { DevOpsMetricsGrid } from './DevOpsMetricsGrid';
import { ScenarioCard } from './ScenarioCard';

export const ControlTowerDrawer: React.FC = () => {
  const {
    isOpen,
    metrics,
    scenarios,
    isExecuting,
    closeDrawer,
    toggleDrawer,
    executeScenario,
    resetScenario,
  } = useJuryStore();

  // Keyboard shortcut listener: Ctrl+Shift+J or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        toggleDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer, toggleDrawer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12">
        <div className="w-screen max-w-4xl bg-[#070A12] border-l border-[var(--color-gold)]/30 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Drawer Header */}
          <div className="p-6 border-b border-white/10 bg-[#0B101E]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Tour de Contrôle DevSecOps · Mode Jury ESTC
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                    ROLE_ADMIN ONLY
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Télémétrie en direct du cluster, SLO 99.9% et banc d'essai des 5 démonstrations du jury.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
                Raccourci: <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300">Ctrl+Shift+J</kbd>
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Fermer la tour de contrôle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 sm:p-8 space-y-8 flex-1">
            {/* Live Metrics Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[var(--color-gold)]" />
                  <span>Métriques d'Infrastructure & Pipeline de Déploiement</span>
                </h4>
                <span className="text-[11px] text-gray-500">8 indicateurs de santé audités</span>
              </div>

              <DevOpsMetricsGrid metrics={metrics} />
            </div>

            {/* 5 Scenario Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs uppercase font-bold text-[var(--color-gold)] tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Les 5 Scénarios de Démonstration du Jury</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chaque scénario exécute la preuve technique avec vérification des prérequis et logs en direct.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {scenarios.map((sc) => (
                  <ScenarioCard
                    key={sc.id}
                    scenario={sc}
                    onExecute={executeScenario}
                    onReset={resetScenario}
                    isExecutingAny={isExecuting}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-5 border-t border-white/10 bg-[#0B101E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span className="text-[11px]">
              OmniPay Zero-Trust ESTC · Architecture Cloud-Native Sécurisée certifiée.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/15 transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Gauge,
  Stack,
  Sparkle,
} from '@phosphor-icons/react';
import { useJuryStore } from '../jury.store';
import { DevOpsMetricsGrid } from './DevOpsMetricsGrid';
import { ScenarioCard } from './ScenarioCard';
import { Button } from '@/shared/ui';

const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

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
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Tour de Contrôle DevSecOps">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-12">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
          className="w-screen max-w-4xl bg-obsidian-950 border-l border-gold-400/35 shadow-elevation-3 flex flex-col justify-between overflow-y-auto"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-obsidian-700/70 bg-obsidian-900/95 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/30 flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="title-3 text-platinum-50 font-semibold truncate">
                    Tour de Contrôle DevSecOps · Mode Jury ESTC
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-gold-400/15 text-gold-400 border border-gold-400/30">
                    ROLE_ADMIN
                  </span>
                </div>
                <p className="caption-5 text-platinum-400 mt-0.5">
                  Télémétrie du cluster, SLO 99.9% et banc d’essai des 5 démonstrations du jury.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="caption-5 font-mono text-platinum-400 hidden sm:inline">
                Raccourci <kbd className="px-1.5 py-0.5 bg-obsidian-800 border border-obsidian-700 rounded text-platinum-200">Ctrl+Shift+J</kbd>
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-2 rounded-lg text-platinum-400 hover:text-platinum-50 hover:bg-obsidian-800 transition-colors cursor-pointer"
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="caption-3 text-platinum-200 flex items-center gap-2">
                  <Stack className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Métriques d’infrastructure & pipeline de déploiement</span>
                </h4>
                <span className="caption-5 text-platinum-400">8 indicateurs de santé audités</span>
              </div>

              <DevOpsMetricsGrid metrics={metrics} />
            </div>

            {/* 5 Scenario Cards */}
            <div className="space-y-4">
              <div>
                <h4 className="caption-3 text-gold-400 flex items-center gap-2">
                  <Sparkle className="w-4 h-4 shrink-0" />
                  <span>Les 5 scénarios de démonstration du jury</span>
                </h4>
                <p className="caption-5 text-platinum-400 mt-1">
                  Chaque scénario exécute la preuve technique avec vérification des prérequis et journaux en direct.
                </p>
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
          <div className="p-5 border-t border-obsidian-700/70 bg-obsidian-900 flex flex-col sm:flex-row items-center justify-between gap-3 caption-5 text-platinum-400">
            <span>
              OmniPay Zero-Trust ESTC · Architecture Cloud Native Sécurisée certifiée.
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeDrawer}
            >
              Fermer
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

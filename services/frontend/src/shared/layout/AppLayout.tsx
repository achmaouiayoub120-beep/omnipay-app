import React, { useEffect, useState, useRef } from 'react';
import { Header, NavTab } from './Header';
import { useAuthStore } from '@/features/auth/auth.store';
import { cn } from '@/shared/lib/utils';

export interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenCommand?: () => void;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AppLayout({ children, activeTab, onSelectTab, onOpenCommand }: AppLayoutProps) {
  const { isAuthenticated, updateRemainingTime, logout } = useAuthStore();
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [legalNotice, setLegalNotice] = useState<'privacy' | 'terms' | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 1. Décompte de session actif (toutes les secondes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      updateRemainingTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, updateRemainingTime]);

  // 2. Détection de confidentialité (floutage si onglet inactif)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 3. Déconnexion automatique après inactivité de 15 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT_MS) {
        logout();
      }
    }, 10000);

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('touchstart', resetActivity);

    return () => {
      clearInterval(checkInactivity);
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
    };
  }, [isAuthenticated, logout]);

  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-obsidian-950 surface-grain text-platinum-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        isTabHidden && 'confidentiality-blur'
      )}
    >
      {/* Lien d'évitement clavier (B10) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-gold-400 focus:text-obsidian-950 focus:font-semibold focus:text-sm"
      >
        Aller au contenu principal
      </a>

      {/* Barre de navigation flottante */}
      <Header activeTab={activeTab} onSelectTab={onSelectTab} onOpenCommand={onOpenCommand} />

      {/* Conteneur principal */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 flex flex-col justify-center"
      >
        {children}
      </main>

      {/* Footer sobre avec liens de conformité */}
      <footer className="border-t border-obsidian-700/60 bg-obsidian-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 caption-5 text-platinum-500">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>OmniPay Zero-Trust Banking · Version 2.0.0</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>Conforme WCAG 2.2 AA · Chiffrement AES-256</span>
            <button
              type="button"
              onClick={() => setLegalNotice(legalNotice === 'privacy' ? null : 'privacy')}
              className="text-platinum-400 hover:text-gold-400 transition-colors cursor-pointer"
            >
              Confidentialité
            </button>
            <button
              type="button"
              onClick={() => setLegalNotice(legalNotice === 'terms' ? null : 'terms')}
              className="text-platinum-400 hover:text-gold-400 transition-colors cursor-pointer"
            >
              Conditions d’usage
            </button>
          </div>
        </div>

        {legalNotice && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-700/80 caption-5 text-platinum-400 flex items-center justify-between gap-4">
              <span>
                {legalNotice === 'privacy'
                  ? 'Politique de confidentialité : les jetons JWT sont conservés exclusivement en mémoire vive et aucun cookie publicitaire ni script tiers n’est chargé.'
                  : 'Conditions d’usage : environnement de simulation bancaire Zero-Trust réservé aux démonstrations techniques et audits de sécurité.'}
              </span>
              <button
                type="button"
                onClick={() => setLegalNotice(null)}
                className="text-gold-400 hover:underline shrink-0 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

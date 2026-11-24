import React, { useEffect, useState, useRef } from 'react';
import { Header } from './Header';
import { useAuthStore } from '@/features/auth/auth.store';
import { cn } from '@/shared/lib/utils';

export interface AppLayoutProps {
  children: React.ReactNode;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, updateRemainingTime, logout } = useAuthStore();
  const [isTabHidden, setIsTabHidden] = useState(false);
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
        'min-h-screen bg-obsidian-950 text-platinum-100 flex flex-col transition-all duration-200',
        isTabHidden && 'confidentiality-blur'
      )}
    >
      {/* Header fixe */}
      <Header />

      {/* Conteneur principal avec espace réservé strict pour éviter tout chevauchement */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(var(--topbar-height)+2rem)] pb-12 flex flex-col justify-center">
        {children}
      </main>

      {/* Footer sobre et conforme */}
      <footer className="border-t border-obsidian-750/70 h-14 px-6 flex items-center justify-between text-xs text-platinum-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>OmniPay Zero-Trust Banking · Version 2.0.0</span>
        </div>
        <div>
          <span>Conforme WCAG 2.2 AA · Chiffrement AES-256</span>
        </div>
      </footer>
    </div>
  );
}

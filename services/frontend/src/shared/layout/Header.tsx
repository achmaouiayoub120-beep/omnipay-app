import { useState, useEffect } from 'react';
import { Button, Badge } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/auth.store';
import { useJuryStore } from '@/features/jury/jury.store';
import { canAccessControlTower } from '@/features/security/rbac';
import { Moon, Sun, LogOut, Clock, Gauge } from 'lucide-react';

export function Header() {
  const { session, isAuthenticated, logout, sessionRemainingSeconds } = useAuthStore();
  const { openDrawer } = useJuryStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const showJuryButton = isAuthenticated && canAccessControlTower(session);

  useEffect(() => {
    const saved = localStorage.getItem('omnipay.theme') as 'dark' | 'light' | null;
    const initialTheme = saved || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('omnipay.theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-[72px] border-b border-obsidian-750 bg-obsidian-900/90 backdrop-blur-md px-6 flex items-center justify-between shadow-elevation-1">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-3 group focus:outline-none">
          <img
            src="/assets/logo.png"
            alt="OmniPay Bank Online"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </a>
      </div>

      {/* Actions & Profil Utilisateur */}
      <div className="flex items-center gap-3">
        {isAuthenticated && session && (
          <>
            {/* Session Countdown */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-obsidian-850 rounded-full border border-obsidian-750 text-xs text-platinum-400"
              title="Temps de session restant avant expiration du jeton JWT"
            >
              <Clock className="h-3.5 w-3.5 text-gold-400" />
              <span className="tabular-nums font-mono text-platinum-200">
                {formatCountdown(sessionRemainingSeconds)}
              </span>
            </div>

            {/* User Pill */}
            <div className="flex items-center gap-2 px-3 py-1 bg-obsidian-850 rounded-full border border-obsidian-750">
              <div className="h-6 w-6 rounded-full bg-gold-400 text-obsidian-950 font-bold text-xs flex items-center justify-center uppercase">
                {session.username.slice(0, 2)}
              </div>
              <span className="text-xs font-semibold text-platinum-100 hidden md:inline">
                {session.username}
              </span>
              <Badge variant={session.roles.includes('ROLE_ADMIN') ? 'gold' : 'neutral'} size="sm">
                {session.roles.includes('ROLE_ADMIN')
                  ? 'ADMIN'
                  : session.roles.includes('ROLE_AUDITOR')
                  ? 'AUDITOR'
                  : 'USER'}
              </Badge>
            </div>

            {/* Mode Jury Button (ADMIN & Demo Mode) */}
            {showJuryButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={openDrawer}
                className="border-[var(--color-gold)]/40 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 gap-1.5 cursor-pointer text-xs"
                title="Ouvrir la Tour de Contrôle DevSecOps (Mode Jury ESTC) - Raccourci Ctrl+Shift+J"
              >
                <Gauge className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                <span className="hidden md:inline font-semibold">Mode Jury</span>
              </Button>
            )}
          </>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="iconSm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="sr-only">Changer de thème</span>
        </Button>

        {/* Logout Button */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-crimson-500 hover:text-crimson-600 hover:bg-crimson-900/20 gap-1.5"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        )}
      </div>
    </header>
  );
}

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Badge } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/auth.store';
import { useJuryStore } from '@/features/jury/jury.store';
import { canAccessControlTower, canPerformTransfers } from '@/features/security/rbac';
import logoImg from '@/assets/logo.png';
import {
  Clock,
  Gauge,
  SignOut,
  SquaresFour,
  PaperPlaneTilt,
  Receipt,
  ShieldCheck,
  List,
  X,
  CircleHalf,
  MagnifyingGlass,
} from '@phosphor-icons/react';

export type NavTab = 'dashboard' | 'transfers' | 'history' | 'security';

export interface HeaderProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenCommand?: () => void;
}

const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export function Header({ activeTab = 'dashboard', onSelectTab, onOpenCommand }: HeaderProps) {
  const { session, isAuthenticated, logout, sessionRemainingSeconds } = useAuthStore();
  const { openDrawer } = useJuryStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showJuryButton = isAuthenticated && canAccessControlTower(session);
  const transfersAllowed = isAuthenticated && canPerformTransfers(session);

  useEffect(() => {
    const saved = localStorage.getItem('omnipay.theme') as 'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
      const initial = prefersLight ? 'light' : 'dark';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
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

  const navItems: { id: NavTab; label: string; icon: typeof SquaresFour; visible: boolean }[] = [
    { id: 'dashboard', label: 'Vue d’ensemble', icon: SquaresFour, visible: true },
    { id: 'transfers', label: 'Virements', icon: PaperPlaneTilt, visible: transfersAllowed },
    { id: 'history', label: 'Historique', icon: Receipt, visible: true },
    { id: 'security', label: 'Sécurité', icon: ShieldCheck, visible: true },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab?.(tab);
    setMobileMenuOpen(false);
  };

  const roleCode = session?.roles.includes('ROLE_ADMIN')
    ? 'ADMIN'
    : session?.roles.includes('ROLE_AUDITOR')
    ? 'AUDITOR'
    : 'USER';

  return (
    <>
      <header className="sticky top-3 z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-obsidian-700/80 bg-obsidian-900/90 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-elevation-2">
          {/* Brand & Logo */}
          <div className="flex items-center shrink-0">
            <a
              href="/"
              className="flex items-center group focus-visible:outline-none rounded-lg py-0.5"
              aria-label="OmniPay Zero-Trust — Accueil"
            >
              <img
                src={logoImg}
                alt="OmniPay Bank Online"
                className="h-8 sm:h-9 w-auto object-contain transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
            </a>
          </div>

          {/* Primary Navigation (Desktop >= lg, single-line strict) */}
          {isAuthenticated && onSelectTab && (
            <nav
              aria-label="Navigation principale"
              className="hidden lg:flex items-center gap-1 bg-obsidian-950/80 p-1 rounded-lg border border-obsidian-700/70 shrink-0"
            >
              {navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md button-xsm whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer ${
                        isActive
                          ? 'bg-gold-400 text-obsidian-950'
                          : 'text-platinum-400 hover:text-platinum-50 hover:bg-obsidian-800/70'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </nav>
          )}

          {/* Actions & Session Telemetry (strictly non-wrapping & zero horizontal overflow) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAuthenticated && onOpenCommand && (
              <button
                type="button"
                onClick={onOpenCommand}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-obsidian-700/80 bg-obsidian-950/70 text-platinum-400 hover:text-platinum-50 hover:border-gold-400/40 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] caption-5 whitespace-nowrap cursor-pointer"
                title="Recherche rapide (Ctrl+K)"
                aria-label="Recherche rapide"
              >
                <MagnifyingGlass className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                <kbd className="font-mono text-xs text-platinum-400">⌘K</kbd>
              </button>
            )}

            {isAuthenticated && session && (
              <>
                {/* Session Countdown (only on wide screens) */}
                <div
                  className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 bg-obsidian-950/70 rounded-lg border border-obsidian-700/70 caption-4 text-platinum-400 whitespace-nowrap"
                  title="Temps de session restant avant expiration du jeton JWT"
                >
                  <Clock className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                  <span className="tabular-nums font-mono text-platinum-200">
                    {formatCountdown(sessionRemainingSeconds)}
                  </span>
                </div>

                {/* User Pill */}
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-obsidian-950/70 rounded-lg border border-obsidian-700/70 whitespace-nowrap">
                  <div className="h-6 w-6 rounded-md bg-gold-400 text-obsidian-950 font-semibold text-xs flex items-center justify-center shrink-0">
                    {session.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="caption-3 text-platinum-50 hidden xl:inline">
                    {session.username}
                  </span>
                  <Badge variant={session.roles.includes('ROLE_ADMIN') ? 'gold' : 'neutral'} size="sm">
                    {roleCode}
                  </Badge>
                </div>

                {/* Mode Jury Button */}
                {showJuryButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDrawer}
                    className="gap-1.5 px-2.5 whitespace-nowrap"
                    title="Ouvrir la Tour de Contrôle DevSecOps (Mode Jury ESTC) - Raccourci Ctrl+Shift+J"
                  >
                    <Gauge className="h-4 w-4 text-gold-400 shrink-0" />
                    <span className="hidden md:inline">Mode Jury</span>
                  </Button>
                )}
              </>
            )}

            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-obsidian-700/80 bg-obsidian-950/60 text-platinum-400 hover:text-platinum-50 hover:border-obsidian-600 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] caption-4 whitespace-nowrap cursor-pointer"
              title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
              aria-label={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
            >
              <CircleHalf className="h-4 w-4 text-gold-400 shrink-0" />
              <span className="hidden xl:inline">{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
            </button>

            {/* Logout Button */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-crimson-500 hover:text-crimson-500 hover:bg-crimson-500/10 gap-1.5 px-2.5 whitespace-nowrap"
                title="Se déconnecter"
                aria-label="Déconnexion"
              >
                <SignOut className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">Déconnexion</span>
              </Button>
            )}

            {/* Mobile Nav Toggle */}
            {isAuthenticated && onSelectTab && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-md border border-obsidian-700 bg-obsidian-950/80 text-platinum-50 hover:border-gold-400/50 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer"
                aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileMenuOpen}
              >
                <motion.span
                  key={mobileMenuOpen ? 'close' : 'open'}
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </motion.span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Full-Height Navigation Panel */}
      <AnimatePresence>
        {mobileMenuOpen && isAuthenticated && onSelectTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
            className="fixed inset-0 z-40 lg:hidden bg-obsidian-950/95 backdrop-blur-xl flex flex-col justify-between p-6"
          >
            <div className="flex items-center justify-between pb-6 border-b border-obsidian-700/60">
              <div className="flex items-center">
                <img src={logoImg} alt="OmniPay Bank Online" className="h-9 w-auto object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-9 w-9 rounded-lg border border-obsidian-700 flex items-center justify-center text-platinum-400 hover:text-platinum-50"
                aria-label="Fermer le menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav aria-label="Navigation mobile" className="flex flex-col gap-3 my-auto py-8">
              {navItems
                .filter((item) => item.visible)
                .map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: Math.min(idx * 0.06, 0.36),
                        ease: EASE_EDITORIAL,
                      }}
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-colors duration-300 ${
                        isActive
                          ? 'bg-gold-400 text-obsidian-950 border-gold-400 font-semibold'
                          : 'bg-obsidian-900 border-obsidian-700/80 text-platinum-100 hover:border-gold-400/40'
                      }`}
                    >
                      <span className="flex items-center gap-3 title-3 font-semibold">
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </span>
                      {isActive && <span className="caption-4">Actif</span>}
                    </motion.button>
                  );
                })}
            </nav>

            {session && (
              <div className="pt-4 border-t border-obsidian-700/60 flex items-center justify-between caption-4 text-platinum-400">
                <span>Session {session.username}</span>
                <span className="font-mono tabular-nums text-gold-400">
                  JWT {formatCountdown(sessionRemainingSeconds)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '@/shared/ui';
import { useAuthStore } from './auth.store';
import { Lock, User, ShieldCheck, Key, Fingerprint } from '@phosphor-icons/react';
import logoImg from '@/assets/logo.png';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export function LoginForm() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('L’identifiant est obligatoire.');
      return;
    }
    if (!password) {
      setError('Le mot de passe est obligatoire.');
      return;
    }

    try {
      setIsLoading(true);
      await login({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoAccount = (u: string) => {
    setUsername(u);
    setPassword('password');
    setError(null);
  };

  const demoAccounts = [
    { id: 'alice', name: 'Alice Dupont', detail: 'Solde : 1 000,00 €', tone: 'text-platinum-400' },
    { id: 'bob', name: 'Bob Martin', detail: 'Solde : 500,00 €', tone: 'text-platinum-400' },
    { id: 'admin', name: 'Administrateur', detail: 'ROLE_ADMIN', tone: 'text-gold-400' },
    { id: 'auditor', name: 'Auditeur régulateur', detail: 'ROLE_AUDITOR', tone: 'text-emerald-500' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
      className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4"
    >
      {/* Editorial Brand Narrative (Asymmetric 7 columns) */}
      <div className="lg:col-span-7 space-y-6 text-left max-w-[680px]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-obsidian-900 border border-obsidian-700/80 caption-4 text-platinum-200">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
          <span>Plateforme bancaire privée et posture Zero-Trust</span>
        </div>

        <h1 className="heading-3 sm:heading-2 hero-text-gradient leading-[1.08]">
          Banque privée,
          <br />
          contrôle cryptographique continu
        </h1>

        <p className="body-3 text-platinum-400 max-w-xl">
          Accédez à vos comptes, exécutez des virements SEPA vérifiés par clé Modulo 97 et inspectez la télémétrie DevSecOps en temps réel sans exposition de jeton côté stockage persistant.
        </p>

        {/* Architectural security guarantees (no fake metrics, factual architecture) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-obsidian-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 caption-3 text-platinum-50">
              <Key className="h-4 w-4 text-gold-400 shrink-0" />
              <span>Jeton en mémoire</span>
            </div>
            <p className="caption-5 text-platinum-400">
              Aucun JWT persistant dans le navigateur.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 caption-3 text-platinum-50">
              <Fingerprint className="h-4 w-4 text-gold-400 shrink-0" />
              <span>Validation MFA</span>
            </div>
            <p className="caption-5 text-platinum-400">
              Double facteur systématique à la session.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 caption-3 text-platinum-50">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>RBAC strict</span>
            </div>
            <p className="caption-5 text-platinum-400">
              Isolation des rôles utilisateur, admin et audit.
            </p>
          </div>
        </div>
      </div>

      {/* Sign-in Surface (5 columns) */}
      <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
        <Card className="border-obsidian-700/90 bg-obsidian-900 shadow-elevation-3">
          <CardHeader className="flex-col items-start pb-2 space-y-3">
            <div className="flex items-center justify-between w-full gap-3">
              <img
                src={logoImg}
                alt="OmniPay Bank Online"
                className="h-10 sm:h-11 w-auto object-contain"
              />
              <Badge variant="gold" size="sm">Session chiffrée</Badge>
            </div>
            <div>
              <CardTitle className="heading-6 text-platinum-50">
                Accès espace bancaire
              </CardTitle>
              <CardDescription className="caption-2 text-platinum-400">
                Authentification forte requise pour ouvrir la session.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Identifiant bancaire"
                placeholder="ex : alice, bob, admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                autoComplete="username"
                required
              />

              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                required
              />

              {error && (
                <div
                  className="p-3 caption-4 text-crimson-500 bg-crimson-500/10 border border-crimson-500/30 rounded-lg"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                <span>Se connecter</span>
                <ShieldCheck className="h-4 w-4 shrink-0" />
              </Button>
            </form>

            {/* Raccourcis Démo (Conditionnés exclusivement par VITE_DEMO_MODE=true) */}
            {isDemoMode && (
              <div className="pt-4 border-t border-obsidian-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="caption-3 text-platinum-400">
                    Profils de démonstration
                  </span>
                  <Badge variant="neutral" size="sm">Mode démo</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map((acc) => {
                    const isSelected = username === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => selectDemoAccount(acc.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'border-gold-400 bg-gold-400/10 text-platinum-50'
                            : 'border-obsidian-700 bg-obsidian-950/60 hover:bg-obsidian-800 hover:border-obsidian-600 text-platinum-200'
                        }`}
                      >
                        <div className="caption-3 text-platinum-50 truncate">{acc.name}</div>
                        <div className={`caption-5 tabular-nums font-mono mt-0.5 ${acc.tone}`}>
                          {acc.detail}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.section>
  );
}

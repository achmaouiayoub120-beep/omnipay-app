import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '@/shared/ui';
import { useAuthStore } from './auth.store';
import { Lock, User, Shield, Sparkles } from 'lucide-react';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

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

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-obsidian-700 shadow-elevation-3 bg-obsidian-900/90 backdrop-blur-md">
        <CardHeader className="text-center flex-col items-center pb-2">
          <div className="relative mb-3 flex items-center justify-center">
            <img
              src="/assets/logo.png"
              alt="OmniPay Bank Online"
              className="h-16 w-auto object-contain drop-shadow-[0_8px_20px_rgba(212,162,76,0.35)]"
            />
          </div>
          <CardTitle className="text-xl font-bold text-platinum-50">
            Accès Espace Bancaire
          </CardTitle>
          <CardDescription className="text-xs text-platinum-400">
            Authentification forte pour la néobanque simulée OmniPay Zero-Trust
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-3">
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
                className="p-3 text-xs text-crimson-500 bg-crimson-900/20 border border-crimson-500/30 rounded-md font-medium"
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
              <Shield className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Raccourcis Démo (Conditionnés exclusivement par VITE_DEMO_MODE=true) */}
          {isDemoMode && (
            <div className="pt-4 border-t border-obsidian-750/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-platinum-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                  Comptes de Démonstration (1-Clic) :
                </span>
                <Badge variant="gold" size="sm">DÉMO</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectDemoAccount('alice')}
                  className={`p-2 rounded-md border text-left transition-colors ${
                    username === 'alice'
                      ? 'border-gold-400 bg-gold-400/10 text-platinum-100'
                      : 'border-obsidian-750 bg-obsidian-850 hover:bg-obsidian-800 text-platinum-300'
                  }`}
                >
                  <div className="font-semibold">Alice Dupont</div>
                  <div className="text-[10px] text-platinum-500">Solde : 1 000,00 €</div>
                </button>

                <button
                  type="button"
                  onClick={() => selectDemoAccount('bob')}
                  className={`p-2 rounded-md border text-left transition-colors ${
                    username === 'bob'
                      ? 'border-gold-400 bg-gold-400/10 text-platinum-100'
                      : 'border-obsidian-750 bg-obsidian-850 hover:bg-obsidian-800 text-platinum-300'
                  }`}
                >
                  <div className="font-semibold">Bob Martin</div>
                  <div className="text-[10px] text-platinum-500">Solde : 500,00 €</div>
                </button>

                <button
                  type="button"
                  onClick={() => selectDemoAccount('admin')}
                  className={`p-2 rounded-md border text-left transition-colors ${
                    username === 'admin'
                      ? 'border-gold-400 bg-gold-400/10 text-platinum-100'
                      : 'border-obsidian-750 bg-obsidian-850 hover:bg-obsidian-800 text-platinum-300'
                  }`}
                >
                  <div className="font-semibold">Administrateur</div>
                  <div className="text-[10px] text-gold-400">ROLE_ADMIN</div>
                </button>

                <button
                  type="button"
                  onClick={() => selectDemoAccount('auditor')}
                  className={`p-2 rounded-md border text-left transition-colors ${
                    username === 'auditor'
                      ? 'border-gold-400 bg-gold-400/10 text-platinum-100'
                      : 'border-obsidian-750 bg-obsidian-850 hover:bg-obsidian-800 text-platinum-300'
                  }`}
                >
                  <div className="font-semibold">Auditeur Régulateur</div>
                  <div className="text-[10px] text-emerald-500">ROLE_AUDITOR</div>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

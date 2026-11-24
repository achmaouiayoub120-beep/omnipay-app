import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { MfaModal } from '@/features/auth/MfaModal';
import { useAuthStore } from '@/features/auth/auth.store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/shared/ui';
import { ShieldCheck, CreditCard, Send, Lock } from 'lucide-react';

export function App() {
  const { isAuthenticated, session } = useAuthStore();

  return (
    <AppLayout>
      <MfaModal />

      {!isAuthenticated ? (
        <LoginForm />
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Bannière de Bienvenue */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-obsidian-700 bg-obsidian-900/80 shadow-elevation-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                  Espace Bancaire Sécurisé
                </span>
                <Badge variant="success" dot size="sm">Session Active</Badge>
              </div>
              <h2 className="text-2xl font-bold text-platinum-50 mt-1">
                Bienvenue, {session?.username}
              </h2>
              <p className="text-xs text-platinum-400 mt-0.5">
                Rôles actifs : {session?.roles.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Lock className="h-4 w-4 mr-1.5 text-gold-400" />
                <span>Sécurité</span>
              </Button>
              <Button variant="primary" size="sm">
                <Send className="h-4 w-4 mr-1.5" />
                <span>Nouveau Virement</span>
              </Button>
            </div>
          </div>

          {/* Grid de Présentation (Phase 2 Shell) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Compte Courant Principal</CardTitle>
                  <CardDescription>IBAN : FR76 3000 6000 0112 3456 7890 189</CardDescription>
                </div>
                <Badge variant="gold">ACTIF</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <span className="text-3xl font-extrabold text-platinum-50 tabular-nums">
                  {session?.username === 'bob'
                    ? '500,00 €'
                    : session?.username === 'admin'
                    ? '50 000,00 €'
                    : '1 000,00 €'}
                </span>
                <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Solde disponible vérifié en direct
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Carte Bancaire Associée</CardTitle>
                  <CardDescription>Prélèvement immédiat · Plafond 5 000 €</CardDescription>
                </div>
                <CreditCard className="h-5 w-5 text-gold-400" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-obsidian-950 border border-obsidian-750">
                  <img
                    src="/cards/ultra-platinum.jpg"
                    alt="Carte Ultra-Platinum"
                    className="h-28 w-auto rounded-lg border border-gold-400/40 shadow-card-specular object-cover"
                  />
                  <div className="space-y-1.5 text-left flex-1">
                    <span className="text-xs font-semibold text-gold-400">CARTE PHYSIQUE ACTIVE</span>
                    <div className="font-mono text-base text-platinum-100 font-bold">
                      •••• •••• •••• 4821
                    </div>
                    <div className="text-xs text-platinum-400">
                      Titulaire : <strong className="text-platinum-200">{(session?.username || 'ALICE').toUpperCase()}</strong> · Expire : 12/28
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button variant="secondary" size="sm">Geler la carte</Button>
                      <Button variant="outline" size="sm">Voir les plafonds</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { MfaModal } from '@/features/auth/MfaModal';
import { useAuthStore } from '@/features/auth/auth.store';
import { useCardsStore } from '@/features/cards/cards.store';
import { CreditCard3D } from '@/features/cards/CreditCard3D';
import { AccountSummary } from '@/features/dashboard/AccountSummary';
import { SpendLimitsCard } from '@/features/dashboard/SpendLimitsCard';
import { Button, Badge } from '@/shared/ui';
import { Send, Download, SlidersHorizontal, Sparkles } from 'lucide-react';

export function App() {
  const { isAuthenticated, session } = useAuthStore();
  const { cards } = useCardsStore();

  // Données de compte selon l'utilisateur connecté
  const username = session?.username || 'alice';
  const activeCard =
    cards.find((c) => c.cardholderName.toLowerCase().includes(username)) || cards[0];

  const accountData = {
    accountId:
      username === 'bob'
        ? 'ACC-BOB-002'
        : username === 'admin'
        ? 'ACC-ADMIN-004'
        : 'ACC-ALICE-001',
    iban:
      username === 'bob'
        ? 'FR76 3000 6000 0223 4567 8901 234'
        : username === 'admin'
        ? 'FR76 3000 6000 0001 2345 6789 012'
        : 'FR76 3000 6000 0112 3456 7890 189',
    balanceMinor:
      username === 'bob' ? 50000 : username === 'admin' ? 5000000 : 100000,
    monthlyInflowMinor: 250000,
    monthlyOutflowMinor: 145000,
  };

  return (
    <AppLayout>
      <MfaModal />

      {!isAuthenticated ? (
        <LoginForm />
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Barre d'accès rapide & statut */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-obsidian-750 bg-obsidian-900/90 shadow-elevation-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Espace Bancaire Premium
                </span>
                <Badge variant="gold" size="sm">NIVEAU REVOLUT ULTRA</Badge>
              </div>
              <h2 className="text-2xl font-bold text-platinum-50 mt-1">
                Tableau de Bord · {session?.username.toUpperCase()}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1.5 text-platinum-400" />
                <span>Relevé RIB</span>
              </Button>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-1.5 text-gold-400" />
                <span>Gestion</span>
              </Button>
              <Button variant="primary" size="sm">
                <Send className="h-4 w-4 mr-1.5" />
                <span>Nouveau Virement</span>
              </Button>
            </div>
          </div>

          {/* Section 1 : Solde et Flux Financiers */}
          <AccountSummary
            accountId={accountData.accountId}
            iban={accountData.iban}
            balanceMinor={accountData.balanceMinor}
            monthlyInflowMinor={accountData.monthlyInflowMinor}
            monthlyOutflowMinor={accountData.monthlyOutflowMinor}
          />

          {/* Section 2 : Carte Bancaire 3D Parallax & Plafonds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Carte 3D Interactive */}
            <div className="flex flex-col items-center p-6 rounded-2xl border border-obsidian-750 bg-obsidian-900/80 shadow-elevation-2 space-y-4">
              <div className="w-full flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-platinum-100">
                    Carte Bancaire Principale
                  </h3>
                  <p className="text-xs text-platinum-400">
                    Inclinaison 3D Parallax & Reflet Spéculaire Or
                  </p>
                </div>
                <Badge variant={activeCard.isFrozen ? 'danger' : 'gold'}>
                  {activeCard.isFrozen ? 'GELÉE' : 'ACTIVE'}
                </Badge>
              </div>

              <CreditCard3D card={activeCard} />
            </div>

            {/* Plafonds de paiement & Métriques de sécurité */}
            <div className="space-y-6">
              <SpendLimitsCard
                spentMinor={activeCard.currentMonthSpentMinor}
                limitMinor={activeCard.monthlySpendLimitMinor}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

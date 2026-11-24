import { useState, useEffect } from 'react';
import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { MfaModal } from '@/features/auth/MfaModal';
import { useAuthStore } from '@/features/auth/auth.store';
import { useCardsStore } from '@/features/cards/cards.store';
import { CreditCard3D } from '@/features/cards/CreditCard3D';
import { AccountSummary } from '@/features/dashboard/AccountSummary';
import { SpendLimitsCard } from '@/features/dashboard/SpendLimitsCard';
import { TransferWizard } from '@/features/transfers/components/TransferWizard';
import { TransactionHistory } from '@/features/transactions/components/TransactionHistory';
import { SecurityCenter } from '@/features/security/components/SecurityCenter';
import { ControlTowerDrawer } from '@/features/jury/components/ControlTowerDrawer';
import {
  canPerformTransfers,
  canManageCards,
  getRoleBadgeInfo,
} from '@/features/security/rbac';
import { INTERNAL_ACCOUNTS } from '@/shared/lib/iban';
import { Button, Badge } from '@/shared/ui';
import {
  Send,
  Sparkles,
  LayoutDashboard,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Shield,
} from 'lucide-react';

type ActiveNavTab = 'dashboard' | 'transfers' | 'history' | 'security';

export function App() {
  const { isAuthenticated, session } = useAuthStore();
  const { cards } = useCardsStore();
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');

  const transfersAllowed = canPerformTransfers(session);
  const cardManagementAllowed = canManageCards(session);
  const roleInfo = getRoleBadgeInfo(session?.roles || ['ROLE_USER']);

  // Si le rôle actuel ne permet pas les virements (ex: AUDITOR), forcer le retour au dashboard
  useEffect(() => {
    if (activeTab === 'transfers' && !transfersAllowed) {
      setActiveTab('dashboard');
    }
  }, [activeTab, transfersAllowed]);

  // Résolution dynamique du compte utilisateur avec IBAN Modulo-97 certifié
  const username = session?.username || 'user';
  const activeCard =
    cards.find((c) => c.cardholderName.toLowerCase().includes(username)) || cards[0];

  const userAccountKey =
    username === 'bob'
      ? 'ACC-BOB-002'
      : username === 'admin'
      ? 'ACC-ADMIN-004'
      : username === 'alice'
      ? 'ACC-ALICE-001'
      : 'ACC-USER-003';

  const userAccount = INTERNAL_ACCOUNTS[userAccountKey] || INTERNAL_ACCOUNTS['ACC-USER-003'];

  const accountData = {
    accountId: userAccount.accountId,
    iban: userAccount.iban,
    holderName: userAccount.holderName,
    balanceMinor:
      username === 'bob'
        ? 50000 // 500,00 €
        : username === 'admin'
        ? 5000000 // 50 000,00 €
        : username === 'alice'
        ? 100000 // 1 000,00 €
        : 1425000, // 14 250,00 € (Ayoub / Demo User)
    monthlyInflowMinor: 485000,
    monthlyOutflowMinor: 145000,
  };

  return (
    <AppLayout>
      <MfaModal />
      <ControlTowerDrawer />

      {!isAuthenticated ? (
        <LoginForm />
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Bar Navigation & Quick Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-[#0B101E]/90 shadow-2xl backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Espace Bancaire Privé
                </span>
                <Badge variant="gold" size="sm">NIVEAU ULTRA PLATINUM</Badge>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.badgeClass}`}
                >
                  {roleInfo.label}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">
                Bienvenue, {accountData.holderName.split(' ')[0]}
              </h2>
            </div>

            {/* Navigation Tabs (Dashboard, Transfers, History, Security) */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center bg-[#070A12] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-[var(--color-gold)] text-[#070A12] shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Tableau de bord</span>
                </button>

                {/* Onglet Virements : ABSENT pour ROLE_AUDITOR */}
                {transfersAllowed && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('transfers')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'transfers'
                        ? 'bg-[var(--color-gold)] text-[#070A12] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Virements</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-[var(--color-gold)] text-[#070A12] shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Historique</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-[var(--color-gold)] text-[#070A12] shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sécurité</span>
                </button>
              </div>

              {/* Bouton d'action rapide Virement : ABSENT si non autorisé ou si déjà sur l'onglet */}
              {transfersAllowed && activeTab !== 'transfers' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('transfers')}
                  className="hidden sm:inline-flex cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  <span>Nouveau virement</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tab 1: Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Solde et Flux Financiers */}
              <AccountSummary
                accountId={accountData.accountId}
                iban={accountData.iban}
                balanceMinor={accountData.balanceMinor}
                monthlyInflowMinor={accountData.monthlyInflowMinor}
                monthlyOutflowMinor={accountData.monthlyOutflowMinor}
              />

              {/* Carte Bancaire 3D Parallax & Plafonds */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Carte 3D Interactive (actions gel/révélation masquées si non autorisé) */}
                <div className="flex flex-col items-center p-6 rounded-3xl border border-white/10 bg-[#0B101E]/80 shadow-2xl space-y-4">
                  <div className="w-full flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Carte Ultra Platinum Active
                      </h3>
                      <p className="text-xs text-gray-400">
                        Inclinaison 3D Parallax & Reflet Spéculaire Or
                      </p>
                    </div>
                    <Badge variant={activeCard.isFrozen ? 'danger' : 'gold'}>
                      {activeCard.isFrozen ? 'GELÉE' : 'ACTIVE'}
                    </Badge>
                  </div>

                  <CreditCard3D card={activeCard} canManage={cardManagementAllowed} />
                </div>

                {/* Plafonds de paiement & Accès Rapides */}
                <div className="space-y-6">
                  <SpendLimitsCard
                    spentMinor={activeCard.currentMonthSpentMinor}
                    limitMinor={activeCard.monthlySpendLimitMinor}
                  />

                  {/* Accès rapide vers l'historique et la sécurité */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">
                            Historique certifié
                          </h4>
                          <span className="text-[11px] text-gray-400">Reçus & Justificatifs</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('history')}
                        className="cursor-pointer text-xs"
                      >
                        <span>Consulter</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>

                    <div className="p-4 bg-[#0B101E] border border-white/10 rounded-2xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">
                            Audit & Sécurité
                          </h4>
                          <span className="text-[11px] text-gray-400">Sessions & eBPF</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('security')}
                        className="cursor-pointer text-xs"
                      >
                        <span>Gérer</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 5-Step Transfer Wizard (Uniquement si autorisé) */}
          {transfersAllowed && activeTab === 'transfers' && (
            <div className="animate-in fade-in duration-200 max-w-3xl mx-auto">
              <TransferWizard onGoToHistory={() => setActiveTab('history')} />
            </div>
          )}

          {/* Tab 3: Paginated Transaction History */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-200">
              <TransactionHistory />
            </div>
          )}

          {/* Tab 4: Security Center & RBAC Audit */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in duration-200">
              <SecurityCenter />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

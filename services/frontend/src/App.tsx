import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from '@/shared/layout/AppLayout';
import { NavTab } from '@/shared/layout/Header';
import { LoginForm } from '@/features/auth/LoginForm';
import { MfaModal } from '@/features/auth/MfaModal';
import { useAuthStore } from '@/features/auth/auth.store';
import { useCardsStore } from '@/features/cards/cards.store';
import { useTransactionsStore } from '@/features/transactions/transactions.store';
import { useSecurityStore } from '@/features/security/security.store';
import { useJuryStore } from '@/features/jury/jury.store';
import { useAccountsStore } from '@/features/accounts/accounts.store';
import { CreditCard3D } from '@/features/cards/CreditCard3D';
import { AccountSummary } from '@/features/dashboard/AccountSummary';
import { BalanceEvolutionChart } from '@/features/dashboard/BalanceEvolutionChart';
import { SpendLimitsCard } from '@/features/dashboard/SpendLimitsCard';
import { TransferWizard } from '@/features/transfers/components/TransferWizard';
import { TransactionHistory } from '@/features/transactions/components/TransactionHistory';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { TransactionDrawer } from '@/features/transactions/components/TransactionDrawer';
import { SecurityCenter } from '@/features/security/components/SecurityCenter';
import { ControlTowerDrawer } from '@/features/jury/components/ControlTowerDrawer';
import {
  canPerformTransfers,
  canManageCards,
  canAccessControlTower,
  getRoleBadgeInfo,
} from '@/features/security/rbac';
import { INTERNAL_ACCOUNTS, accountIdForUsername } from '@/shared/lib/iban';
import { formatMinorToCurrency } from '@/shared/lib/money';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui';
import {
  PaperPlaneTilt,
  ArrowRight,
  ShieldCheck,
  Pulse,
  Gauge,
  Receipt,
  MagnifyingGlass,
  CreditCard,
} from '@phosphor-icons/react';

const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export function App() {
  const { isAuthenticated, session } = useAuthStore();
  const { cards } = useCardsStore();
  const {
    transactions,
    isLoading: txLoading,
    selectedTransaction,
    loadTransactions,
    setSelectedTransaction,
  } = useTransactionsStore();
  const { activeSessions, trustedDevices, auditLogs } = useSecurityStore();
  const { metrics, openDrawer } = useJuryStore();
  const { accounts, refresh: refreshAccounts, reset: resetAccounts } = useAccountsStore();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const transfersAllowed = canPerformTransfers(session);
  const cardManagementAllowed = canManageCards(session);
  const controlTowerAllowed = canAccessControlTower(session);
  const roleInfo = getRoleBadgeInfo(session?.roles || ['ROLE_USER']);

  // Charger les transactions réelles dès l'authentification
  useEffect(() => {
    if (isAuthenticated && transactions.length === 0) {
      loadTransactions();
    }
  }, [isAuthenticated, transactions.length, loadTransactions]);

  // Solde et historique réels : relus à la connexion puis toutes les 10 s (et après chaque virement, voir transfers.store)
  useEffect(() => {
    if (!isAuthenticated) {
      resetAccounts();
      return undefined;
    }
    void refreshAccounts();
    const timer = setInterval(() => {
      void refreshAccounts();
      void loadTransactions(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [isAuthenticated, refreshAccounts, resetAccounts, loadTransactions]);

  // Raccourci clavier Ctrl+K / Cmd+K pour la palette de commande rapide
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

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

  const userAccountKey = accountIdForUsername(username);

  const userAccount = INTERNAL_ACCOUNTS[userAccountKey] || INTERNAL_ACCOUNTS['ACC-USER-003'];

  const accountData = {
    accountId: userAccount.accountId,
    iban: userAccount.iban,
    holderName: userAccount.holderName,
    // Solde réel renvoyé par le serveur ; valeur de démonstration d'amorçage tant que la première lecture n'est pas arrivée.
    balanceMinor:
      accounts.find((a) => a.accountId === userAccount.accountId)?.balanceMinor ??
      (username === 'bob'
        ? 50000
        : username === 'admin'
        ? 5000000
        : username === 'alice'
        ? 100000
        : 1425000),
    monthlyInflowMinor: 485000,
    monthlyOutflowMinor: 145000,
  };

  const recentTransactions = transactions.slice(0, 4);
  const criticalEventsCount = auditLogs.filter((l) => l.severity === 'CRITICAL').length;

  const commandResults = transactions
    .filter((tx) => {
      if (!commandQuery.trim()) return true;
      const q = commandQuery.toLowerCase();
      return (
        tx.counterpartyName.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenCommand={() => setCommandOpen(true)}
    >
      <MfaModal />
      <ControlTowerDrawer />

      {/* Palette de commande rapide (Ctrl+K) */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-obsidian-700/70">
            <DialogTitle className="sr-only">Recherche rapide OmniPay</DialogTitle>
            <DialogDescription className="sr-only">
              Rechercher une transaction ou naviguer entre les modules
            </DialogDescription>
            <div className="relative flex items-center">
              <MagnifyingGlass className="h-4 w-4 text-gold-400 shrink-0 mr-3" />
              <input
                type="text"
                placeholder="Rechercher une opération, un bénéficiaire ou une action..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="w-full bg-transparent body-5 text-platinum-50 placeholder-platinum-500 focus:outline-none"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
            <div className="space-y-1">
              <span className="px-2 caption-5 text-platinum-500 block">Navigation directe</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setCommandOpen(false);
                  }}
                  className="p-2.5 rounded-lg text-left caption-4 text-platinum-200 hover:bg-obsidian-800 hover:text-platinum-50 transition-colors cursor-pointer"
                >
                  Vue d’ensemble
                </button>
                {transfersAllowed && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('transfers');
                      setCommandOpen(false);
                    }}
                    className="p-2.5 rounded-lg text-left caption-4 text-platinum-200 hover:bg-obsidian-800 hover:text-platinum-50 transition-colors cursor-pointer"
                  >
                    Nouveau virement SEPA
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('history');
                    setCommandOpen(false);
                  }}
                  className="p-2.5 rounded-lg text-left caption-4 text-platinum-200 hover:bg-obsidian-800 hover:text-platinum-50 transition-colors cursor-pointer"
                >
                  Historique complet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('security');
                    setCommandOpen(false);
                  }}
                  className="p-2.5 rounded-lg text-left caption-4 text-platinum-200 hover:bg-obsidian-800 hover:text-platinum-50 transition-colors cursor-pointer"
                >
                  Centre de sécurité
                </button>
              </div>
            </div>

            {commandResults.length > 0 && (
              <div className="space-y-1">
                <span className="px-2 caption-5 text-platinum-500 block">Opérations correspondantes</span>
                <div className="space-y-1">
                  {commandResults.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setCommandOpen(false);
                      }}
                      className="w-full p-2.5 rounded-lg flex items-center justify-between gap-3 text-left hover:bg-obsidian-800 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="caption-3 text-platinum-50 truncate">{tx.counterpartyName}</div>
                        <div className="caption-5 text-platinum-400 truncate">{tx.reason}</div>
                      </div>
                      <span
                        className={`font-mono tabular-nums caption-3 shrink-0 ${
                          tx.direction === 'DEBIT' ? 'text-platinum-50' : 'text-emerald-500'
                        }`}
                      >
                        {tx.direction === 'DEBIT' ? '-' : '+'}
                        {formatMinorToCurrency(tx.amountMinor)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!isAuthenticated ? (
        <LoginForm />
      ) : (
        <div className="space-y-8">
          {/* En-tête éditorial sobre */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-obsidian-700/60">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="caption-3 text-gold-400">
                  Espace bancaire privé
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${roleInfo.badgeClass}`}
                >
                  {roleInfo.label}
                </span>
              </div>
              <h1 className="heading-5 sm:heading-4 text-platinum-50">
                Bienvenue, {accountData.holderName.split(' ')[0]}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {transfersAllowed && activeTab !== 'transfers' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('transfers')}
                >
                  <PaperPlaneTilt className="h-4 w-4 shrink-0" />
                  <span>Nouveau virement</span>
                </Button>
              )}
              {controlTowerAllowed && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openDrawer}
                >
                  <Gauge className="h-4 w-4 text-gold-400 shrink-0" />
                  <span>Tour de contrôle</span>
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Tab 1: Dashboard Signature View */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
                className="space-y-8"
              >
                {/* Bandeau 1 (Asymétrique 8/4) : Solde & Flux Mensuels */}
                <AccountSummary
                  accountId={accountData.accountId}
                  iban={accountData.iban}
                  balanceMinor={accountData.balanceMinor}
                  monthlyInflowMinor={accountData.monthlyInflowMinor}
                  monthlyOutflowMinor={accountData.monthlyOutflowMinor}
                  transfersAllowed={transfersAllowed}
                  onQuickTransfer={() => setActiveTab('transfers')}
                />

                {/* Bandeau 2 (Asymétrique 7/5) : Courbe Évolution du Solde + Écrin Carte 3D */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7">
                    <BalanceEvolutionChart
                      currentBalanceMinor={accountData.balanceMinor}
                      transactions={transactions}
                    />
                  </div>

                  <Card className="lg:col-span-5 p-6 space-y-5 flex flex-col justify-between">
                    <CardHeader className="mb-0">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-gold-400 shrink-0" />
                          <span>Carte Ultra Platinum</span>
                        </CardTitle>
                        <CardDescription>
                          Titulaire : {activeCard.cardholderName}
                        </CardDescription>
                      </div>
                      <Badge variant={activeCard.isFrozen ? 'danger' : 'gold'} dot>
                        {activeCard.isFrozen ? 'Gelée' : 'Active'}
                      </Badge>
                    </CardHeader>

                    <CreditCard3D card={activeCard} canManage={cardManagementAllowed} />

                    <SpendLimitsCard
                      spentMinor={activeCard.currentMonthSpentMinor}
                      limitMinor={activeCard.monthlySpendLimitMinor}
                    />
                  </Card>
                </div>

                {/* Bandeau 3 (Asymétrique 7/5) : Opérations récentes & Posture Zero-Trust */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Dernières opérations certifiées */}
                  <Card className="lg:col-span-7 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4 pb-3 border-b border-obsidian-700/60">
                      <div className="flex items-center gap-2.5">
                        <Receipt className="h-5 w-5 text-gold-400 shrink-0" />
                        <div>
                          <h3 className="title-3 text-platinum-50 font-semibold">
                            Activité récente du compte
                          </h3>
                          <p className="caption-5 text-platinum-400">
                            Cliquez sur une ligne pour consulter son sceau cryptographique.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="inline-flex items-center gap-1 caption-3 text-gold-400 hover:text-gold-300 transition-colors cursor-pointer shrink-0"
                      >
                        <span>Tout voir</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {txLoading && recentTransactions.length === 0 ? (
                      <div className="space-y-2.5">
                        {[0, 1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : recentTransactions.length === 0 ? (
                      <div className="p-6 text-center rounded-lg bg-obsidian-950/60 border border-obsidian-700/60">
                        <p className="caption-2 text-platinum-400">
                          Aucune opération enregistrée sur cette session.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentTransactions.map((tx) => (
                          <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            onClick={(t) => setSelectedTransaction(t)}
                          />
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Actions rapides & Posture Zero-Trust */}
                  <Card variant="flat" className="lg:col-span-5 p-6 space-y-5">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-obsidian-700/60">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                        <h3 className="title-3 text-platinum-50 font-semibold">
                          Posture Zero-Trust & accès rapides
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="inline-flex items-center gap-1 caption-3 text-platinum-200 hover:text-gold-400 transition-colors cursor-pointer shrink-0"
                      >
                        <span>Sécurité</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Indicateurs réels de sécurité & SLO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-lg bg-obsidian-950/70 border border-obsidian-700/70 space-y-1">
                        <span className="caption-5 text-platinum-400">Sessions JWT</span>
                        <div className="title-3 font-mono tabular-nums text-platinum-50">
                          {activeSessions.length} active{activeSessions.length > 1 ? 's' : ''}
                        </div>
                        <span className="caption-5 text-emerald-500">
                          {trustedDevices.length} clés FIDO2
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-obsidian-950/70 border border-obsidian-700/70 space-y-1">
                        <span className="caption-5 text-platinum-400">Sonde eBPF</span>
                        <div className="title-3 font-mono tabular-nums text-platinum-50">
                          {metrics.falco.status}
                        </div>
                        <span className="caption-5 text-platinum-400 tabular-nums">
                          {criticalEventsCount} alerte{criticalEventsCount > 1 ? 's' : ''} critique{criticalEventsCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-obsidian-950/70 border border-obsidian-700/70 space-y-1">
                        <span className="caption-5 text-platinum-400">SLO cluster</span>
                        <div className="title-3 font-mono tabular-nums text-emerald-500 flex items-center gap-1.5">
                          <Pulse className="h-4 w-4 shrink-0" />
                          <span>{metrics.slo.availabilityPercent}%</span>
                        </div>
                        <span className="caption-5 text-platinum-400 tabular-nums">
                          ArgoCD {metrics.argoCd.syncStatus}
                        </span>
                      </div>
                    </div>

                    {/* Actions rapides réelles */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-obsidian-700/60">
                      {transfersAllowed && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveTab('transfers')}
                          className="w-full"
                        >
                          <PaperPlaneTilt className="h-4 w-4 shrink-0" />
                          <span>Virement</span>
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('history')}
                        className="w-full"
                      >
                        <Receipt className="h-4 w-4 shrink-0" />
                        <span>Historique</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('security')}
                        className="w-full"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Audit RBAC</span>
                      </Button>
                      {controlTowerAllowed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openDrawer}
                          className="w-full"
                        >
                          <Gauge className="h-4 w-4 shrink-0" />
                          <span>Mode Jury</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Drawer latéral accessible directement depuis le dashboard */}
                <TransactionDrawer
                  transaction={selectedTransaction}
                  onClose={() => setSelectedTransaction(null)}
                />
              </motion.div>
            )}

            {/* Tab 2: 5-Step Transfer Wizard (Uniquement si autorisé) */}
            {transfersAllowed && activeTab === 'transfers' && (
              <motion.div
                key="transfers"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
                className="max-w-3xl mx-auto w-full"
              >
                <TransferWizard onGoToHistory={() => setActiveTab('history')} />
              </motion.div>
            )}

            {/* Tab 3: Paginated Transaction History */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
              >
                <TransactionHistory />
              </motion.div>
            )}

            {/* Tab 4: Security Center & RBAC Audit */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
              >
                <SecurityCenter />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  );
}

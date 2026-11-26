/**
 * OmniPay Zero-Trust - Transfer Store (Zustand)
 * Manages 5-step wizard state, verified beneficiaries list,
 * idempotency token preservation, and final receipt generation.
 *
 * Idempotence : une clé X-Idempotency-Key est attachée à une *intention* de virement (bénéficiaire + montant + motif).
 * Tous les clics répétés sur la même intention réutilisent la même clé : le serveur n'exécute qu'un seul virement
 * et rejoue la réponse d'origine (statut IDEMPOTENT_REPLAY -> toast jaune). La clé change quand l'intention change,
 * après un succès (nouveau virement) ou après un rejet définitif (4xx) ; elle est conservée après une erreur
 * réseau ou 5xx pour pouvoir réessayer sans double débit.
 */

import { create } from 'zustand';
import {
  Beneficiary,
  TransferDraft,
  TransferReceipt,
  TransferStep,
} from './transfers.types';
import { submitTransferApi, TransferApiError, IDEMPOTENT_REPLAY_STATUS } from './transfers.api';
import { formatMinorToCurrency, formatMinorToDecimal } from '../../shared/lib/money';
import {
  INTERNAL_ACCOUNTS,
  accountIdForUsername,
  resolveIbanToInternalAccount,
  validateIban,
} from '../../shared/lib/iban';
import { toast } from '../../shared/ui/toast/toast.store';
import { useAuthStore } from '../auth/auth.store';
import { useAccountsStore } from '../accounts/accounts.store';
import { useTransactionsStore } from '../transactions/transactions.store';
import { useJuryStore } from '../jury/jury.store';

// Initial verified beneficiaries (OmniPay ecosystem)
const DEFAULT_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-bob',
    name: 'Bob Martin',
    iban: 'FR41 1005 8000 0100 0000 0002 024',
    bankName: 'OmniPay Retail Banking',
    avatarInitials: 'BM',
    isRecent: true,
    accountId: 'ACC-BOB-002',
  },
  {
    id: 'ben-alice',
    name: 'Alice Dupont',
    iban: 'FR91 1005 8000 0100 0000 0001 027',
    bankName: 'OmniPay Retail Banking',
    avatarInitials: 'AD',
    isRecent: true,
    accountId: 'ACC-ALICE-001',
  },
  {
    id: 'ben-treasury',
    name: 'Direction Générale OmniPay',
    iban: 'FR38 1005 8000 0100 0000 0004 018',
    bankName: 'OmniPay Treasury & Settlement',
    avatarInitials: 'OP',
    isRecent: false,
    accountId: 'ACC-ADMIN-004',
  },
];

interface TransferState {
  currentStep: TransferStep;
  draft: TransferDraft;
  beneficiaries: Beneficiary[];
  idempotencyKey: string;
  lastReceipt: TransferReceipt | null;
  isLoading: boolean;
  /** Nombre de requêtes de virement en vol (les clics répétés ne sont volontairement pas bloqués côté client). */
  pendingCount: number;
  errorMessage: string | null;

  // Actions
  setStep: (step: TransferStep) => void;
  selectBeneficiary: (beneficiary: Beneficiary) => void;
  addCustomBeneficiary: (name: string, iban: string) => Beneficiary;
  setAmountMinor: (amountMinor: number) => void;
  setReason: (reason: string) => void;
  setInstant: (instant: boolean) => void;
  resetWizard: () => void;
  submitTransfer: () => Promise<boolean>;
}

const EMPTY_DRAFT: TransferDraft = {
  beneficiary: null,
  amountMinor: 0,
  reason: '',
  instant: true,
  feeMinor: 0,
};

/** Libellé bancaire exact d'un rejet pour fonds insuffisants (HTTP 422). */
export function insufficientFundsMessage(availableMinor: number | undefined, requestedMinor: number): string {
  if (availableMinor === undefined) {
    return `Fonds insuffisants pour un montant requis de ${formatMinorToCurrency(requestedMinor)}.`;
  }
  return `Fonds insuffisants : solde disponible ${formatMinorToCurrency(availableMinor)} vs montant requis ${formatMinorToCurrency(requestedMinor)}`;
}

/** Relit solde et historique sans recharger la page. */
async function refreshAccountData(): Promise<void> {
  await Promise.all([useAccountsStore.getState().refresh(), useTransactionsStore.getState().loadTransactions(true)]);
}

export const useTransferStore = create<TransferState>((set, get) => ({
  currentStep: 'beneficiary',
  draft: { ...EMPTY_DRAFT },
  beneficiaries: DEFAULT_BENEFICIARIES,
  idempotencyKey: crypto.randomUUID(),
  lastReceipt: null,
  isLoading: false,
  pendingCount: 0,
  errorMessage: null,

  setStep: (step) => set({ currentStep: step, errorMessage: null }),

  selectBeneficiary: (beneficiary) => {
    set((state) => ({
      draft: { ...state.draft, beneficiary },
      // Nouvelle intention (autre bénéficiaire) = nouvelle clé d'idempotence
      idempotencyKey: state.draft.beneficiary?.id === beneficiary.id ? state.idempotencyKey : crypto.randomUUID(),
      errorMessage: null,
    }));
  },

  addCustomBeneficiary: (name, iban) => {
    const validation = validateIban(iban);
    if (!validation.isValid) {
      throw new Error(validation.error || 'IBAN invalide');
    }

    const resolved = resolveIbanToInternalAccount(iban);
    const initials = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: name.trim(),
      iban: validation.formatted || iban,
      bankName: resolved?.bankName || 'Banque SEPA Externe',
      avatarInitials: initials || 'SE',
      isRecent: true,
      accountId: resolved?.accountId,
    };

    set((state) => ({
      beneficiaries: [newBen, ...state.beneficiaries],
      draft: { ...state.draft, beneficiary: newBen },
      idempotencyKey: crypto.randomUUID(),
      errorMessage: null,
    }));

    return newBen;
  },

  setAmountMinor: (amountMinor) => {
    set((state) => ({
      draft: { ...state.draft, amountMinor },
      idempotencyKey: state.draft.amountMinor === amountMinor ? state.idempotencyKey : crypto.randomUUID(),
      errorMessage: null,
    }));
  },

  setReason: (reason) => {
    const next = reason.slice(0, 140);
    set((state) => ({
      draft: { ...state.draft, reason: next },
      idempotencyKey: state.draft.reason === next ? state.idempotencyKey : crypto.randomUUID(),
      errorMessage: null,
    }));
  },

  setInstant: (instant) => {
    set((state) => ({
      draft: { ...state.draft, instant },
    }));
  },

  resetWizard: () => {
    set({
      currentStep: 'beneficiary',
      draft: { ...EMPTY_DRAFT },
      idempotencyKey: crypto.randomUUID(),
      lastReceipt: null,
      isLoading: false,
      pendingCount: 0,
      errorMessage: null,
    });
  },

  submitTransfer: async () => {
    // La clé est figée au moment du clic : tous les clics sur la même intention portent la même clé.
    const { draft, idempotencyKey } = get();

    if (!draft.beneficiary) {
      set({ errorMessage: 'Veuillez sélectionner un bénéficiaire valide.' });
      return false;
    }

    if (draft.amountMinor <= 0) {
      set({ errorMessage: 'Le montant du virement doit être supérieur à 0,00 €.' });
      return false;
    }

    set((state) => ({ isLoading: true, pendingCount: state.pendingCount + 1, errorMessage: null }));

    const requestedMinor = draft.amountMinor;
    const beneficiaryName = draft.beneficiary.name;
    // Resolve backend account ID
    const resolved = resolveIbanToInternalAccount(draft.beneficiary.iban);
    const targetAccount = resolved?.accountId || draft.beneficiary.accountId || 'ACC-BOB-002';
    const decimalAmount = parseFloat(formatMinorToDecimal(requestedMinor));

    try {
      const response = await submitTransferApi(
        {
          targetAccount,
          amount: decimalAmount,
          reason: draft.reason || undefined,
        },
        idempotencyKey
      );

      const isReplay = response.status === IDEMPOTENT_REPLAY_STATUS;

      if (isReplay) {
        // Jaune : requête dupliquée interceptée par l'idempotence, aucun second prélèvement.
        toast.warning('Requête dupliquée interceptée', 'Transaction déjà enregistrée, pas de double prélèvement');
      } else {
        // Vert : virement confirmé avec l'identifiant de transaction.
        toast.success(
          'Virement confirmé',
          `${formatMinorToCurrency(requestedMinor)} envoyés à ${beneficiaryName}. Transaction ${response.transactionId}.`
        );
        if (useJuryStore.getState().notificationOutage) {
          // Bleu : panne SIMULÉE du notification-service ; le virement reste validé (aucun appel inter-services).
          toast.info(
            'Notification indisponible (panne simulée)',
            'Le virement reste validé : le notification-service est découplé du chemin de paiement.'
          );
        }
      }

      // Reçu : construit une seule fois par transaction (un rejeu renvoie le même transactionId).
      if (get().lastReceipt?.transactionId !== response.transactionId) {
        const session = useAuthStore.getState().session;
        const sourceAccountId = accountIdForUsername(session?.username);
        const source = INTERNAL_ACCOUNTS[sourceAccountId] || INTERNAL_ACCOUNTS['ACC-USER-003'];

        const receipt: TransferReceipt = {
          transactionId: response.transactionId,
          status: 'SUCCESS',
          amountMinor: requestedMinor,
          currency: 'EUR',
          sourceAccount: source.accountId,
          sourceIban: source.iban,
          sourceHolderName: source.holderName,
          targetAccount,
          targetIban: draft.beneficiary.iban,
          targetHolderName: beneficiaryName,
          reason: draft.reason || 'Virement ponctuel SEPA',
          executedAt: new Date().toISOString(),
          idempotencyKey,
          securitySealHash: `ESTC-SEAL-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          clearingNetwork: draft.instant
            ? 'SEPA INSTANT SETTLEMENT (TIPS / RT1)'
            : 'SEPA STANDARD CLEARING (STEP2)',
        };

        set({ lastReceipt: receipt, currentStep: 'success' });
      }

      // Rafraîchissement automatique du solde et de l'historique, sans rechargement de page.
      await refreshAccountData();
      return true;
    } catch (err: unknown) {
      const apiError = err instanceof TransferApiError ? err : null;
      let message = apiError ? apiError.message : 'Une erreur imprévue est survenue lors de la transmission du virement.';

      if (apiError?.status === 422) {
        // Rouge : rejet explicite avec le solde réel relu juste après le refus.
        const fresh = await useAccountsStore.getState().refresh();
        const available = (fresh ?? useAccountsStore.getState().accounts)[0]?.balanceMinor;
        message = insufficientFundsMessage(available, requestedMinor);
      }

      if (apiError?.code === 'DUPLICATE_IDEMPOTENT_SUBMISSION') {
        toast.warning('Requête dupliquée interceptée', 'Transaction déjà enregistrée, pas de double prélèvement');
      } else {
        toast.error('Virement rejeté', message);
      }

      // Rejet définitif (4xx hors 429) : la prochaine tentative est une nouvelle intention, donc une nouvelle clé.
      const definitive = !!apiError && apiError.status !== undefined && apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429;
      set({
        errorMessage: message,
        ...(definitive && get().idempotencyKey === idempotencyKey ? { idempotencyKey: crypto.randomUUID() } : {}),
      });

      if (apiError?.status !== 422) {
        void refreshAccountData();
      } else {
        void useTransactionsStore.getState().loadTransactions(true);
      }
      return false;
    } finally {
      set((state) => {
        const pendingCount = Math.max(0, state.pendingCount - 1);
        return { pendingCount, isLoading: pendingCount > 0 };
      });
    }
  },
}));

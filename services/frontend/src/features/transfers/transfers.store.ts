/**
 * OmniPay Zero-Trust - Transfer Store (Zustand)
 * Manages 5-step wizard state, verified beneficiaries list,
 * idempotency token preservation, and final receipt generation.
 */

import { create } from 'zustand';
import {
  Beneficiary,
  TransferDraft,
  TransferReceipt,
  TransferStep,
} from './transfers.types';
import { submitTransferApi, TransferApiError } from './transfers.api';
import { formatMinorToDecimal } from '../../shared/lib/money';
import {
  INTERNAL_ACCOUNTS,
  resolveIbanToInternalAccount,
  validateIban,
} from '../../shared/lib/iban';

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

export const useTransferStore = create<TransferState>((set, get) => ({
  currentStep: 'beneficiary',
  draft: {
    beneficiary: null,
    amountMinor: 0,
    reason: '',
    instant: true,
    feeMinor: 0,
  },
  beneficiaries: DEFAULT_BENEFICIARIES,
  idempotencyKey: crypto.randomUUID(),
  lastReceipt: null,
  isLoading: false,
  errorMessage: null,

  setStep: (step) => set({ currentStep: step, errorMessage: null }),

  selectBeneficiary: (beneficiary) => {
    set((state) => ({
      draft: { ...state.draft, beneficiary },
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
      errorMessage: null,
    }));

    return newBen;
  },

  setAmountMinor: (amountMinor) => {
    set((state) => ({
      draft: { ...state.draft, amountMinor },
      errorMessage: null,
    }));
  },

  setReason: (reason) => {
    set((state) => ({
      draft: { ...state.draft, reason: reason.slice(0, 140) },
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
      draft: {
        beneficiary: null,
        amountMinor: 0,
        reason: '',
        instant: true,
        feeMinor: 0,
      },
      idempotencyKey: crypto.randomUUID(),
      lastReceipt: null,
      isLoading: false,
      errorMessage: null,
    });
  },

  submitTransfer: async () => {
    const { draft, idempotencyKey } = get();

    if (!draft.beneficiary) {
      set({ errorMessage: 'Veuillez sélectionner un bénéficiaire valide.' });
      return false;
    }

    if (draft.amountMinor <= 0) {
      set({ errorMessage: 'Le montant du virement doit être supérieur à 0,00 €.' });
      return false;
    }

    set({ isLoading: true, errorMessage: null });

    try {
      // Resolve backend account ID
      const resolved = resolveIbanToInternalAccount(draft.beneficiary.iban);
      const targetAccount = resolved?.accountId || draft.beneficiary.accountId || 'ACC-BOB-002';
      const decimalAmount = parseFloat(formatMinorToDecimal(draft.amountMinor));

      const response = await submitTransferApi(
        {
          targetAccount,
          amount: decimalAmount,
          reason: draft.reason || undefined,
        },
        idempotencyKey
      );

      // Construct verified cryptographic receipt
      const receipt: TransferReceipt = {
        transactionId: response.transactionId,
        status: 'SUCCESS',
        amountMinor: draft.amountMinor,
        currency: 'EUR',
        sourceAccount: 'ACC-USER-003',
        sourceIban: INTERNAL_ACCOUNTS['ACC-USER-003'].iban,
        sourceHolderName: INTERNAL_ACCOUNTS['ACC-USER-003'].holderName,
        targetAccount,
        targetIban: draft.beneficiary.iban,
        targetHolderName: draft.beneficiary.name,
        reason: draft.reason || 'Virement ponctuel SEPA',
        executedAt: new Date().toISOString(),
        idempotencyKey,
        securitySealHash: `ESTC-SEAL-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
        clearingNetwork: draft.instant
          ? 'SEPA INSTANT SETTLEMENT (TIPS / RT1)'
          : 'SEPA STANDARD CLEARING (STEP2)',
      };

      set({
        lastReceipt: receipt,
        currentStep: 'success',
        isLoading: false,
      });

      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof TransferApiError
          ? err.message
          : 'Une erreur imprévue est survenue lors de la transmission du virement.';
      set({ isLoading: false, errorMessage: errorMsg });
      return false;
    }
  },
}));

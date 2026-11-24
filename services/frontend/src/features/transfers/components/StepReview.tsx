import React from 'react';
import { ArrowLeft, ShieldCheck, Zap, Lock, KeyRound, Building2 } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban, INTERNAL_ACCOUNTS } from '../../../shared/lib/iban';

export const StepReview: React.FC = () => {
  const { draft, idempotencyKey, setStep } = useTransferStore();
  const userAccount = INTERNAL_ACCOUNTS['ACC-USER-003'];

  if (!draft.beneficiary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Review Card */}
      <div className="bg-[#070A12] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[var(--color-gold)]" />
            <h4 className="text-sm font-semibold text-white">
              Récapitulatif avant authentification forte
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-2 py-0.5 rounded-md border border-[var(--color-emerald)]/20">
            Contrat SEPA vérifié
          </span>
        </div>

        {/* Amount big banner */}
        <div className="text-center py-4 bg-[#0B101E]/60 rounded-xl border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">Montant à transférer</span>
          <span className="text-4xl font-extrabold font-mono text-[var(--color-gold)]">
            {formatMinorToCurrency(draft.amountMinor)}
          </span>
          <span className="text-[11px] text-gray-400 block mt-1">
            Frais bancaires : <strong className="text-[var(--color-emerald)]">0,00 €</strong> (Inclus Ultra Platinum)
          </span>
        </div>

        {/* Flow: Emetteur -> Beneficiaire */}
        <div className="space-y-3">
          {/* Debtor */}
          <div className="p-3.5 bg-[#0B101E] rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Compte à débiter</span>
              <span className="text-xs font-semibold text-white block mt-0.5">{userAccount.holderName}</span>
              <span className="text-[11px] font-mono text-gray-400 block">{maskIban(userAccount.iban)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block">Banque émettrice</span>
              <span className="text-xs text-gray-300">OmniPay Zero-Trust</span>
            </div>
          </div>

          {/* Creditor */}
          <div className="p-3.5 bg-[#0B101E] rounded-xl border border-[var(--color-gold)]/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--color-gold)] block">Compte bénéficiaire</span>
              <span className="text-xs font-semibold text-white block mt-0.5">{draft.beneficiary.name}</span>
              <span className="text-[11px] font-mono text-gray-400 block">{draft.beneficiary.iban}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block">Établissement</span>
              <span className="text-xs text-gray-300 flex items-center justify-end gap-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {draft.beneficiary.bankName}
              </span>
            </div>
          </div>
        </div>

        {/* Operational details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
            <span className="text-gray-400 block text-[11px]">Type d'exécution</span>
            <span className="font-semibold text-white flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              {draft.instant ? 'Virement Instantané SEPA (10s)' : 'Virement SEPA Standard (J+1)'}
            </span>
          </div>

          <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
            <span className="text-gray-400 block text-[11px]">Motif du virement</span>
            <span className="font-semibold text-white truncate block mt-0.5">
              {draft.reason || 'Virement ponctuel SEPA'}
            </span>
          </div>
        </div>

        {/* Technical DevSecOps Idempotency Note */}
        <div className="p-3 bg-[#070A12] border border-white/5 rounded-xl flex items-start gap-2.5 text-[11px] text-gray-400">
          <KeyRound className="w-4 h-4 text-[var(--color-gold)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-300">Garantie d'idempotence Zero-Trust : </span>
            <span>Clé unique </span>
            <code className="text-[var(--color-gold)] font-mono">{idempotencyKey.slice(0, 18)}...</code>
            <span> générée. En cas de coupure réseau, la transaction ne sera jamais exécutée en double.</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep('amount')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Modifier le montant</span>
        </button>

        <button
          type="button"
          onClick={() => setStep('mfa')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-lg shadow-[var(--color-gold)]/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Authentifier le virement</span>
        </button>
      </div>
    </div>
  );
};

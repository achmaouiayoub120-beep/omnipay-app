import React from 'react';
import { ArrowLeft, ShieldCheck, Lightning, Lock, Key, Buildings } from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban, INTERNAL_ACCOUNTS } from '../../../shared/lib/iban';
import { Button } from '@/shared/ui';

export const StepReview: React.FC = () => {
  const { draft, idempotencyKey, setStep } = useTransferStore();
  const userAccount = INTERNAL_ACCOUNTS['ACC-USER-003'];

  if (!draft.beneficiary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Review Card */}
      <div className="bg-obsidian-950/70 border border-obsidian-700/80 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-obsidian-700/60">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-gold-400 shrink-0" />
            <h4 className="title-4 text-platinum-50 font-semibold">
              Récapitulatif avant authentification forte
            </h4>
          </div>
          <span className="caption-4 font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/25">
            Contrat SEPA vérifié
          </span>
        </div>

        {/* Amount banner */}
        <div className="text-center py-5 bg-obsidian-900 rounded-lg border border-obsidian-700/70 space-y-1">
          <span className="caption-4 text-platinum-400 block">Montant à transférer</span>
          <span className="heading-3 font-mono tabular-nums text-gold-400 block">
            {formatMinorToCurrency(draft.amountMinor)}
          </span>
          <span className="caption-5 text-platinum-400 block">
            Frais bancaires : <strong className="text-emerald-500">0,00 €</strong> (Inclus Ultra Platinum)
          </span>
        </div>

        {/* Flow: Emetteur -> Beneficiaire */}
        <div className="space-y-3">
          <div className="p-3.5 bg-obsidian-900 rounded-lg border border-obsidian-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="caption-5 text-platinum-400 block">Compte à débiter</span>
              <span className="caption-3 text-platinum-50 block mt-0.5">{userAccount.holderName}</span>
              <span className="caption-5 font-mono tabular-nums text-platinum-400 block">{maskIban(userAccount.iban)}</span>
            </div>
            <div className="sm:text-right">
              <span className="caption-5 text-platinum-400 block">Banque émettrice</span>
              <span className="caption-4 text-platinum-200">OmniPay Zero-Trust</span>
            </div>
          </div>

          <div className="p-3.5 bg-obsidian-900 rounded-lg border border-gold-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="caption-5 text-gold-400 block">Compte bénéficiaire</span>
              <span className="caption-3 text-platinum-50 block mt-0.5">{draft.beneficiary.name}</span>
              <span className="caption-5 font-mono tabular-nums text-platinum-400 block">{draft.beneficiary.iban}</span>
            </div>
            <div className="sm:text-right">
              <span className="caption-5 text-platinum-400 block">Établissement</span>
              <span className="caption-4 text-platinum-200 inline-flex items-center gap-1">
                <Buildings className="w-3.5 h-3.5 text-platinum-400" />
                {draft.beneficiary.bankName}
              </span>
            </div>
          </div>
        </div>

        {/* Operational details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-obsidian-900 rounded-lg border border-obsidian-700/70">
            <span className="text-platinum-400 block caption-5">Type d’exécution</span>
            <span className="caption-3 text-platinum-50 flex items-center gap-1.5 mt-0.5">
              <Lightning className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              {draft.instant ? 'Virement instantané SEPA (10s)' : 'Virement SEPA standard (J+1)'}
            </span>
          </div>

          <div className="p-3 bg-obsidian-900 rounded-lg border border-obsidian-700/70">
            <span className="text-platinum-400 block caption-5">Motif du virement</span>
            <span className="caption-3 text-platinum-50 truncate block mt-0.5">
              {draft.reason || 'Virement ponctuel SEPA'}
            </span>
          </div>
        </div>

        {/* Idempotency Note */}
        <div className="p-3.5 bg-obsidian-900 border border-obsidian-700/70 rounded-lg flex items-start gap-2.5 caption-5 text-platinum-400">
          <Key className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-platinum-200">Garantie d’idempotence Zero-Trust : </span>
            <span>Clé unique </span>
            <code className="text-gold-400 font-mono">{idempotencyKey.slice(0, 18)}...</code>
            <span> générée pour prévenir toute double exécution en cas de coupure réseau.</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('amount')}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Modifier le montant</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setStep('mfa')}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Authentifier le virement</span>
        </Button>
      </div>
    </div>
  );
};

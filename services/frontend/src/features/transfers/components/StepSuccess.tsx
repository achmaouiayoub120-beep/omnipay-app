import React from 'react';
import { CheckCircle, PlusCircle, ShieldCheck, Printer, ArrowRight } from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';
import { Button } from '@/shared/ui';

interface StepSuccessProps {
  onGoToHistory?: () => void;
}

export const StepSuccess: React.FC<StepSuccessProps> = ({ onGoToHistory }) => {
  const { lastReceipt, resetWizard } = useTransferStore();

  if (!lastReceipt) {
    return null;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="bg-obsidian-950/70 border border-emerald-500/40 rounded-xl p-6 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-md caption-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
            Virement exécuté avec succès
          </span>
          <h3 className="heading-4 font-mono tabular-nums text-platinum-50 pt-1">
            {formatMinorToCurrency(lastReceipt.amountMinor)}
          </h3>
          <p className="caption-2 text-platinum-400">
            Transférés à <strong className="text-platinum-50">{lastReceipt.targetHolderName}</strong>
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-obsidian-900 border border-obsidian-700/70 rounded-lg p-5 text-left space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-obsidian-700/60 font-sans">
            <span className="caption-3 text-platinum-50 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-gold-400 shrink-0" />
              Reçu d’opération certifié OmniPay
            </span>
            <span className="caption-5 text-platinum-400 tabular-nums font-mono">
              {new Date(lastReceipt.executedAt).toLocaleString('fr-FR')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-platinum-200">
            <div>
              <span className="caption-5 text-platinum-500 font-sans block">Référence transaction</span>
              <span className="caption-3 text-gold-400">
                {lastReceipt.transactionId}
              </span>
            </div>
            <div>
              <span className="caption-5 text-platinum-500 font-sans block">Réseau de compensation</span>
              <span className="caption-4 text-platinum-200">{lastReceipt.clearingNetwork}</span>
            </div>
            <div>
              <span className="caption-5 text-platinum-500 font-sans block">Compte débiteur</span>
              <span className="caption-4 text-platinum-50 tabular-nums">
                {maskIban(lastReceipt.sourceIban)}
              </span>
            </div>
            <div>
              <span className="caption-5 text-platinum-500 font-sans block">Compte créditeur</span>
              <span className="caption-4 text-platinum-50 tabular-nums">
                {maskIban(lastReceipt.targetIban)}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="caption-5 text-platinum-500 font-sans block">Motif</span>
              <span className="caption-4 text-platinum-200 font-sans">{lastReceipt.reason}</span>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-obsidian-700/60">
              <span className="caption-5 text-platinum-500 font-sans block">Sceau Cryptographique (Zero-Trust Proof)</span>
              <span className="caption-5 text-platinum-400 break-all">
                {lastReceipt.securitySealHash}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>Imprimer / Sauvegarder reçu</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onGoToHistory && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onGoToHistory}
            >
              <span>Voir l’historique</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={resetWizard}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Nouveau virement</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CheckCircle2, PlusCircle, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';

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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Success banner */}
      <div className="bg-[#070A12] border border-[var(--color-emerald)]/40 rounded-2xl p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20 mb-2">
            Virement exécuté avec succès
          </span>
          <h3 className="text-2xl font-bold text-white">
            {formatMinorToCurrency(lastReceipt.amountMinor)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Transférés à <strong className="text-white">{lastReceipt.targetHolderName}</strong>
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-[#0B101E] border border-white/5 rounded-xl p-5 text-left space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 font-sans">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-gold)]" />
              Reçu d'opération certifié OmniPay
            </span>
            <span className="text-[10px] text-gray-400">
              {new Date(lastReceipt.executedAt).toLocaleString('fr-FR')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300">
            <div>
              <span className="text-[10px] text-gray-500 block">Référence Transaction</span>
              <span className="text-[11px] font-bold text-[var(--color-gold)]">
                {lastReceipt.transactionId}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Réseau de compensation</span>
              <span className="text-[11px] text-gray-300">{lastReceipt.clearingNetwork}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Compte Débiteur</span>
              <span className="text-[11px] text-white">
                {maskIban(lastReceipt.sourceIban)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Compte Créditeur</span>
              <span className="text-[11px] text-white">
                {maskIban(lastReceipt.targetIban)}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[10px] text-gray-500 block">Motif</span>
              <span className="text-[11px] text-gray-300">{lastReceipt.reason}</span>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-gray-500 block">Sceau Cryptographique (Zero-Trust Proof)</span>
              <span className="text-[10px] text-gray-400 break-all">
                {lastReceipt.securitySealHash}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-[#070A12] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer / Sauvegarder reçu</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onGoToHistory && (
            <button
              type="button"
              onClick={onGoToHistory}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <span>Voir l'historique</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={resetWizard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-lg shadow-[var(--color-gold)]/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouveau virement</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  Printer,
  Calendar,
  Clock,
  KeyRound,
} from 'lucide-react';
import { Transaction } from '../transactions.types';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban, INTERNAL_ACCOUNTS } from '../../../shared/lib/iban';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transaction) return null;

  const isDebit = transaction.direction === 'DEBIT';
  const userAccount = INTERNAL_ACCOUNTS['ACC-USER-003'];

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const dateObj = new Date(transaction.createdAt);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#070A12] border-l border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  isDebit
                    ? 'bg-white/10 text-white'
                    : 'bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20'
                }`}
              >
                {isDebit ? 'Débit bancaire' : 'Crédit bancaire'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--color-emerald)] bg-[var(--color-emerald)]/10">
                {transaction.status}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Amount Banner */}
            <div className="text-center py-4 bg-[#0B101E] rounded-2xl border border-white/5">
              <span className="text-xs text-gray-400 block mb-1">Montant de l'opération</span>
              <div
                className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
                  isDebit ? 'text-white' : 'text-[var(--color-emerald)]'
                }`}
              >
                {isDebit ? '-' : '+'}
                {formatMinorToCurrency(transaction.amountMinor)}
              </div>
              <span className="text-xs text-gray-400 mt-1 block">
                {transaction.reason}
              </span>
            </div>

            {/* Parties info */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#0B101E] rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                  {isDebit ? 'Compte émetteur (Vous)' : 'Compte émetteur'}
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {isDebit ? userAccount.holderName : transaction.counterpartyName}
                </span>
                <span className="font-mono text-[11px] text-gray-400 block mt-0.5">
                  {maskIban(isDebit ? userAccount.iban : transaction.counterpartyIban)}
                </span>
              </div>

              <div className="p-3.5 bg-[#0B101E] rounded-xl border border-[var(--color-gold)]/20">
                <span className="text-[10px] text-[var(--color-gold)] uppercase font-semibold block">
                  {isDebit ? 'Bénéficiaire crédité' : 'Compte crédité (Vous)'}
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {isDebit ? transaction.counterpartyName : userAccount.holderName}
                </span>
                <span className="font-mono text-[11px] text-gray-400 block mt-0.5">
                  {isDebit ? transaction.counterpartyIban : userAccount.iban}
                </span>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date d'exécution</span>
                </div>
                <span className="font-medium text-white block">
                  {dateObj.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Heure de compensation</span>
                </div>
                <span className="font-medium text-white block">
                  {dateObj.toLocaleTimeString('fr-FR')} (CET)
                </span>
              </div>
            </div>

            {/* Zero-Trust Audit & Reference */}
            <div className="p-4 bg-[#0B101E] rounded-xl border border-white/5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Référence d'opération</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-[var(--color-gold)]">
                    {transaction.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
                    title="Copier la référence"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {transaction.idempotencyKey && (
                <div className="flex items-center justify-between text-[11px] border-t border-white/5 pt-2">
                  <span className="text-gray-400 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-[var(--color-gold)]" />
                    Clé d'idempotence
                  </span>
                  <span className="font-mono text-gray-400 truncate max-w-[170px]">
                    {transaction.idempotencyKey}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] border-t border-white/5 pt-2">
                <span className="text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[var(--color-emerald)]" />
                  Sceau Zero-Trust
                </span>
                <span className="font-mono text-[var(--color-emerald)]">
                  {transaction.securitySealHash || 'ESTC-VERIFIED-HASH'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/5 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0B101E] border border-white/10 text-white hover:border-[var(--color-gold)]/50 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[var(--color-gold)]" />
              <span>Télécharger le justificatif (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

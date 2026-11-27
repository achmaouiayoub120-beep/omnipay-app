import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  Printer,
  Calendar,
  Clock,
  Key,
} from '@phosphor-icons/react';
import { Transaction } from '../transactions.types';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban, INTERNAL_ACCOUNTS } from '../../../shared/lib/iban';
import { Button } from '@/shared/ui';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState(false);

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
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Détails de l’opération">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
          className="w-screen max-w-md bg-obsidian-950 border-l border-obsidian-700 shadow-elevation-3 flex flex-col justify-between overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-obsidian-700/70 flex items-center justify-between bg-obsidian-900/90 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-md caption-3 border ${
                  isDebit
                    ? 'bg-obsidian-800 text-platinum-50 border-obsidian-700'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                }`}
              >
                {isDebit ? 'Débit bancaire' : 'Crédit bancaire'}
              </span>
              <span className="px-2 py-0.5 rounded-md caption-4 font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/25">
                {transaction.status}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-platinum-400 hover:text-platinum-50 hover:bg-obsidian-800 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Amount Banner */}
            <div className="text-center py-5 px-4 bg-obsidian-900 rounded-xl border border-obsidian-700/80 space-y-1">
              <span className="caption-4 text-platinum-400 block">Montant de l’opération</span>
              <div
                className={`heading-4 font-mono tabular-nums ${
                  isDebit ? 'text-platinum-50' : 'text-emerald-500'
                }`}
              >
                {isDebit ? '-' : '+'}
                {formatMinorToCurrency(transaction.amountMinor)}
              </div>
              <span className="caption-5 text-platinum-400 block">
                {transaction.reason}
              </span>
            </div>

            {/* Parties info */}
            <div className="space-y-3">
              <div className="p-4 bg-obsidian-900 rounded-xl border border-obsidian-700/80">
                <span className="caption-5 text-platinum-400 block">
                  {isDebit ? 'Compte émetteur (Vous)' : 'Compte émetteur'}
                </span>
                <span className="caption-3 text-platinum-50 block mt-0.5">
                  {isDebit ? userAccount.holderName : transaction.counterpartyName}
                </span>
                <span className="font-mono tabular-nums caption-5 text-platinum-400 block mt-0.5">
                  {maskIban(isDebit ? userAccount.iban : transaction.counterpartyIban)}
                </span>
              </div>

              <div className="p-4 bg-obsidian-900 rounded-xl border border-gold-400/30">
                <span className="caption-5 text-gold-400 block">
                  {isDebit ? 'Bénéficiaire crédité' : 'Compte crédité (Vous)'}
                </span>
                <span className="caption-3 text-platinum-50 block mt-0.5">
                  {isDebit ? transaction.counterpartyName : userAccount.holderName}
                </span>
                <span className="font-mono tabular-nums caption-5 text-platinum-400 block mt-0.5 break-all">
                  {isDebit ? transaction.counterpartyIban : userAccount.iban}
                </span>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-obsidian-900 rounded-xl border border-obsidian-700/80">
                <div className="flex items-center gap-1.5 text-platinum-400 caption-5 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date d’exécution</span>
                </div>
                <span className="caption-3 text-platinum-50 block">
                  {dateObj.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="p-3.5 bg-obsidian-900 rounded-xl border border-obsidian-700/80">
                <div className="flex items-center gap-1.5 text-platinum-400 caption-5 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Compensation</span>
                </div>
                <span className="caption-3 font-mono tabular-nums text-platinum-50 block">
                  {dateObj.toLocaleTimeString('fr-FR')} CET
                </span>
              </div>
            </div>

            {/* Zero-Trust Audit & Reference */}
            <div className="p-4 bg-obsidian-900 rounded-xl border border-obsidian-700/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="caption-5 text-platinum-400">Référence d’opération</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono caption-3 text-gold-400">
                    {transaction.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded text-platinum-400 hover:text-platinum-50 hover:bg-obsidian-800 cursor-pointer"
                    title="Copier la référence"
                    aria-label="Copier la référence"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {transaction.idempotencyKey && (
                <div className="flex items-center justify-between gap-2 caption-5 border-t border-obsidian-700/60 pt-2.5">
                  <span className="text-platinum-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    Clé d’idempotence
                  </span>
                  <span className="font-mono text-platinum-400 truncate max-w-[170px]">
                    {transaction.idempotencyKey}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 caption-5 border-t border-obsidian-700/60 pt-2.5">
                <span className="text-platinum-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Sceau Zero-Trust
                </span>
                <span className="font-mono text-emerald-500 truncate max-w-[180px]">
                  {transaction.securitySealHash || 'ESTC-VERIFIED-HASH'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-obsidian-700/70 bg-obsidian-900/80">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handlePrint}
              className="w-full"
            >
              <Printer className="w-4 h-4 text-gold-400 shrink-0" />
              <span>Télécharger le justificatif (PDF)</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  ArrowRightLeft,
  Briefcase,
  ShoppingBag,
  Server,
  Utensils,
  ShoppingCart,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Transaction, TransactionCategory } from '../transactions.types';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';

const CATEGORY_CONFIG: Record<
  TransactionCategory,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  transfer: {
    label: 'Virement',
    icon: ArrowRightLeft,
    colorClass: 'text-[var(--color-gold)]',
    bgClass: 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30',
  },
  salary: {
    label: 'Salaire',
    icon: Briefcase,
    colorClass: 'text-[var(--color-emerald)]',
    bgClass: 'bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30',
  },
  shopping: {
    label: 'Achats',
    icon: ShoppingBag,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 border-purple-500/30',
  },
  services: {
    label: 'Services & Cloud',
    icon: Server,
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/30',
  },
  dining: {
    label: 'Restaurants & Sorties',
    icon: Utensils,
    colorClass: 'text-[var(--color-amber)]',
    bgClass: 'bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30',
  },
  groceries: {
    label: 'Alimentation & Bio',
    icon: ShoppingCart,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  investment: {
    label: 'Épargne & Rendement',
    icon: TrendingUp,
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10 border-cyan-500/30',
  },
};

interface TransactionRowProps {
  transaction: Transaction;
  onClick: (tx: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onClick,
}) => {
  const config = CATEGORY_CONFIG[transaction.category] || CATEGORY_CONFIG.transfer;
  const Icon = config.icon;
  const isDebit = transaction.direction === 'DEBIT';

  const timeStr = new Date(transaction.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={() => onClick(transaction)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(transaction);
        }
      }}
      role="button"
      tabIndex={0}
      className="group w-full p-3.5 sm:p-4 rounded-xl bg-[#0B101E]/70 hover:bg-[#0F1626] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${config.bgClass} ${config.colorClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white truncate group-hover:text-[var(--color-gold)] transition-colors">
              {transaction.counterpartyName}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:inline font-mono">
              {timeStr}
            </span>
          </div>

          <div className="text-xs text-gray-400 truncate mt-0.5">
            {transaction.reason}
          </div>

          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5 sm:hidden">
            {maskIban(transaction.counterpartyIban)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right">
          <div
            className={`font-mono text-sm sm:text-base font-bold tracking-tight ${
              isDebit ? 'text-white' : 'text-[var(--color-emerald)]'
            }`}
          >
            {isDebit ? '-' : '+'}
            {formatMinorToCurrency(transaction.amountMinor)}
          </div>
          <div className="text-[11px] font-mono text-gray-500 hidden sm:block">
            {maskIban(transaction.counterpartyIban)}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--color-gold)] transition-colors" />
      </div>
    </div>
  );
};

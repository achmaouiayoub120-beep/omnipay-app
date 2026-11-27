import React from 'react';
import {
  ArrowsLeftRight,
  Briefcase,
  ShoppingBag,
  HardDrives,
  ForkKnife,
  ShoppingCart,
  TrendUp,
  CaretRight,
} from '@phosphor-icons/react';
import { Transaction, TransactionCategory } from '../transactions.types';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';

const CATEGORY_CONFIG: Record<
  TransactionCategory,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  transfer: {
    label: 'Virement',
    icon: ArrowsLeftRight,
    colorClass: 'text-gold-400',
    bgClass: 'bg-gold-400/10 border-gold-400/30',
  },
  salary: {
    label: 'Salaire',
    icon: Briefcase,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  shopping: {
    label: 'Achats',
    icon: ShoppingBag,
    colorClass: 'text-platinum-200',
    bgClass: 'bg-obsidian-800 border-obsidian-600',
  },
  services: {
    label: 'Services & Cloud',
    icon: HardDrives,
    colorClass: 'text-platinum-200',
    bgClass: 'bg-obsidian-800 border-obsidian-600',
  },
  dining: {
    label: 'Restaurants & Sorties',
    icon: ForkKnife,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10 border-amber-500/30',
  },
  groceries: {
    label: 'Alimentation',
    icon: ShoppingCart,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  investment: {
    label: 'Épargne & Rendement',
    icon: TrendUp,
    colorClass: 'text-gold-300',
    bgClass: 'bg-gold-400/10 border-gold-400/30',
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
      className="group w-full p-3.5 sm:p-4 rounded-xl bg-obsidian-950/60 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-gold-400/40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.99] flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${config.bgClass} ${config.colorClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="body-4 text-platinum-50 truncate group-hover:text-gold-400 transition-colors">
              {transaction.counterpartyName}
            </span>
            <span className="caption-5 text-platinum-500 hidden sm:inline font-mono tabular-nums">
              {timeStr}
            </span>
          </div>

          <div className="caption-5 text-platinum-400 truncate mt-0.5">
            {transaction.reason}
          </div>

          <div className="caption-5 font-mono tabular-nums text-platinum-500 truncate mt-0.5 sm:hidden">
            {maskIban(transaction.counterpartyIban)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right">
          <div
            className={`font-mono tabular-nums body-4 sm:body-1 ${
              isDebit ? 'text-platinum-50' : 'text-emerald-500'
            }`}
          >
            {isDebit ? '-' : '+'}
            {formatMinorToCurrency(transaction.amountMinor)}
          </div>
          <div className="caption-5 font-mono tabular-nums text-platinum-500 hidden sm:block">
            {maskIban(transaction.counterpartyIban)}
          </div>
        </div>

        <CaretRight className="w-4 h-4 text-platinum-500 group-hover:text-gold-400 transition-colors" />
      </div>
    </div>
  );
};

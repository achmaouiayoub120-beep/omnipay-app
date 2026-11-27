import React, { useEffect, useId } from 'react';
import {
  MagnifyingGlass,
  Funnel,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Stack,
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useTransactionsStore } from '../transactions.store';
import { TransactionRow } from './TransactionRow';
import { TransactionDrawer } from './TransactionDrawer';
import { CsvExportButton } from './CsvExportButton';
import { Transaction, TransactionCategory } from '../transactions.types';
import { Card, Skeleton, Button } from '@/shared/ui';

const CATEGORIES: { key: TransactionCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Toutes les catégories' },
  { key: 'transfer', label: 'Virements' },
  { key: 'salary', label: 'Salaires' },
  { key: 'shopping', label: 'Achats' },
  { key: 'services', label: 'Services' },
  { key: 'dining', label: 'Restaurants' },
  { key: 'groceries', label: 'Alimentation' },
  { key: 'investment', label: 'Épargne' },
];

export const TransactionHistory: React.FC = () => {
  const {
    transactions,
    isLoading,
    filterDirection,
    searchQuery,
    selectedCategory,
    currentPage,
    pageSize,
    selectedTransaction,
    loadTransactions,
    setFilterDirection,
    setSearchQuery,
    setSelectedCategory,
    setCurrentPage,
    setSelectedTransaction,
    getFilteredTransactions,
  } = useTransactionsStore();

  const searchInputId = useId();

  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  }, [loadTransactions, transactions.length]);

  const filtered = getFilteredTransactions();

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const groupTransactionsByDay = (items: Transaction[]) => {
    const groups: { [dateLabel: string]: Transaction[] } = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    items.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      const itemDateStr = itemDate.toDateString();

      let label = itemDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (itemDateStr === todayStr) {
        label = "Aujourd'hui";
      } else if (itemDateStr === yesterdayStr) {
        label = 'Hier';
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });

    return groups;
  };

  const dayGroups = groupTransactionsByDay(paginated);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="heading-6 text-platinum-50 flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-gold-400 shrink-0" />
            <span>Historique des opérations</span>
          </h2>
          <p className="caption-2 text-platinum-400 mt-1">
            Registre auditable en temps réel avec filtrage intelligent et export certifié.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="iconSm"
            onClick={() => loadTransactions()}
            title="Rafraîchir les opérations"
            aria-label="Rafraîchir les opérations"
          >
            <ArrowsClockwise className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <CsvExportButton transactions={filtered} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Direction Filter Tabs */}
          <div className="inline-flex items-center bg-obsidian-950 p-1 rounded-lg border border-obsidian-700/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterDirection('ALL')}
              className={`px-3 py-1.5 rounded-md caption-3 transition-colors duration-300 active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                filterDirection === 'ALL'
                  ? 'bg-gold-400 text-obsidian-950'
                  : 'text-platinum-400 hover:text-platinum-50'
              }`}
            >
              Toutes ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('DEBIT')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md caption-3 transition-colors duration-300 active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                filterDirection === 'DEBIT'
                  ? 'bg-obsidian-800 text-platinum-50 border border-obsidian-600'
                  : 'text-platinum-400 hover:text-platinum-50'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-crimson-500" />
              <span>Débits</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('CREDIT')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md caption-3 transition-colors duration-300 active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                filterDirection === 'CREDIT'
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'text-platinum-400 hover:text-platinum-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span>Crédits</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor={searchInputId} className="sr-only">
              Rechercher une opération
            </label>
            <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-platinum-400 pointer-events-none" />
            <input
              id={searchInputId}
              type="text"
              placeholder="Rechercher par bénéficiaire, motif, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-obsidian-950 border border-obsidian-700 rounded-lg pl-10 pr-4 body-6 text-platinum-50 placeholder-platinum-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="caption-4 text-platinum-400 shrink-0 flex items-center gap-1.5 mr-1">
            <Funnel className="w-3.5 h-3.5" />
            <span>Catégorie</span>
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-md caption-4 shrink-0 transition-colors duration-300 active:scale-[0.98] cursor-pointer border ${
                  isSelected
                    ? 'bg-gold-400/15 text-gold-400 border-gold-400/40'
                    : 'bg-obsidian-950/70 border-obsidian-700/70 text-platinum-400 hover:text-platinum-50 hover:border-obsidian-600'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Transactions List Grouped by Day */}
      {isLoading && transactions.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="flat" className="text-center py-12 space-y-2">
          <Stack className="w-10 h-10 mx-auto text-platinum-500" />
          <h4 className="title-4 text-platinum-50 font-semibold">Aucune opération trouvée</h4>
          <p className="caption-2 text-platinum-400 max-w-sm mx-auto">
            Aucune transaction ne correspond à vos critères de recherche actuels.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(dayGroups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-2.5">
              <div className="caption-3 text-platinum-400 px-1">
                {dateLabel}
              </div>

              <div className="space-y-2">
                {items.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onClick={(t) => setSelectedTransaction(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {filtered.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-obsidian-900 border border-obsidian-700/80 rounded-xl caption-4">
          <span className="text-platinum-400 tabular-nums">
            Affichage de{' '}
            <strong className="text-platinum-50">
              {startIndex + 1} à {Math.min(startIndex + pageSize, filtered.length)}
            </strong>{' '}
            sur <strong className="text-platinum-50">{filtered.length}</strong> opérations
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
              disabled={validCurrentPage <= 1}
            >
              <CaretLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </Button>

            <span className="px-2 font-mono tabular-nums text-platinum-400">
              Page {validCurrentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
              disabled={validCurrentPage >= totalPages}
            >
              <span>Suivant</span>
              <CaretRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Slide-Over Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
};

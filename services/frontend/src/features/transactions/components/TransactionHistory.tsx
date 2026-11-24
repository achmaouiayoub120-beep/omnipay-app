import React, { useEffect, useId } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { useTransactionsStore } from '../transactions.store';
import { TransactionRow } from './TransactionRow';
import { TransactionDrawer } from './TransactionDrawer';
import { CsvExportButton } from './CsvExportButton';
import { Transaction, TransactionCategory } from '../transactions.types';

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

  // Group transactions by date
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
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[var(--color-gold)]" />
            <span>Historique des Opérations</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Registre auditable en temps réel avec filtrage intelligent et export certifié.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadTransactions()}
            className="p-2.5 rounded-xl bg-[#0B101E] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title="Rafraîchir les opérations"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <CsvExportButton transactions={filtered} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B101E] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Direction Filter Tabs */}
          <div className="inline-flex items-center bg-[#070A12] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setFilterDirection('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterDirection === 'ALL'
                  ? 'bg-[var(--color-gold)] text-[#070A12] shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Toutes ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('DEBIT')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterDirection === 'DEBIT'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--color-crimson)]" />
              <span>Débits</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('CREDIT')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterDirection === 'CREDIT'
                  ? 'bg-[var(--color-emerald)]/20 text-[var(--color-emerald)] shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>Crédits</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor={searchInputId} className="sr-only">
              Rechercher une opération
            </label>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id={searchInputId}
              type="text"
              placeholder="Rechercher par bénéficiaire, motif, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070A12] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>
        </div>

        {/* Category Pills Carousel/Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Catégorie :
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/40'
                    : 'bg-[#070A12] border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions List Grouped by Day */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#0B101E] border border-white/5 rounded-2xl">
          <Layers className="w-10 h-10 mx-auto text-gray-600 mb-2 opacity-40" />
          <h4 className="text-sm font-semibold text-white">Aucune opération trouvée</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Aucune transaction ne correspond à vos critères de recherche actuels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(dayGroups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 px-1 tracking-wider uppercase">
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
        <div className="flex items-center justify-between p-4 bg-[#0B101E] border border-white/5 rounded-xl text-xs">
          <span className="text-gray-400">
            Affichage de{' '}
            <strong className="text-white">
              {startIndex + 1} - {Math.min(startIndex + pageSize, filtered.length)}
            </strong>{' '}
            sur <strong className="text-white">{filtered.length}</strong> opérations
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
              disabled={validCurrentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>

            <span className="px-2 font-mono font-medium text-gray-400">
              Page {validCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
              disabled={validCurrentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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

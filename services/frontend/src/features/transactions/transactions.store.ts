/**
 * OmniPay Zero-Trust - Transactions Store (Zustand)
 * Manages transaction list, multi-criteria filters, search, pagination,
 * and lateral detail drawer selection.
 */

import { create } from 'zustand';
import {
  Transaction,
  TransactionCategory,
  TransactionDirection,
} from './transactions.types';
import { fetchTransactionsApi } from './transactions.api';

interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  filterDirection: TransactionDirection;
  searchQuery: string;
  selectedCategory: TransactionCategory | 'ALL';
  currentPage: number;
  pageSize: number;
  selectedTransaction: Transaction | null;

  // Actions
  loadTransactions: () => Promise<void>;
  setFilterDirection: (dir: TransactionDirection) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: TransactionCategory | 'ALL') => void;
  setCurrentPage: (page: number) => void;
  setSelectedTransaction: (tx: Transaction | null) => void;
  getFilteredTransactions: () => Transaction[];
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  isLoading: false,
  filterDirection: 'ALL',
  searchQuery: '',
  selectedCategory: 'ALL',
  currentPage: 1,
  pageSize: 6,
  selectedTransaction: null,

  loadTransactions: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchTransactionsApi();
      set({ transactions: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setFilterDirection: (dir) => set({ filterDirection: dir, currentPage: 1 }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedTransaction: (tx) => set({ selectedTransaction: tx }),

  getFilteredTransactions: () => {
    const { transactions, filterDirection, searchQuery, selectedCategory } = get();

    return transactions.filter((tx) => {
      // Direction filter
      if (filterDirection === 'DEBIT' && tx.direction !== 'DEBIT') return false;
      if (filterDirection === 'CREDIT' && tx.direction !== 'CREDIT') return false;

      // Category filter
      if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) return false;

      // Search query (counterparty, reason, IBAN, id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          tx.counterpartyName.toLowerCase().includes(q) ||
          tx.reason.toLowerCase().includes(q) ||
          tx.counterpartyIban.toLowerCase().includes(q) ||
          tx.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  },
}));

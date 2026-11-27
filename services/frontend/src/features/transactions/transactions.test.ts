import { describe, it, expect, beforeEach } from 'vitest';
import { useTransactionsStore } from './transactions.store';

describe('Transactions Store & History Engine', () => {
  beforeEach(async () => {
    const store = useTransactionsStore.getState();
    store.setFilterDirection('ALL');
    store.setSearchQuery('');
    store.setSelectedCategory('ALL');
    store.setCurrentPage(1);
    store.setSelectedTransaction(null);
    await store.loadTransactions();
  });

  it('loads transactions and verifies non-empty array', () => {
    const state = useTransactionsStore.getState();
    expect(state.transactions.length).toBeGreaterThan(0);
    expect(state.isLoading).toBe(false);
  });

  it('filters by DEBIT direction', () => {
    useTransactionsStore.getState().setFilterDirection('DEBIT');
    const filtered = useTransactionsStore.getState().getFilteredTransactions();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((tx) => tx.direction === 'DEBIT')).toBe(true);
  });

  it('filters by CREDIT direction', () => {
    useTransactionsStore.getState().setFilterDirection('CREDIT');
    const filtered = useTransactionsStore.getState().getFilteredTransactions();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((tx) => tx.direction === 'CREDIT')).toBe(true);
  });

  it('searches by counterparty name or reason', () => {
    useTransactionsStore.getState().setSearchQuery('Bob Martin');
    const filtered = useTransactionsStore.getState().getFilteredTransactions();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].counterpartyName).toBe('Bob Martin');
  });

  it('filters by specific category', () => {
    useTransactionsStore.getState().setSelectedCategory('salary');
    const filtered = useTransactionsStore.getState().getFilteredTransactions();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((tx) => tx.category === 'salary')).toBe(true);
  });

  it('manages selected transaction for the lateral drawer', () => {
    const first = useTransactionsStore.getState().transactions[0];
    useTransactionsStore.getState().setSelectedTransaction(first);
    expect(useTransactionsStore.getState().selectedTransaction).toEqual(first);

    useTransactionsStore.getState().setSelectedTransaction(null);
    expect(useTransactionsStore.getState().selectedTransaction).toBeNull();
  });
});

/**
 * OmniPay Zero-Trust - Accounts Store (Zustand)
 * Solde réel du compte connecté, relu après chaque virement et périodiquement (sans rechargement de page).
 */

import { create } from 'zustand';
import { AccountBalance, fetchAccountsApi } from './accounts.api';

interface AccountsState {
  accounts: AccountBalance[];
  lastRefreshedAt: string | null;
  /** Relit les soldes ; renvoie la liste à jour, ou null si le serveur est injoignable (l'ancien solde est conservé). */
  refresh: () => Promise<AccountBalance[] | null>;
  reset: () => void;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  lastRefreshedAt: null,

  refresh: async () => {
    const accounts = await fetchAccountsApi();
    if (accounts) {
      set({ accounts, lastRefreshedAt: new Date().toISOString() });
    }
    return accounts;
  },

  reset: () => set({ accounts: [], lastRefreshedAt: null }),
}));

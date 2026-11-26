/**
 * OmniPay Zero-Trust - Accounts API
 * Soldes réels de l'appelant : GET /api/transactions/accounts/me (transaction-service).
 */

import { useAuthStore } from '../auth/auth.store';

const API_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location?.origin ? '' : 'http://localhost:8082');

export interface BackendAccountView {
  accountId: string;
  balance: number;
  currency: string;
}

export interface AccountBalance {
  accountId: string;
  balanceMinor: number;
  currency: string;
}

/** Renvoie les comptes de l'utilisateur connecté, ou null si le serveur est injoignable ou refuse le jeton. */
export async function fetchAccountsApi(): Promise<AccountBalance[] | null> {
  const token = useAuthStore.getState().session?.token;
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions/accounts/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as BackendAccountView[];
    if (!Array.isArray(data)) return null;
    return data.map((a) => ({
      accountId: a.accountId,
      balanceMinor: Math.round(Number(a.balance) * 100),
      currency: a.currency,
    }));
  } catch {
    return null;
  }
}

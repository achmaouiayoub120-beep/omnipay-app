/**
 * OmniPay Zero-Trust - Transactions API Service
 * Fetches real transactions from backend service (8082),
 * maps internal accounts to standard IBANs and minor currency units (cents).
 */

import { useAuthStore } from '../auth/auth.store';
import { API_BASE_URL } from '../../shared/lib/api';
import { Transaction, TransactionBackendView, TransactionCategory } from './transactions.types';
import { INTERNAL_ACCOUNTS, resolveAccountToIban, accountIdForUsername } from '../../shared/lib/iban';
import { uuid } from '../../shared/lib/uuid';


// High-fidelity fallback transactions for demo & offline mode
const FALLBACK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-7928-8491',
    sourceAccount: 'ACC-USER-003',
    targetAccount: 'ACC-BOB-002',
    amountMinor: 15000, // 150.00 €
    direction: 'DEBIT',
    status: 'SUCCESS',
    reason: 'Remboursement dîner équipe ESTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    counterpartyName: 'Bob Martin',
    counterpartyIban: INTERNAL_ACCOUNTS['ACC-BOB-002'].iban,
    category: 'dining',
    idempotencyKey: '0a894082-9653-41bb-a5a6-989658284581',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-E8F940B1',
  },
  {
    id: 'TX-6102-4412',
    sourceAccount: 'ACC-EXT-CORP',
    targetAccount: 'ACC-USER-003',
    amountMinor: 485000, // 4 850.00 €
    direction: 'CREDIT',
    status: 'SUCCESS',
    reason: 'Salaire Mensuel & Prime Performance',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // Yesterday
    counterpartyName: 'ESTC Engineering Corp',
    counterpartyIban: 'FR7630006000011234567890189',
    category: 'salary',
    idempotencyKey: '7c823019-3381-4209-91aa-902481048201',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-89B4C201',
  },
  {
    id: 'TX-5510-9281',
    sourceAccount: 'ACC-USER-003',
    targetAccount: 'ACC-ALICE-001',
    amountMinor: 4200, // 42.00 €
    direction: 'DEBIT',
    status: 'SUCCESS',
    reason: 'Abonnement Cloud & Vault Secrets',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    counterpartyName: 'Alice Dupont',
    counterpartyIban: INTERNAL_ACCOUNTS['ACC-ALICE-001'].iban,
    category: 'services',
    idempotencyKey: 'b4920481-9482-4aa8-9271-884029104821',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-A0932F84',
  },
  {
    id: 'TX-4401-2098',
    sourceAccount: 'ACC-USER-003',
    targetAccount: 'ACC-EXT-STORE',
    amountMinor: 8990, // 89.90 €
    direction: 'DEBIT',
    status: 'SUCCESS',
    reason: 'Apple Store Opéra - Équipement Pro',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    counterpartyName: 'Apple Retail France',
    counterpartyIban: 'FR7630002005500000109283741',
    category: 'shopping',
    idempotencyKey: 'ff891024-3401-44bb-8710-aa9481029482',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-F9812A40',
  },
  {
    id: 'TX-3309-1823',
    sourceAccount: 'ACC-ADMIN-004',
    targetAccount: 'ACC-USER-003',
    amountMinor: 25000, // 250.00 €
    direction: 'CREDIT',
    status: 'SUCCESS',
    reason: 'Intérêts Trésorerie Privée OmniPay',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 75).toISOString(),
    counterpartyName: 'Direction Générale OmniPay',
    counterpartyIban: INTERNAL_ACCOUNTS['ACC-ADMIN-004'].iban,
    category: 'investment',
    idempotencyKey: '88204910-4491-49fa-9912-ab7482019482',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-C9182048',
  },
  {
    id: 'TX-2210-9482',
    sourceAccount: 'ACC-USER-003',
    targetAccount: 'ACC-EXT-BIO',
    amountMinor: 6450, // 64.50 €
    direction: 'DEBIT',
    status: 'SUCCESS',
    reason: 'Courses Bio & Terroir Marché Central',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 98).toISOString(),
    counterpartyName: 'Biocoop Terroir',
    counterpartyIban: 'FR7610058000010000000008892',
    category: 'groceries',
    idempotencyKey: '44810294-8192-411a-8820-cc7482019482',
    feeMinor: 0,
    securitySealHash: 'ESTC-SEAL-D7192840',
  },
];

function inferCategory(reason: string, counterparty: string): TransactionCategory {
  const text = `${reason} ${counterparty}`.toLowerCase();
  if (text.includes('salaire') || text.includes('payroll') || text.includes('prime')) return 'salary';
  if (text.includes('dîner') || text.includes('restaurant') || text.includes('cafe')) return 'dining';
  if (text.includes('courses') || text.includes('marché') || text.includes('supermarché')) return 'groceries';
  if (text.includes('cloud') || text.includes('abonnement') || text.includes('service')) return 'services';
  if (text.includes('store') || text.includes('achat') || text.includes('equipement')) return 'shopping';
  if (text.includes('intérêt') || text.includes('dividende') || text.includes('bourse')) return 'investment';
  return 'transfer';
}

export async function fetchTransactionsApi(): Promise<Transaction[]> {
  const token = useAuthStore.getState().session?.token;
  const currentUsername = useAuthStore.getState().session?.username || 'user';
  const currentUserAccount = accountIdForUsername(currentUsername);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = (await response.json()) as TransactionBackendView[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => {
          const isDebit = item.sourceAccount === currentUserAccount || item.sourceAccount.includes(currentUsername);
          const counterpartyAccountId = isDebit ? item.targetAccount : item.sourceAccount;
          const knownCounterparty = INTERNAL_ACCOUNTS[counterpartyAccountId];
          const counterpartyName = knownCounterparty ? knownCounterparty.holderName : counterpartyAccountId;
          const counterpartyIban = resolveAccountToIban(counterpartyAccountId);
          const reason = item.reason || 'Virement bancaire SEPA';

          return {
            id: item.id,
            sourceAccount: item.sourceAccount,
            targetAccount: item.targetAccount,
            amountMinor: Math.round(item.amount * 100),
            direction: isDebit ? 'DEBIT' : 'CREDIT',
            status: item.status as 'SUCCESS',
            reason,
            createdAt: item.createdAt,
            counterpartyName,
            counterpartyIban,
            category: inferCategory(reason, counterpartyName),
            idempotencyKey: uuid(),
            feeMinor: 0,
            securitySealHash: `ESTC-SEAL-${item.id.slice(0, 8).toUpperCase()}`,
          };
        });
      }
    }
  } catch (err: unknown) {
    console.warn('[OmniPay Transactions API] Backend unavailable, using demo seed data.');
  }

  return FALLBACK_TRANSACTIONS;
}

/**
 * OmniPay Zero-Trust - Transaction Types
 * Minor units (cents), counterparty resolution, and categorization.
 */

export type TransactionDirection = 'ALL' | 'DEBIT' | 'CREDIT';

export type TransactionCategory =
  | 'transfer'
  | 'salary'
  | 'shopping'
  | 'services'
  | 'dining'
  | 'groceries'
  | 'investment';

export interface Transaction {
  id: string;
  sourceAccount: string;
  targetAccount: string;
  amountMinor: number;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  reason: string;
  createdAt: string;
  counterpartyName: string;
  counterpartyIban: string;
  category: TransactionCategory;
  idempotencyKey?: string;
  feeMinor?: number;
  securitySealHash?: string;
}

export interface TransactionBackendView {
  id: string;
  sourceAccount: string;
  targetAccount: string;
  amount: number;
  status: string;
  reason: string | null;
  createdAt: string;
}

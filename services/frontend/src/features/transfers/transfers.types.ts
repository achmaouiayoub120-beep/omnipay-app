/**
 * OmniPay Zero-Trust - Transfer Types
 * Strict minor units (cents), full beneficiary models, and idempotency tracking.
 */

export type TransferStep = 'beneficiary' | 'amount' | 'review' | 'mfa' | 'success';

export interface Beneficiary {
  id: string;
  name: string;
  iban: string;
  bankName: string;
  avatarInitials: string;
  isRecent?: boolean;
  accountId?: string; // Optional internal ID (e.g. ACC-BOB-002)
}

export interface TransferDraft {
  beneficiary: Beneficiary | null;
  amountMinor: number;
  reason: string;
  instant: boolean;
  scheduledDate?: string;
  feeMinor: number;
}

export interface TransferReceipt {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amountMinor: number;
  currency: string;
  sourceAccount: string;
  sourceIban: string;
  sourceHolderName: string;
  targetAccount: string;
  targetIban: string;
  targetHolderName: string;
  reason: string;
  executedAt: string;
  idempotencyKey: string;
  securitySealHash: string;
  clearingNetwork: string;
}

export interface BackendTransferRequest {
  sourceAccount?: string;
  targetAccount: string;
  amount: number; // Decimal format expected by Spring Boot (e.g. 150.00)
  reason?: string;
}

export interface BackendTransferResponse {
  transactionId: string;
  status: string;
  amount: number;
}

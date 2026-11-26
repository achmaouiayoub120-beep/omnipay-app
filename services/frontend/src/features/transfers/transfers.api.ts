/**
 * OmniPay Zero-Trust - Transfer API Client
 * Enterprise-grade client with strict idempotency (X-Idempotency-Key),
 * in-memory authorization header, and banking error handling.
 *
 * Aucun succès simulé : si le serveur est injoignable, l'erreur est remontée (statut 0, réessayable)
 * et la même clé d'idempotence permet de réessayer sans risque de double débit.
 */

import { useAuthStore } from '../auth/auth.store';
import { API_BASE_URL } from '../../shared/lib/api';
import {
  BackendTransferRequest,
  BackendTransferResponse,
} from './transfers.types';


/** Statut renvoyé par le serveur quand la clé d'idempotence a déjà été traitée (réponse d'origine rejouée). */
export const IDEMPOTENT_REPLAY_STATUS = 'IDEMPOTENT_REPLAY';

export class TransferApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TransferApiError';
  }
}

/**
 * Executes a bank transfer through the zero-trust transaction backend.
 * Uses a unique X-Idempotency-Key per transaction intent to protect against duplicates.
 */
export async function submitTransferApi(
  payload: BackendTransferRequest,
  idempotencyKey: string
): Promise<BackendTransferResponse> {
  const token = useAuthStore.getState().session?.token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new TransferApiError(
      'Réseau indisponible ou délai dépassé. Réessayez : la même clé d’idempotence évite tout double prélèvement.',
      0,
      'NETWORK_ERROR',
      true
    );
  }

  if (response.ok) {
    return (await response.json()) as BackendTransferResponse;
  }

  // Map HTTP error codes to clear banking messages (le corps d'erreur du serveur n'est jamais affiché)
  switch (response.status) {
    case 422:
      throw new TransferApiError('Solde insuffisant pour exécuter ce virement.', 422, 'INSUFFICIENT_FUNDS', false);
    case 409:
      throw new TransferApiError(
        'Une transaction identique avec cette clé d’idempotence a déjà été traitée.',
        409,
        'DUPLICATE_IDEMPOTENT_SUBMISSION',
        false
      );
    case 401:
      throw new TransferApiError('Session expirée ou jeton refusé : reconnectez-vous.', 401, 'UNAUTHORIZED', false);
    case 400:
      throw new TransferApiError(
        'Paramètres de virement invalides : montant ou compte incorrect.',
        400,
        'INVALID_REQUEST',
        false
      );
    case 403:
      throw new TransferApiError(
        'Action non autorisée : vous ne disposez pas des privilèges requis pour débiter ce compte.',
        403,
        'FORBIDDEN',
        false
      );
    case 404:
      throw new TransferApiError(
        'Compte émetteur ou bénéficiaire introuvable dans le registre bancaire.',
        404,
        'ACCOUNT_NOT_FOUND',
        false
      );
    case 429:
      throw new TransferApiError(
        'Limite de débit atteinte. Veuillez patienter quelques instants.',
        429,
        'RATE_LIMITED',
        true
      );
    default:
      if (response.status >= 500) {
        throw new TransferApiError(
          `Erreur serveur (${response.status}). Réessayez sans risque : la clé d’idempotence est conservée.`,
          response.status,
          'SERVER_ERROR',
          true
        );
      }
      throw new TransferApiError(
        `Échec du virement (Code HTTP: ${response.status}).`,
        response.status,
        'UNKNOWN_ERROR',
        false
      );
  }
}

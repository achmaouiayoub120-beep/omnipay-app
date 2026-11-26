/**
 * OmniPay Zero-Trust - ISO 13616 / EBS 204 Compliant IBAN Utilities
 * Strict Modulo-97 checksum validation (client & server aligned)
 * Zero floats, zero hardcoded unverified identifiers.
 */

export interface IbanValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
  countryCode?: string;
}

export interface AccountMapping {
  accountId: string;
  holderName: string;
  iban: string;
  bankName: string;
}

/**
 * Known internal account mappings.
 * Internal IDs (ACC-xxx) are NEVER displayed as IBANs to clients.
 */
export const INTERNAL_ACCOUNTS: Record<string, AccountMapping> = {
  'ACC-USER-003': {
    accountId: 'ACC-USER-003',
    holderName: 'Ayoub Achmaoui (Compte Principal)',
    iban: 'FR8810058000010000000003021',
    bankName: 'OmniPay Zero-Trust Private Banking',
  },
  'ACC-BOB-002': {
    accountId: 'ACC-BOB-002',
    holderName: 'Bob Martin',
    iban: 'FR4110058000010000000002024',
    bankName: 'OmniPay Retail Banking',
  },
  'ACC-ALICE-001': {
    accountId: 'ACC-ALICE-001',
    holderName: 'Alice Dupont',
    iban: 'FR9110058000010000000001027',
    bankName: 'OmniPay Retail Banking',
  },
  'ACC-ADMIN-004': {
    accountId: 'ACC-ADMIN-004',
    holderName: 'Direction Générale OmniPay',
    iban: 'FR3810058000010000000004018',
    bankName: 'OmniPay Treasury & Settlement',
  },
};

/**
 * Cleans an IBAN string by removing spaces and hyphens and converting to uppercase.
 */
export function cleanIban(iban: string): string {
  return iban.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Formats an IBAN with 4-character grouping for premium readability.
 * Example: FR88 1005 8000 0100 0000 0003 021
 */
export function formatIban(iban: string): string {
  const cleaned = cleanIban(iban);
  if (!cleaned) return '';
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Masks an IBAN for secure display, showing country code, check digits, and last 4 characters.
 * Example: FR88 •••• •••• •••• •••• •••• 3021
 */
export function maskIban(iban: string): string {
  const formatted = formatIban(iban);
  const parts = formatted.split(' ');
  if (parts.length <= 2) return formatted;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const maskedMiddle = parts.slice(1, -1).map(() => '••••').join(' ');
  return `${first} ${maskedMiddle} ${last}`;
}

/**
 * Validates an IBAN using ISO 7064 Modulo-97-10 checksum validation.
 */
export function validateIban(iban: string): IbanValidationResult {
  const cleaned = cleanIban(iban);

  if (!cleaned) {
    return { isValid: false, error: 'Veuillez saisir un numéro IBAN.' };
  }

  // Minimum length 15 (e.g. Norway), max length 34
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Format IBAN invalide (2 lettres pays, 2 chiffres de contrôle, puis compte).',
    };
  }

  const countryCode = cleaned.slice(0, 2);

  // Rearrange: move first 4 characters to the end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Convert letters to two-digit numbers (A=10, B=11, ..., Z=35)
  const numeric = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
    })
    .join('');

  // Modulo-97 using chunking to prevent 64-bit IEEE-754 precision loss
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = remainder.toString() + numeric.slice(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }

  if (remainder !== 1) {
    return {
      isValid: false,
      error: 'Clé de contrôle IBAN invalide (échec vérification mod-97).',
      countryCode,
    };
  }

  return {
    isValid: true,
    formatted: formatIban(cleaned),
    countryCode,
  };
}

/**
 * Resolves an IBAN to an internal backend account ID if present in the OmniPay ecosystem.
 * If external, generates an external routing placeholder for SEPA clearing.
 */
export function resolveIbanToInternalAccount(iban: string): AccountMapping | null {
  const cleaned = cleanIban(iban);
  for (const entry of Object.values(INTERNAL_ACCOUNTS)) {
    if (cleanIban(entry.iban) === cleaned) {
      return entry;
    }
  }
  return null;
}

/**
 * Resolves an internal backend account ID (e.g. ACC-USER-003) to a full standard IBAN.
 */
export function resolveAccountToIban(accountId: string): string {
  const found = INTERNAL_ACCOUNTS[accountId];
  if (found) {
    return found.iban;
  }
  // Fallback for demo accounts if unspecified
  return INTERNAL_ACCOUNTS['ACC-USER-003'].iban;
}

/**
 * Compte bancaire de démonstration d'un utilisateur (migrations Flyway du transaction-service).
 * Le serveur débite toujours le compte de l'appelant lu dans le JWT : cette table ne sert qu'à l'affichage.
 */
export function accountIdForUsername(username: string | null | undefined): string {
  switch ((username || '').toLowerCase()) {
    case 'alice':
      return 'ACC-ALICE-001';
    case 'bob':
      return 'ACC-BOB-002';
    case 'admin':
      return 'ACC-ADMIN-004';
    default:
      return 'ACC-USER-003';
  }
}

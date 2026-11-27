import { describe, it, expect } from 'vitest';
import {
  validateIban,
  formatIban,
  maskIban,
  cleanIban,
  resolveIbanToInternalAccount,
  resolveAccountToIban,
  INTERNAL_ACCOUNTS,
} from './iban';

describe('IBAN ISO 13616 & Modulo-97 Utilities', () => {
  it('cleans IBAN removing spaces, dashes and uppercasing', () => {
    expect(cleanIban('fr88-1005 8000 0100 0000 0003 021')).toBe('FR8810058000010000000003021');
  });

  it('formats IBAN in standard 4-character blocks', () => {
    expect(formatIban('FR8810058000010000000003021')).toBe('FR88 1005 8000 0100 0000 0003 021');
  });

  it('masks IBAN for secure display preserving country, check digits and last chars', () => {
    expect(maskIban('FR88 1005 8000 0100 0000 0003 021')).toBe(
      'FR88 •••• •••• •••• •••• •••• 021'
    );
  });

  it('validates genuine Modulo-97 IBANs successfully', () => {
    // User
    const userRes = validateIban('FR88 1005 8000 0100 0000 0003 021');
    expect(userRes.isValid).toBe(true);
    expect(userRes.countryCode).toBe('FR');

    // Bob Martin
    const bobRes = validateIban('FR41 1005 8000 0100 0000 0002 024');
    expect(bobRes.isValid).toBe(true);

    // Alice Dupont
    const aliceRes = validateIban('FR91 1005 8000 0100 0000 0001 027');
    expect(aliceRes.isValid).toBe(true);
  });

  it('rejects tampered or corrupt IBANs with incorrect Modulo-97 key', () => {
    // Modified last digit
    const tampered = validateIban('FR88 1005 8000 0100 0000 0003 022');
    expect(tampered.isValid).toBe(false);
    expect(tampered.error).toContain('Clé de contrôle IBAN invalide');
  });

  it('rejects malformed IBAN with letters where numbers are required', () => {
    const malformed = validateIban('INVALID_IBAN_HERE');
    expect(malformed.isValid).toBe(false);
  });

  it('resolves IBAN to internal account and vice-versa', () => {
    const resolved = resolveIbanToInternalAccount('FR4110058000010000000002024');
    expect(resolved).not.toBeNull();
    expect(resolved?.accountId).toBe('ACC-BOB-002');
    expect(resolved?.holderName).toBe('Bob Martin');

    const mappedIban = resolveAccountToIban('ACC-BOB-002');
    expect(mappedIban).toBe(INTERNAL_ACCOUNTS['ACC-BOB-002'].iban);
  });
});

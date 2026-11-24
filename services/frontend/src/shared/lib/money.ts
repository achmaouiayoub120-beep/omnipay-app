/**
 * Utilitaires monétaires OmniPay Zero-Trust
 * Règle stricte d'ingénierie financière : manipulation exclusive d'entiers en unités mineures (centimes).
 * Aucun flottant n'est utilisé dans les calculs pour éliminer tout risque d'erreur d'arrondi IEEE-754.
 */

export type SupportedCurrency = 'EUR' | 'MAD';

const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  EUR: 'fr-FR',
  MAD: 'fr-MA',
};

/**
 * Formate un montant en centimes (ex: 1425000) en chaîne monétaire localisée (ex: "14 250,00 €" ou "14 250,00 MAD")
 */
export function formatMinorToCurrency(
  amountMinor: number,
  currency: SupportedCurrency = 'EUR',
  localeOverride?: string
): string {
  const safeMinor = Math.round(amountMinor);
  const locale = localeOverride || CURRENCY_LOCALES[currency] || 'fr-FR';

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(safeMinor / 100);
}

/**
 * Convertit une chaîne de saisie utilisateur (ex: "50,50" ou "1250.75") en centimes entiers stricts.
 */
export function parseInputToMinor(input: string): number {
  if (!input || !input.trim()) return 0;

  // Normalisation : remplacement virgule par point, suppression des espaces
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  const parts = cleaned.split('.');

  const integerPart = parseInt(parts[0] || '0', 10);
  if (isNaN(integerPart)) return 0;

  let fractionPart = 0;
  if (parts.length > 1 && parts[1]) {
    const fracStr = (parts[1] + '00').slice(0, 2);
    fractionPart = parseInt(fracStr, 10);
    if (isNaN(fractionPart)) fractionPart = 0;
  }

  const sign = integerPart < 0 ? -1 : 1;
  return Math.abs(integerPart) * 100 * sign + fractionPart * sign;
}

/**
 * Convertit un solde en centimes en chaîne décimale formatée (ex: 250000 -> "2500,00")
 */
export function formatMinorToDecimal(amountMinor: number): string {
  const safeMinor = Math.round(amountMinor);
  const units = Math.floor(Math.abs(safeMinor) / 100);
  const cents = Math.abs(safeMinor) % 100;
  const sign = safeMinor < 0 ? '-' : '';
  return `${sign}${units},${cents.toString().padStart(2, '0')}`;
}

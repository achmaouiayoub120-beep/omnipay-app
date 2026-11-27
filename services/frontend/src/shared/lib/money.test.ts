import { describe, it, expect } from 'vitest';
import { formatMinorToCurrency, parseInputToMinor, formatMinorToDecimal } from './money';

describe('Financial Money Utilities (Cents / Minor Units)', () => {
  it('formats minor units to French Euro currency string', () => {
    const formatted = formatMinorToCurrency(1425000, 'EUR', 'fr-FR');
    // Normalisation des espaces insécables
    expect(formatted.replace(/\s/g, ' ')).toMatch(/14 250,00 €/);
  });

  it('formats minor units with zero cents correctly', () => {
    const formatted = formatMinorToCurrency(50000, 'EUR', 'fr-FR');
    expect(formatted.replace(/\s/g, ' ')).toMatch(/500,00 €/);
  });

  it('parses user input strings to exact integer cents', () => {
    expect(parseInputToMinor('50,00')).toBe(5000);
    expect(parseInputToMinor('1250.50')).toBe(125050);
    expect(parseInputToMinor('1 000,99')).toBe(100099);
    expect(parseInputToMinor('0,25')).toBe(25);
    expect(parseInputToMinor('')).toBe(0);
  });

  it('formats minor to decimal string', () => {
    expect(formatMinorToDecimal(125000)).toBe('1250,00');
    expect(formatMinorToDecimal(50)).toBe('0,50');
  });
});

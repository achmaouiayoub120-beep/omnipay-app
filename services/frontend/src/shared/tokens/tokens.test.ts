import { describe, it, expect } from 'vitest';
import { tokens } from './tokens';

describe('Design Tokens Integrity', () => {
  it('should define the Obsidian palette', () => {
    expect(tokens.colors.obsidian[950]).toBe('#070A12');
    expect(tokens.colors.obsidian[900]).toBe('#0B101E');
    expect(tokens.colors.obsidian[800]).toBe('#131A2E');
  });

  it('should define the Champagne Gold primary accent', () => {
    expect(tokens.colors.gold[400]).toBe('#D4A24C');
  });

  it('should have functional colors defined', () => {
    expect(tokens.colors.emerald[500]).toBe('#19C37D');
    expect(tokens.colors.crimson[500]).toBe('#E5484D');
    expect(tokens.colors.amber[500]).toBe('#F5A524');
  });

  it('should have 4px spacing scale', () => {
    expect(tokens.spacing[1]).toBe('4px');
    expect(tokens.spacing[2]).toBe('8px');
    expect(tokens.spacing[4]).toBe('16px');
  });
});

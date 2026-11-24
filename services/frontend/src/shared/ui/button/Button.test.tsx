import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Confirmer</Button>);
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeDefined();
  });

  it('handles disabled state', () => {
    render(<Button disabled>Désactivé</Button>);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders loading state without clicking', () => {
    render(<Button isLoading>Chargement</Button>);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

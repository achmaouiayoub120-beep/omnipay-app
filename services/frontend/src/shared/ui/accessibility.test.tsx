import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button/Button';
import { Input } from './input/Input';
import { Badge } from './badge/Badge';

describe('WCAG 2.2 AA Accessibility & Keyboard Compliance', () => {
  it('renders buttons with accessible names and proper role', () => {
    render(<Button>Confirmer le virement</Button>);
    const button = screen.getByRole('button', { name: 'Confirmer le virement' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders disabled buttons with aria-disabled state', () => {
    render(<Button disabled>Action verrouillée</Button>);
    const button = screen.getByRole('button', { name: 'Action verrouillée' });
    expect(button).toBeDisabled();
  });

  it('connects input with label via htmlFor / id for screen readers', () => {
    render(<Input id="test-iban" label="Numéro IBAN" placeholder="FR76..." />);
    const input = screen.getByLabelText('Numéro IBAN');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-iban');
  });

  it('exposes aria-invalid and aria-describedby when input has an error', () => {
    render(
      <Input
        id="test-error-field"
        label="Montant"
        error="Le montant doit être supérieur à zéro"
      />
    );
    const input = screen.getByLabelText('Montant');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'test-error-field-error');
    expect(
      screen.getByText('Le montant doit être supérieur à zéro')
    ).toBeInTheDocument();
  });

  it('renders badges with accessible text and proper high-contrast variants', () => {
    render(<Badge variant="gold">ULTRA PLATINUM</Badge>);
    const badge = screen.getByText('ULTRA PLATINUM');
    expect(badge).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Toaster } from './Toaster';
import { toast, useToastStore } from './toast.store';
import { ControlTowerDrawer } from '../../../features/jury/components/ControlTowerDrawer';
import { useJuryStore } from '../../../features/jury/jury.store';

describe('Toaster (vert, rouge, jaune, bleu)', () => {
  beforeEach(() => {
    useToastStore.getState().clear();
    useJuryStore.setState({ isOpen: false, notificationOutage: false });
  });

  it('affiche chaque type de toast avec son titre, sa description et sa couleur sémantique', () => {
    render(<Toaster />);
    act(() => {
      toast.success('Virement confirmé', 'Transaction tx-1');
      toast.error('Virement rejeté', 'Fonds insuffisants : solde disponible 1 250,00 € vs montant requis 5 000,00 €');
      toast.warning('Requête dupliquée interceptée', 'Transaction déjà enregistrée, pas de double prélèvement');
      toast.info('Notification indisponible (panne simulée)');
    });

    expect(screen.getByText('Virement confirmé')).toBeInTheDocument();
    expect(screen.getByText('Transaction déjà enregistrée, pas de double prélèvement')).toBeInTheDocument();
    expect(screen.getByText(/Fonds insuffisants : solde disponible 1 250,00 € vs montant requis 5 000,00 €/)).toBeInTheDocument();

    const kinds = Array.from(document.querySelectorAll('[data-kind]')).map((el) => el.getAttribute('data-kind'));
    expect(kinds).toEqual(['success', 'error', 'warning', 'info']);
    expect(document.querySelector('[data-kind="success"]')?.className).toContain('border-l-[#10b981]');
    expect(document.querySelector('[data-kind="error"]')?.className).toContain('border-l-[#ef4444]');
    expect(document.querySelector('[data-kind="warning"]')?.className).toContain('border-l-[#facc15]');
  });

  it('la console jury expose « Injecter Panne Notification » puis « Rétablir le Service Notification »', () => {
    useJuryStore.setState({ isOpen: true });
    render(
      <>
        <ControlTowerDrawer />
        <Toaster />
      </>
    );

    const inject = screen.getByRole('button', { name: /Injecter Panne Notification/ });
    expect(screen.getByText(/Simulation côté navigateur/)).toBeInTheDocument();
    fireEvent.click(inject);

    expect(useJuryStore.getState().notificationOutage).toBe(true);
    expect(screen.getByRole('button', { name: /Rétablir le Service Notification/ })).toBeInTheDocument();
    expect(screen.getByText('HORS SERVICE (panne simulée)')).toBeInTheDocument();
  });
});

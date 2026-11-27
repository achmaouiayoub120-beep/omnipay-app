import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const FaultyComponent = () => {
  throw new Error('Simulation panne inattendue composant');
};

const HealthyComponent = () => <div>Composant normal opérationnel</div>;

describe('ErrorBoundary UI Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <HealthyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Composant normal opérationnel')).toBeInTheDocument();
  });

  it('catches runtime errors and displays the resilient recovery UI', () => {
    // Suppress console.error in test output for clean logs
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <FaultyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Incident d'Interface Intercepté")).toBeInTheDocument();
    expect(
      screen.getByText(/Simulation panne inattendue composant/)
    ).toBeInTheDocument();
    expect(screen.getByText("Recharger l'application")).toBeInTheDocument();

    spy.mockRestore();
  });
});

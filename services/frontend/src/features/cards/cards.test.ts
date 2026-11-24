import { describe, it, expect, beforeEach } from 'vitest';
import { useCardsStore } from './cards.store';

describe('Cards Store & 10s Reveal Timer', () => {
  beforeEach(() => {
    useCardsStore.setState({
      revealedCardId: null,
      revealTimeRemaining: 0,
    });
  });

  it('toggles freeze state optimistically', () => {
    const cardId = 'CARD-ALICE-01';
    const initialFrozen = useCardsStore.getState().cards.find((c) => c.id === cardId)?.isFrozen;

    useCardsStore.getState().toggleFreeze(cardId);
    let updated = useCardsStore.getState().cards.find((c) => c.id === cardId)?.isFrozen;
    expect(updated).toBe(!initialFrozen);

    useCardsStore.getState().toggleFreeze(cardId);
    updated = useCardsStore.getState().cards.find((c) => c.id === cardId)?.isFrozen;
    expect(updated).toBe(initialFrozen);
  });

  it('triggers 10-second reveal timer upon revealPan', () => {
    const cardId = 'CARD-ALICE-01';
    useCardsStore.getState().revealPan(cardId);

    const state = useCardsStore.getState();
    expect(state.revealedCardId).toBe(cardId);
    expect(state.revealTimeRemaining).toBe(10);
  });

  it('decrements timer and auto-masks when timer expires', () => {
    const cardId = 'CARD-ALICE-01';
    useCardsStore.getState().revealPan(cardId);

    // Décompte de 10 à 1
    for (let i = 0; i < 9; i++) {
      useCardsStore.getState().decrementRevealTimer();
    }
    expect(useCardsStore.getState().revealTimeRemaining).toBe(1);
    expect(useCardsStore.getState().revealedCardId).toBe(cardId);

    // Dernière décrémentation -> masquage automatique
    useCardsStore.getState().decrementRevealTimer();
    expect(useCardsStore.getState().revealedCardId).toBeNull();
    expect(useCardsStore.getState().revealTimeRemaining).toBe(0);
  });
});

import { create } from 'zustand';
import { CardsState, CardDTO } from './cards.types';

const INITIAL_CARDS: CardDTO[] = [
  {
    id: 'CARD-ALICE-01',
    accountId: 'ACC-ALICE-001',
    cardholderName: 'ALICE DUPONT',
    type: 'ULTRA_PLATINUM',
    maskedPan: '•••• •••• •••• 4821',
    fullPan: '4532 8912 6743 4821',
    lastFour: '4821',
    expiryMonth: 12,
    expiryYear: 28,
    cvv: '842',
    isFrozen: false,
    isVirtual: false,
    contactlessEnabled: true,
    monthlySpendLimitMinor: 500000, // 5 000,00 €
    currentMonthSpentMinor: 145000, // 1 450,00 €
  },
  {
    id: 'CARD-BOB-01',
    accountId: 'ACC-BOB-002',
    cardholderName: 'BOB MARTIN',
    type: 'ULTRA_PLATINUM',
    maskedPan: '•••• •••• •••• 9104',
    fullPan: '4929 1102 3894 9104',
    lastFour: '9104',
    expiryMonth: 10,
    expiryYear: 27,
    cvv: '319',
    isFrozen: false,
    isVirtual: false,
    contactlessEnabled: true,
    monthlySpendLimitMinor: 300000, // 3 000,00 €
    currentMonthSpentMinor: 62000,  // 620,00 €
  },
  {
    id: 'CARD-ADMIN-01',
    accountId: 'ACC-ADMIN-004',
    cardholderName: 'ADMINISTRATEUR',
    type: 'ULTRA_PLATINUM',
    maskedPan: '•••• •••• •••• 0001',
    fullPan: '4000 1234 5678 0001',
    lastFour: '0001',
    expiryMonth: 12,
    expiryYear: 29,
    cvv: '999',
    isFrozen: false,
    isVirtual: false,
    contactlessEnabled: true,
    monthlySpendLimitMinor: 2000000, // 20 000,00 €
    currentMonthSpentMinor: 320000,  // 3 200,00 €
  },
];

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: INITIAL_CARDS,
  revealedCardId: null,
  revealTimeRemaining: 0,

  toggleFreeze: (cardId: string) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, isFrozen: !c.isFrozen } : c
      ),
    }));
  },

  revealPan: (cardId: string) => {
    set({
      revealedCardId: cardId,
      revealTimeRemaining: 10, // Révélation pendant 10 secondes exactement
    });
  },

  hidePan: () => {
    set({
      revealedCardId: null,
      revealTimeRemaining: 0,
    });
  },

  decrementRevealTimer: () => {
    const { revealTimeRemaining, hidePan } = get();
    if (revealTimeRemaining <= 1) {
      hidePan();
    } else {
      set({ revealTimeRemaining: revealTimeRemaining - 1 });
    }
  },

  getCardByAccount: (accountId: string) => {
    return get().cards.find((c) => c.accountId === accountId);
  },
}));

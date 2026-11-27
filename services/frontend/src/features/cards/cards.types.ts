/**
 * Types stricts pour la gestion des cartes bancaires OmniPay
 */

export type CardType = 'ULTRA_PLATINUM' | 'CLASSIC_EMERALD' | 'VIRTUAL_GLASS';

export interface CardDTO {
  id: string;
  accountId: string;
  cardholderName: string;
  type: CardType;
  maskedPan: string;
  fullPan: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  isFrozen: boolean;
  isVirtual: boolean;
  contactlessEnabled: boolean;
  monthlySpendLimitMinor: number;
  currentMonthSpentMinor: number;
}

export interface CardsState {
  cards: CardDTO[];
  revealedCardId: string | null;
  revealTimeRemaining: number;
  toggleFreeze: (cardId: string) => void;
  revealPan: (cardId: string) => void;
  hidePan: () => void;
  decrementRevealTimer: () => void;
  getCardByAccount: (accountId: string) => CardDTO | undefined;
}

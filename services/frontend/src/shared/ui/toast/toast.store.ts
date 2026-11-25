/**
 * OmniPay Zero-Trust - Toast Store (Zustand)
 * Notifications éphémères sémantiques : vert (succès), rouge (rejet), jaune (idempotence), bleu (information).
 * Le store est indépendant de React : les stores métier (virements, jury) peuvent émettre des toasts.
 */

import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, title: string, description?: string, durationMs?: number) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE_TOASTS = 5;
const DEFAULT_DURATION_MS = 6000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (kind, title, description, durationMs = DEFAULT_DURATION_MS) => {
    const id = crypto.randomUUID();
    set((state) => ({
      // On garde les plus récents : un triple-clic ne doit pas noyer l'écran.
      toasts: [...state.toasts, { id, kind, title, description, durationMs }].slice(-MAX_VISIBLE_TOASTS),
    }));
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

/** API impérative : `toast.success('Virement confirmé', 'Transaction …')`. */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push('success', title, description),
  error: (title: string, description?: string) => useToastStore.getState().push('error', title, description, 8000),
  warning: (title: string, description?: string) => useToastStore.getState().push('warning', title, description),
  info: (title: string, description?: string) => useToastStore.getState().push('info', title, description),
};

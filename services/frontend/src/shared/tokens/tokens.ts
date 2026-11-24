/**
 * OmniPay Zero-Trust — Design Tokens Spec
 * Source unique de vérité pour le Design System.
 * Toutes les valeurs sont dérivées pour Tailwind et variables CSS.
 */

export const tokens = {
  colors: {
    // Fond Obsidienne Profonde (Mode Sombre Prédominant)
    obsidian: {
      950: '#070A12', // Background de base / Canvas
      900: '#0B101E', // Surfaces secondaires / Panels
      850: '#0E1424', // Surface de carte
      800: '#131A2E', // Cartes actives & conteneurs
      750: '#18213A', // Hover sur cartes
      700: '#1E2947', // Bordures subtiles
      600: '#2A395E', // Bordures interactives
      500: '#3D507F', // Bordures actives
    },
    // Accent Unique : Or Champagne
    gold: {
      50: '#FAF6EE',
      100: '#F5ECDC',
      200: '#EBD7B6',
      300: '#DEC08C',
      400: '#D4A24C', // Primary Accent
      500: '#C49038',
      600: '#A4742B',
      700: '#805723',
      800: '#644220',
      900: '#4D321D',
    },
    // Succès : Émeraude
    emerald: {
      500: '#19C37D',
      600: '#14A669',
      900: '#063A23',
    },
    // Danger : Rouge Crimson
    crimson: {
      500: '#E5484D',
      600: '#CE2C31',
      900: '#4A1113',
    },
    // Avertissement : Ambre
    amber: {
      500: '#F5A524',
      600: '#D97706',
      900: '#4A2B04',
    },
    // Typographie & Platine
    platinum: {
      50: '#F8FAFC',  // Titres & Chiffres Majeurs
      100: '#F1F5F9', // Texte Principal
      200: '#E2E8F0', // Texte Secondaire Clair
      400: '#94A3B8', // Labels & Texte Atténué
      500: '#64748B', // Placeholders & Métadonnées
    },
    // Mode Clair (Contraste AA Garanti)
    light: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceMuted: '#F1F5F9',
      border: '#E2E8F0',
      borderFocus: '#CBD5E1',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
    },
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px',
  },
  radii: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '28px',
    full: '9999px',
  },
  shadows: {
    elevation1: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
    elevation2: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
    elevation3: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
    goldGlow: '0 0 24px -4px rgba(212, 162, 76, 0.35)',
    goldGlowSubtle: '0 0 12px -2px rgba(212, 162, 76, 0.2)',
    cardSpecular: '0 14px 34px 0 rgba(0, 0, 0, 0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  zIndex: {
    base: 0,
    card: 10,
    sticky: 20,
    header: 30,
    dropdown: 40,
    drawer: 50,
    modal: 60,
    toast: 70,
    tooltip: 80,
  },
} as const;

export type Tokens = typeof tokens;

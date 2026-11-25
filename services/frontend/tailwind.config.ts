import type { Config } from 'tailwindcss';
import { tokens } from './src/shared/tokens/tokens';

const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: rgb('--tw-obsidian-950'),
          900: rgb('--tw-obsidian-900'),
          850: rgb('--tw-obsidian-850'),
          800: rgb('--tw-obsidian-800'),
          780: rgb('--tw-obsidian-780'),
          750: rgb('--tw-obsidian-750'),
          700: rgb('--tw-obsidian-700'),
          600: rgb('--tw-obsidian-600'),
          500: rgb('--tw-obsidian-500'),
        },
        gold: {
          50: rgb('--tw-gold-50'),
          100: rgb('--tw-gold-100'),
          200: rgb('--tw-gold-200'),
          300: rgb('--tw-gold-300'),
          400: rgb('--tw-gold-400'),
          500: rgb('--tw-gold-500'),
          600: rgb('--tw-gold-600'),
          700: rgb('--tw-gold-700'),
          800: rgb('--tw-gold-800'),
          900: rgb('--tw-gold-900'),
        },
        emerald: {
          500: rgb('--tw-emerald-500'),
          600: rgb('--tw-emerald-600'),
          900: rgb('--tw-emerald-900'),
        },
        crimson: {
          500: rgb('--tw-crimson-500'),
          600: rgb('--tw-crimson-600'),
          900: rgb('--tw-crimson-900'),
        },
        amber: {
          500: rgb('--tw-amber-500'),
          600: rgb('--tw-amber-600'),
          900: rgb('--tw-amber-900'),
        },
        platinum: {
          50: rgb('--tw-platinum-50'),
          100: rgb('--tw-platinum-100'),
          200: rgb('--tw-platinum-200'),
          400: rgb('--tw-platinum-400'),
          500: rgb('--tw-platinum-500'),
        },
        light: tokens.colors.light,
      },
      borderRadius: tokens.radii,
      boxShadow: {
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
        'gold-glow': 'var(--shadow-gold-glow)',
        'gold-glow-subtle': tokens.shadows.goldGlowSubtle,
        'card-specular': tokens.shadows.cardSpecular,
      },
      fontFamily: {
        sans: [
          '"Geist Variable"',
          'Geist',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono Variable"',
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      zIndex: {
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

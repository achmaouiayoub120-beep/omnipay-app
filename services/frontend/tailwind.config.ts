import type { Config } from 'tailwindcss';
import { tokens } from './src/shared/tokens/tokens';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: tokens.colors.obsidian,
        gold: tokens.colors.gold,
        emerald: tokens.colors.emerald,
        crimson: tokens.colors.crimson,
        amber: tokens.colors.amber,
        platinum: tokens.colors.platinum,
        light: tokens.colors.light,
      },
      borderRadius: tokens.radii,
      boxShadow: {
        'elevation-1': tokens.shadows.elevation1,
        'elevation-2': tokens.shadows.elevation2,
        'elevation-3': tokens.shadows.elevation3,
        'gold-glow': tokens.shadows.goldGlow,
        'gold-glow-subtle': tokens.shadows.goldGlowSubtle,
        'card-specular': tokens.shadows.cardSpecular,
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
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
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
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

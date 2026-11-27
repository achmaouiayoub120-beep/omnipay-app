import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Cibles des proxys /api (dev et preview). Par défaut les ports de docker-compose ; si soutenance.ps1 a dû choisir d'autres ports hôtes
// (AUTH_PORT, TRANSACTION_PORT, NOTIFICATION_PORT), exporter OMNIPAY_AUTH_URL / OMNIPAY_TRANSACTION_URL / OMNIPAY_NOTIFICATION_URL.
const AUTH_URL = process.env.OMNIPAY_AUTH_URL || 'http://localhost:8081';
const TRANSACTION_URL = process.env.OMNIPAY_TRANSACTION_URL || 'http://localhost:8082';
const NOTIFICATION_URL = process.env.OMNIPAY_NOTIFICATION_URL || 'http://localhost:8083';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/auth': {
        target: AUTH_URL,
        changeOrigin: true,
      },
      '/api/transactions': {
        target: TRANSACTION_URL,
        changeOrigin: true,
      },
      '/api/notifications': {
        target: NOTIFICATION_URL,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
    proxy: {
      '/api/auth': {
        target: AUTH_URL,
        changeOrigin: true,
      },
      '/api/transactions': {
        target: TRANSACTION_URL,
        changeOrigin: true,
      },
      '/api/notifications': {
        target: NOTIFICATION_URL,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          icons: ['@phosphor-icons/react'],
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});

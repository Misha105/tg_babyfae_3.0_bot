import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom'],
          // State management
          'vendor-zustand': ['zustand'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Telegram SDK
          'vendor-telegram': ['@telegram-apps/sdk', '@telegram-apps/sdk-react'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
          // UI utilities
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
  },
})

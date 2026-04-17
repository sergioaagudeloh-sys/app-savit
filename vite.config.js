import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Group everything under /admin into one admin bundle
          if (id.includes('pages/admin') || id.includes('components/layout/Admin')) {
            return 'admin-bundle';
          }
          // Group vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-motion';
            return 'vendor';
          }
        }
      }
    }
  },
})


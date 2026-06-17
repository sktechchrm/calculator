import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',        // enable JS minification
    cssMinify: true,          // enable CSS minification
    rollupOptions: {
      output: {
        // Keep single chunk for Capacitor WebView compatibility
        manualChunks: undefined,
      },
    },
  },
})

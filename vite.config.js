import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [react()],
  server: {
    // The frontend calls the API with relative URLs (API_BASE_URL === '' when
    // VITE_API_URL is unset), so the dev server must forward /api and the
    // socket.io upgrade to the Express backend on :3001. Without this, requests
    // hit Vite itself and fail with "Failed to fetch".
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor libraries into their own long-cached chunks so a
        // deploy of app code doesn't invalidate the entire bundle for every
        // returning visitor.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
});

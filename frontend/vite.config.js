import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          query: ['react-query'],
          utils: ['axios', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 600 // Increase warning limit slightly
  },
  define: {
    'process.env': process.env
  }
}) 
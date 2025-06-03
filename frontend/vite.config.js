import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Optimized Vite config for BIAN API Generator
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          query: ['react-query'],
          utils: ['axios', 'react-hot-toast'],
          editor: ['@monaco-editor/react', 'swagger-ui-react']
        }
      }
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false // Disable sourcemaps for production
  },
  define: {
    'process.env': process.env
  }
}) 
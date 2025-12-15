import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['dompurify', 'marked', 'easymde']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['dompurify', 'marked']
  }
})

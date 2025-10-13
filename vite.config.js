import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    // Configuración para SPA - todas las rutas redirigen a index.html
    historyApiFallback: true
  },
  build: {
    target: 'es2015'
  }
})

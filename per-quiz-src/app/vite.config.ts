import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The question figures (img/) are copied into dist/ and served as static assets with the web.
  publicDir: '../web/data',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})

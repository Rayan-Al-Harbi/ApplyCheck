import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth/register': 'http://localhost:8000',
      '/auth/login': 'http://localhost:8000',
      '/auth/google': 'http://localhost:8000',
      '/auth/linkedin': 'http://localhost:8000',
      '/cv': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/analyses': 'http://localhost:8000',
      '/rescore': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})

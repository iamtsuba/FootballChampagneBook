import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/generate': {
        target: 'https://api.anthropic.com/v1/messages',
        changeOrigin: true,
        rewrite: () => '',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const apiKey = process.env.ANTHROPIC_API_KEY || ''
            proxyReq.setHeader('x-api-key', apiKey)
            proxyReq.setHeader('anthropic-version', '2023-06-01')
          })
        }
      }
    }
  }
})

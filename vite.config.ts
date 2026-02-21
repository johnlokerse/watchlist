import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/trakt-api': {
        target: 'https://api.trakt.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trakt-api/, ''),
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // Disable Nagle's algorithm on the browser-facing socket for SSE responses
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              (res as NodeJS.WritableStream & { socket?: { setNoDelay(v: boolean): void } }).socket?.setNoDelay(true);
            }
          });
        },
      },
    },
  },
})

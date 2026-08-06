import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // Dev-only reverse proxy: the backend's CORS allowlist covers only the
    // production domains, so the browser can't reach the admin API from
    // localhost. adminApi.js uses a relative `/api/admin` base in dev, so these
    // requests stay same-origin and Vite forwards them server-to-server, where
    // CORS doesn't apply. cookieDomainRewrite retargets the backend's Set-Cookie
    // session cookie to localhost so the browser stores it (this app auths with
    // a cookie, not a Bearer token).
    proxy: {
      '/api': {
        target: 'https://bookmyvenues-backend.onrender.com',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})

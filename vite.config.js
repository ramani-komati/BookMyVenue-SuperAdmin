import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@` → super-admin/src, matching the customer app so the venue-registration
    // logic modules ported from there resolve their imports unchanged.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
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

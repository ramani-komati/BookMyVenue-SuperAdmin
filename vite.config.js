import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Where the dev proxy forwards /api.
//
// Defaults to the deployed backend, so a fresh clone works with NO env file
// at all — .env.example stays the only env file in this project.
//
// Point it at a LOCAL backend for one run, from the command line:
//
//     # PowerShell
//     $env:VITE_DEV_PROXY_TARGET="http://127.0.0.1:8000"; npm run dev
//     # bash
//     VITE_DEV_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
//
// Both sources are consulted: `loadEnv` (an .env file, if anyone chooses to
// add one) and `process.env` (the command line). The command line wins, so
// a one-off override never needs a file to be created and then remembered.
//
// Going through the proxy keeps requests same-origin, which is what sidesteps
// the backend's CORS allowlist (it covers the production domains, not
// localhost).
const PROD_BACKEND = 'https://bookmyvenues-backend.onrender.com'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  // Command line beats an .env file beats the deployed default.
  const pick = (name, fallback) => process.env[name] || fileEnv[name] || fallback
  const target = pick('VITE_DEV_PROXY_TARGET', PROD_BACKEND)

  return {
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
          target,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  }
})

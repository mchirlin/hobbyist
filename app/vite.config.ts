/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwa } from './scripts/pwa-plugin'

// `base` controls the path assets resolve under. Local dev + other hosts serve
// at root ('/'); GitHub Pages project sites serve under '/<repo>/', so the CI
// workflow sets VITE_BASE=/hobbyist/ for that build only.
//
// The Vitest `test` config is merged HERE (rather than a separate
// vitest.config.ts) — a standalone vitest.config.ts is transpiled to a temp
// file under node_modules/.vite-temp/ whose relative resolution of
// 'vitest/config' fails on the CI runner (ERR_MODULE_NOT_FOUND). Vitest reads
// vite.config.ts natively, so folding it in removes that failing step.
// Tailnet (phone) access: `npm run dev:lan` sets DEV_LAN=1, which binds the
// dev server to all interfaces so a Tailscale host can reach it. Plain
// `npm run dev` leaves `host` undefined → localhost-only, unchanged.
// `allowedHosts` whitelists any `*.ts.net` tailnet hostname so Vite 6's
// host-header check doesn't reject it with "Blocked request"; it's inert for
// localhost traffic, so it's safe to leave on in both modes.
const lan = process.env.DEV_LAN === '1'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), pwa()],
  server: {
    host: lan ? '0.0.0.0' : undefined,
    allowedHosts: ['.ts.net'],
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

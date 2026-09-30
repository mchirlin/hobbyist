/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` controls the path assets resolve under. Local dev + other hosts serve
// at root ('/'); GitHub Pages project sites serve under '/<repo>/', so the CI
// workflow sets VITE_BASE=/hobbyist/ for that build only.
//
// The Vitest `test` config is merged HERE (rather than a separate
// vitest.config.ts) — a standalone vitest.config.ts is transpiled to a temp
// file under node_modules/.vite-temp/ whose relative resolution of
// 'vitest/config' fails on the CI runner (ERR_MODULE_NOT_FOUND). Vitest reads
// vite.config.ts natively, so folding it in removes that failing step.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

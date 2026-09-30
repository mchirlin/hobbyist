import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The app's unit tests live under src/. The scripts/ephemeral-sync/*.test.mjs
// files are standalone node scripts (they self-run, not Vitest suites), so we
// scope collection to src/ and exclude scripts/ explicitly.
//
// jsdom is used so component tests (.tsx) can render React; the pure logic
// tests run fine under it too.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

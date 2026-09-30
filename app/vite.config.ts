import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` controls the path assets resolve under. Local dev + other hosts serve
// at root ('/'); GitHub Pages project sites serve under '/<repo>/', so the CI
// workflow sets VITE_BASE=/hobbyist/ for that build only.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})

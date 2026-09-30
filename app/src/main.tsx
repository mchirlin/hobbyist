import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BirdBadge } from './components/BirdBadge.tsx'
import './index.css'
import { registerBadgeArt } from './components/badgeArt'

registerBadgeArt()

// v1 IS the badge — the single-hobby eBird life-list badge (the sharpest cut,
// see ASSESSMENT.md) is the default, so a shared link is a clean URL. The full
// multi-hobby prototype is parked at ?full while we validate whether the badge
// spreads.
const isFull = new URLSearchParams(window.location.search).has('full')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isFull ? <App /> : <BirdBadge />}</StrictMode>,
)

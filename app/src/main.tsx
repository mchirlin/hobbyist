import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BirdBadge } from './components/BirdBadge.tsx'
import './index.css'
import { registerBadgeArt } from './components/badgeArt'

registerBadgeArt()

// v1 lives at ?badge — the single-hobby eBird life-list badge (the sharpest
// cut, see ASSESSMENT.md). The full multi-hobby prototype stays at the root
// while we validate whether the badge actually spreads.
const isBadge = new URLSearchParams(window.location.search).has('badge')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isBadge ? <BirdBadge /> : <App />}</StrictMode>,
)

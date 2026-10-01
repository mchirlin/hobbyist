import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BirdBadge } from './components/BirdBadge.tsx'
import './index.css'
import { registerBadgeArt } from './components/badgeArt'

registerBadgeArt()

// Home surface IS the collection case (declare-first, enrich-later — see
// ASSESSMENT.md): the multi-hobby sash with instant "add a hobby" is the
// product, because breadth is the whole thesis for the Renaissance-collector
// market. The single-hobby eBird share badge is parked at ?badge.
const isBadge = new URLSearchParams(window.location.search).has('badge')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isBadge ? <BirdBadge /> : <App />}</StrictMode>,
)

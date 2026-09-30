import { describe, it, expect, beforeEach } from 'vitest'
import { resolveArt, registerArt, unregisterArt, hobbiesWithArt } from './art'

describe('badge-art fallback chain', () => {
  beforeEach(() => {
    // Clear any registered images so tests start from the emblem/emoji baseline.
    for (const h of hobbiesWithArt()) unregisterArt(h)
  })

  it('prefers a registered image when present', () => {
    registerArt('Birding', '/badges/birding.svg', 'bird')
    const art = resolveArt('Birding', '🐦')
    expect(art).toEqual({ kind: 'image', href: '/badges/birding.svg', alt: 'bird' })
  })

  it('falls back to the hand-drawn inline emblem', () => {
    const art = resolveArt('Birding', '🐦') // no image registered
    expect(art.kind).toBe('inline-svg')
    if (art.kind === 'inline-svg') expect(art.svg).toContain('path')
  })

  it('falls back to the emoji icon when no emblem exists', () => {
    const art = resolveArt('Underwater Basket Weaving', '🧺')
    expect(art).toEqual({ kind: 'emoji', glyph: '🧺' })
  })

  it('falls back to the star emblem when nothing else is available', () => {
    const art = resolveArt('Totally Unknown Hobby')
    expect(art.kind).toBe('inline-svg') // STAR_EMBLEM
  })

  it('a default alt is derived from the hobby name', () => {
    registerArt('Ultimate', '/badges/ultimate.svg')
    const art = resolveArt('Ultimate')
    if (art.kind === 'image') expect(art.alt).toBe('Ultimate badge')
  })
})

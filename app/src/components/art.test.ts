import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveArt,
  registerArt,
  registerInlineArt,
  unregisterArt,
  hobbiesWithArt,
} from './art'
import { tierForLevel, earnedBadge } from './generatedBadges'

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

  it('prefers inline SVG over an external image (export-safe path)', () => {
    registerArt('Birding', '/badges/birding.svg', 'bird')
    registerInlineArt('Birding', '<svg><path/></svg>')
    const art = resolveArt('Birding', '🐦')
    expect(art).toEqual({ kind: 'inline-svg', svg: '<svg><path/></svg>' })
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

describe('earned-tier mapping (level → generated art tier)', () => {
  it('maps the five levels onto the first five art tiers in order', () => {
    expect(tierForLevel(0)).toBe('copper') // Novice
    expect(tierForLevel(1)).toBe('silver') // Apprentice
    expect(tierForLevel(2)).toBe('gold') // Skilled
    expect(tierForLevel(3)).toBe('emerald') // Expert
    expect(tierForLevel(4)).toBe('ruby') // Master
  })

  it('upgrades a maxed Master from ruby to diamond, but not lower levels', () => {
    expect(tierForLevel(4, true)).toBe('diamond')
    expect(tierForLevel(3, true)).toBe('emerald') // maxed below Master stays
    expect(tierForLevel(0, true)).toBe('copper')
  })

  it('clamps out-of-range levels into the ladder', () => {
    expect(tierForLevel(-5)).toBe('copper')
    expect(tierForLevel(99)).toBe('ruby')
    expect(tierForLevel(99, true)).toBe('diamond')
  })

  it('resolveArt with a tier falls through to the chain when no generated art exists', () => {
    // No generated PNGs in the test build, so the tier path finds nothing and
    // falls back to the name-keyed chain (here, the emoji icon).
    expect(earnedBadge('nonexistent-slug', 'gold')).toBeUndefined()
    const art = resolveArt('Mystery Hobby', '🧩', { slug: 'mystery-hobby', earnedTier: 'gold' })
    expect(art).toEqual({ kind: 'emoji', glyph: '🧩' })
  })
})

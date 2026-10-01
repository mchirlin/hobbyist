import { describe, it, expect } from 'vitest'
// The badge generator is author-time tooling under scripts/, but its PURE recipe
// logic is load-bearing (the prompts that produce consistent art), so it's
// covered here where the vitest runner reaches (scripts/** is excluded).
import {
  buildRequest,
  seedForSlug,
  subjectFor,
  TIERS,
  INVOKE,
} from '../../scripts/badge-gen/recipes.mjs'
import { slugify as slugTwin } from '../../scripts/badge-gen/slug.mjs'
import { slugify as slugTs } from './hobbyDefinition'

describe('badge-gen recipes', () => {
  const copper = TIERS.find((t) => t.key === 'copper')!
  const ruby = TIERS.find((t) => t.key === 'ruby')!

  it('has six tiers across two media in ladder order', () => {
    expect(TIERS.map((t) => t.key)).toEqual([
      'copper', 'silver', 'gold', 'emerald', 'ruby', 'diamond',
    ])
    expect(TIERS.filter((t) => t.medium === 'patch')).toHaveLength(3)
    expect(TIERS.filter((t) => t.medium === 'jewel')).toHaveLength(3)
  })

  it('builds a patch prompt with the metal + hex anchor and patch negatives', () => {
    const req = buildRequest('a single bluebird', copper, 12345)
    expect(req.prompt).toContain('a single bluebird')
    expect(req.prompt).toContain('embroidered iron-on patch')
    expect(req.prompt).toContain('polished copper')
    expect(req.prompt).toContain('#B87333')
    expect(req.negative_prompt).toContain('green border')
    expect(req.seed).toBe(12345)
    expect(req.aspect_ratio).toBe(INVOKE.aspectRatio)
  })

  it('builds a jewel prompt with the gem anchor and jewel negatives (no stitching)', () => {
    const req = buildRequest('a single bluebird', ruby, 777)
    expect(req.prompt).toContain('cloisonne enamel medallion')
    expect(req.prompt).toContain('deep red ruby')
    expect(req.prompt).not.toContain('embroidered')
    expect(req.negative_prompt).toContain('stitching')
  })

  it('seedForSlug is deterministic and non-zero', () => {
    expect(seedForSlug('birding')).toBe(seedForSlug('birding'))
    expect(seedForSlug('climbing')).not.toBe(seedForSlug('birding'))
    expect(seedForSlug('birding')).toBeGreaterThan(0)
  })

  it('subjectFor returns the curated phrase, else a literal fallback (never the raw name alone)', () => {
    expect(subjectFor('Birding')).toContain('bluebird')
    expect(subjectFor('Underwater Basket Weaving')).toContain('Underwater Basket Weaving')
    expect(subjectFor('Underwater Basket Weaving')).toContain('symbol')
  })

  it('the node slug twin matches the TS data-model slugify (no drift)', () => {
    for (const name of ['Birding', '3D Printing', 'Board Games', '  Trailing  ', 'Umlaut!!']) {
      expect(slugTwin(name)).toBe(slugTs(name))
    }
  })
})

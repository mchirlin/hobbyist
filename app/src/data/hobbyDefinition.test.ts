import { describe, it, expect } from 'vitest'
import {
  buildSeedDefinitions,
  slugify,
  defaultLevels,
  normalizeLevels,
  medalsFromDefinition,
  milestonesFromDefinition,
  levelNamesFromDefinition,
  xpThresholdsFromDefinition,
  type HobbyDefinition,
} from './hobbyDefinition'
import { MEDALS_BY_HOBBY } from '../quests/medals'
import { sampleQuests } from '../quests/sampleQuests'
import { LEVELS } from './types'
import { LEVEL_XP_THRESHOLDS } from '../quests/quests'
import { sampleProfile } from './sampleProfile'

describe('slugify', () => {
  it('lowercases and hyphenates non-alphanumerics', () => {
    expect(slugify('3D Printing')).toBe('3d-printing')
    expect(slugify('Video Making')).toBe('video-making')
    expect(slugify('  Rock / Climbing!  ')).toBe('rock-climbing')
  })
})

describe('defaultLevels', () => {
  it('mirrors LEVELS + LEVEL_XP_THRESHOLDS exactly (lossless lift)', () => {
    const levels = defaultLevels()
    expect(levels.map((l) => l.name)).toEqual([...LEVELS])
    expect(levels.map((l) => l.xpThreshold)).toEqual(LEVEL_XP_THRESHOLDS)
  })
})

describe('normalizeLevels — the author-safety invariant', () => {
  it('forces rung 0 to a 0-XP threshold', () => {
    const out = normalizeLevels([
      { name: 'Start', xpThreshold: 50 },
      { name: 'Next', xpThreshold: 200 },
    ])
    expect(out[0].xpThreshold).toBe(0)
    expect(out[0].name).toBe('Start')
  })

  it('nudges a non-ascending threshold to prior+1 so no rung is unreachable', () => {
    const out = normalizeLevels([
      { name: 'A', xpThreshold: 0 },
      { name: 'B', xpThreshold: 100 },
      { name: 'C', xpThreshold: 100 }, // equal — must become 101
      { name: 'D', xpThreshold: 40 }, // lower — must become 102
    ])
    expect(out.map((l) => l.xpThreshold)).toEqual([0, 100, 101, 102])
  })

  it('falls back to a single Novice rung on an empty ladder', () => {
    expect(normalizeLevels([])).toEqual([{ name: 'Novice', xpThreshold: 0 }])
  })

  it('fills a blank rung name with a positional default and trims names', () => {
    const out = normalizeLevels([
      { name: '  ', xpThreshold: 0 },
      { name: '  Expert  ', xpThreshold: 500 },
    ])
    expect(out[0].name).toBe('Level 1')
    expect(out[1].name).toBe('Expert')
  })

  it('floors negative/NaN thresholds and keeps integers', () => {
    const out = normalizeLevels([
      { name: 'A', xpThreshold: -5 },
      { name: 'B', xpThreshold: Number.NaN },
      { name: 'C', xpThreshold: 12.9 },
    ])
    expect(out.map((l) => l.xpThreshold)).toEqual([0, 1, 12])
  })

  it('supports a custom-length ladder (name your own rungs)', () => {
    const out = normalizeLevels([
      { name: 'Hatchling', xpThreshold: 0 },
      { name: 'Fledgling', xpThreshold: 30 },
      { name: 'Flyer', xpThreshold: 90 },
    ])
    expect(out).toHaveLength(3)
    expect(out.map((l) => l.name)).toEqual(['Hatchling', 'Fledgling', 'Flyer'])
  })
})

describe('buildSeedDefinitions — the lift is lossless', () => {
  const defs = buildSeedDefinitions()
  const bySlug = new Map(defs.map((d) => [d.slug, d]))

  it('includes every hobby from the seed profile, medal catalog, and quests (the union)', () => {
    const names = new Set<string>()
    for (const h of sampleProfile.hobbies) names.add(h.name)
    for (const n of Object.keys(MEDALS_BY_HOBBY)) names.add(n)
    for (const q of sampleQuests) names.add(q.hobby)
    for (const n of names) {
      expect(bySlug.has(slugify(n)), `missing definition for ${n}`).toBe(true)
    }
  })

  it('reproduces each hobby\'s medals exactly as metric badges', () => {
    for (const [hobby, medals] of Object.entries(MEDALS_BY_HOBBY)) {
      const def = bySlug.get(slugify(hobby))!
      const lifted = medalsFromDefinition(def)
      expect(lifted).toEqual(medals)
    }
  })

  it('reproduces each hobby\'s quests from sampleQuests', () => {
    const birding = bySlug.get('birding')!
    const birdingQuests = sampleQuests.filter((q) => q.hobby === 'Birding')
    expect(birding.quests.map((q) => q.id)).toEqual(birdingQuests.map((q) => q.id))
    expect(birding.quests.map((q) => q.text)).toEqual(birdingQuests.map((q) => q.text))
  })

  it('reproduces each hobby\'s missions from the seed profile', () => {
    for (const h of sampleProfile.hobbies) {
      const def = bySlug.get(slugify(h.name))!
      expect(def.missions).toEqual(
        (h.missions ?? []).map((m) => ({ text: m.text, level: m.level })),
      )
    }
  })

  it('carries category + emblem from the seed profile', () => {
    const printing = bySlug.get('3d-printing')!
    expect(printing.category).toBe('Making')
    expect(printing.emblem).toBe('🖨️')
  })

  it('every definition has the default level ladder and v1 published metadata', () => {
    for (const d of defs) {
      expect(levelNamesFromDefinition(d)).toEqual([...LEVELS])
      expect(xpThresholdsFromDefinition(d)).toEqual(LEVEL_XP_THRESHOLDS)
      expect(d.version).toBe(1)
      expect(d.status).toBe('published')
    }
  })

  it('is deterministic — same output every call', () => {
    expect(buildSeedDefinitions()).toEqual(buildSeedDefinitions())
  })

  it('orders seed-profile hobbies first, in profile order', () => {
    const seedOrder = sampleProfile.hobbies.map((h) => h.name)
    const defNames = defs.map((d) => d.name).filter((n) => seedOrder.includes(n))
    expect(defNames).toEqual(seedOrder)
  })
})

describe('accessors', () => {
  const def: HobbyDefinition = {
    slug: 'test',
    name: 'Test',
    category: 'Making',
    emblem: '✨',
    description: 'x',
    levels: defaultLevels(),
    missions: [],
    quests: [],
    badges: [
      { kind: 'metric', id: 'm1', name: 'M', unit: 'u', metricKey: 'k', how: 'h', tiers: [{ name: 'Bronze', threshold: 1 }] },
      { kind: 'milestone', id: 'ms1', name: 'First thing', how: 'do it', claim: 'self' },
    ],
    admins: [],
    memberCount: 1,
    version: 1,
    status: 'published',
  }

  it('medalsFromDefinition returns only metric badges, as Medal[]', () => {
    const medals = medalsFromDefinition(def)
    expect(medals).toHaveLength(1)
    expect(medals[0].metricKey).toBe('k')
  })

  it('milestonesFromDefinition returns only milestone badges', () => {
    const ms = milestonesFromDefinition(def)
    expect(ms).toHaveLength(1)
    expect(ms[0].claim).toBe('self')
  })
})

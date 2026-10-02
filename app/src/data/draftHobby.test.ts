import { describe, it, expect } from 'vitest'
import {
  draftHobby,
  draftDescription,
  draftMissions,
  draftQuests,
  draftBadges,
  draftResources,
} from './draftHobby'
import { normalizeLevels } from './hobbyDefinition'

describe('draftHobby', () => {
  it('drafts every facet from name + category', () => {
    const { draft, source } = draftHobby('Pottery', 'Craft')
    expect(source).toBe('template')
    expect(draft.name).toBe('Pottery')
    expect(draft.slug).toBe('pottery')
    expect(draft.category).toBe('Craft')
    expect(draft.description.length).toBeGreaterThan(20)
    expect(draft.levels.length).toBeGreaterThan(0)
    expect(draft.missions.length).toBeGreaterThan(0)
    expect(draft.quests.length).toBe(3) // daily/weekly/monthly
    expect(draft.badges.length).toBeGreaterThan(0)
    expect(draft.resources && draft.resources.length).toBeGreaterThan(0)
    expect(draft.status).toBe('draft')
  })

  it('produces an engine-safe level ladder (rung 0 at 0 XP, ascending)', () => {
    const { draft } = draftHobby('Running', 'Sport')
    expect(draft.levels).toEqual(normalizeLevels(draft.levels))
    expect(draft.levels[0].xpThreshold).toBe(0)
    for (let i = 1; i < draft.levels.length; i++) {
      expect(draft.levels[i].xpThreshold).toBeGreaterThan(draft.levels[i - 1].xpThreshold)
    }
  })

  it('clamps missions to real rungs', () => {
    const { draft } = draftHobby('Running', 'Sport')
    const top = draft.levels.length - 1
    for (const m of draft.missions) expect(m.level).toBeLessThanOrEqual(top)
  })

  it('uses the given emblem, else a category default', () => {
    expect(draftHobby('Pottery', 'Craft', { emblem: '🏺' }).draft.emblem).toBe('🏺')
    expect(draftHobby('Pottery', 'Craft').draft.emblem).not.toBe('') // category default
  })

  it('is deterministic', () => {
    expect(draftHobby('Pottery', 'Craft')).toEqual(draftHobby('Pottery', 'Craft'))
  })

  it('scopes quest and badge ids to the slug (no collisions across hobbies)', () => {
    const a = draftHobby('Pottery', 'Craft').draft
    const b = draftHobby('Running', 'Sport').draft
    const aIds = [...a.quests.map((q) => q.id), ...a.badges.map((x) => x.id)]
    const bIds = [...b.quests.map((q) => q.id), ...b.badges.map((x) => x.id)]
    expect(aIds.some((id) => bIds.includes(id))).toBe(false)
  })
})

describe('draft facets', () => {
  it('description mentions the hobby', () => {
    expect(draftDescription('Birding', 'Outdoors')).toContain('Birding')
  })
  it('missions escalate across levels and the first is level 0', () => {
    const ms = draftMissions('Birding', 'Outdoors')
    expect(ms[0].level).toBe(0)
    expect(ms.every((m, i) => (i === 0 ? true : m.level >= ms[i - 1].level))).toBe(true)
  })
  it('quests cover all three cadences', () => {
    const cadences = draftQuests('Birding', 'Outdoors').map((q) => q.cadence).sort()
    expect(cadences).toEqual(['daily', 'monthly', 'weekly'])
  })
  it('badges are self-claim milestones', () => {
    for (const b of draftBadges('Birding', 'Outdoors')) {
      expect(b.kind).toBe('milestone')
      if (b.kind === 'milestone') expect(b.claim).toBe('self')
    }
  })
})

describe('draftResources', () => {
  it('always includes a community link (the flagship board)', () => {
    for (const name of ['Birding', 'Pottery', 'Underwater Basket Weaving']) {
      const res = draftResources(name, 'Craft')
      expect(res.some((r) => r.kind === 'community')).toBe(true)
    }
  })

  it('uses the curated set for a known hobby (correct subreddit + apps)', () => {
    const res = draftResources('Birding', 'Outdoors')
    const community = res.find((r) => r.kind === 'community')
    expect(community?.url).toContain('reddit.com/r/birding')
    expect(res.some((r) => r.kind === 'app' && /ebird/i.test(r.label))).toBe(true)
  })

  it('falls back for an unknown hobby with a guessed board + a lookup', () => {
    const res = draftResources('Zorbing', 'Sport')
    expect(res.find((r) => r.kind === 'community')?.url).toContain('reddit.com/r/')
    expect(res.length).toBeGreaterThanOrEqual(2)
  })

  it('every resource has a label and a url', () => {
    for (const r of draftResources('Zorbing', 'Sport')) {
      expect(r.label.trim().length).toBeGreaterThan(0)
      expect(r.url).toMatch(/^https?:\/\//)
    }
  })
})

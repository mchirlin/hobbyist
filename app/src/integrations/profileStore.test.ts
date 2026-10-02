import { describe, it, expect } from 'vitest'
import {
  isDeclared,
  readProfile,
  addHobby,
  removeHobby,
  setImportance,
  applyActivity,
  clearProgress,
  profileStore,
  type StorageBackend,
} from './profileStore'
import { sampleProfile } from '../data/sampleProfile'
import type { HobbyActivity } from './activity'

// In-memory backend so the pure logic is testable without localStorage.
function memBackend(): StorageBackend {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

describe('isDeclared', () => {
  it('is true when a hobby has no metricCounts (an empty, unearned patch)', () => {
    expect(isDeclared({ name: 'Pottery', category: 'Craft', importance: 4 })).toBe(true)
  })
  it('is true when metricCounts exist but are all zero/falsy', () => {
    expect(
      isDeclared({ name: 'X', category: 'Craft', importance: 4, metricCounts: { 'x.y': 0 } }),
    ).toBe(true)
  })
  it('is false once a connector has fed real data', () => {
    expect(
      isDeclared({ name: 'Birding', category: 'Outdoors', importance: 5, metricCounts: { 'ebird.species': 47 } }),
    ).toBe(false)
  })
})

describe('readProfile', () => {
  it('seeds from sampleProfile on empty storage', () => {
    const b = memBackend()
    expect(readProfile(b).hobbies.length).toBe(sampleProfile.hobbies.length)
  })
  it('falls back to sampleProfile on malformed JSON', () => {
    const b = memBackend()
    b.setItem('hobbyist.profile.v1', '{not json')
    expect(readProfile(b).displayName).toBe(sampleProfile.displayName)
  })
})

describe('addHobby — declare-first', () => {
  it('drops a declared (empty) patch: no metricCounts, level 0', () => {
    const b = memBackend()
    const p = addHobby(b, { name: 'Pottery', category: 'Craft', icon: '🏺' })
    const added = p.hobbies.find((h) => h.name === 'Pottery')!
    expect(added).toBeTruthy()
    expect(added.metricCounts).toBeUndefined()
    expect(added.level).toBe(0)
    expect(isDeclared(added)).toBe(true)
  })
  it('persists across a re-read (survives a reload)', () => {
    const b = memBackend()
    addHobby(b, { name: 'Pottery', category: 'Craft' })
    expect(readProfile(b).hobbies.some((h) => h.name === 'Pottery')).toBe(true)
  })
  it('is a no-op on a duplicate name (case-insensitive)', () => {
    const b = memBackend()
    addHobby(b, { name: 'Pottery', category: 'Craft' })
    const p = addHobby(b, { name: 'pottery', category: 'Making' })
    expect(p.hobbies.filter((h) => h.name.toLowerCase() === 'pottery')).toHaveLength(1)
  })
  it('ignores an empty/whitespace name', () => {
    const b = memBackend()
    const before = readProfile(b).hobbies.length
    const p = addHobby(b, { name: '   ', category: 'Craft' })
    expect(p.hobbies.length).toBe(before)
  })
  it('clamps importance to 1–10', () => {
    const b = memBackend()
    const p = addHobby(b, { name: 'Big', category: 'Craft', importance: 99 })
    expect(p.hobbies.find((h) => h.name === 'Big')!.importance).toBe(10)
  })
})

describe('removeHobby', () => {
  it('removes a hobby by name and persists', () => {
    const b = memBackend()
    addHobby(b, { name: 'Pottery', category: 'Craft' })
    removeHobby(b, 'Pottery')
    expect(readProfile(b).hobbies.some((h) => h.name === 'Pottery')).toBe(false)
  })
})

describe('setImportance', () => {
  it('sets and clamps importance for one hobby', () => {
    const b = memBackend()
    addHobby(b, { name: 'Pottery', category: 'Craft', importance: 4 })
    setImportance(b, 'Pottery', 20)
    expect(readProfile(b).hobbies.find((h) => h.name === 'Pottery')!.importance).toBe(10)
  })
})

describe('applyActivity — enrich half of the loop', () => {
  it('flips a declared patch to enriched by merging metricCounts', () => {
    const b = memBackend()
    // Use a name NOT in sampleProfile so it starts genuinely declared (the seed
    // already has an enriched "Birding", which would make addHobby a no-op).
    addHobby(b, { name: 'Falconry', category: 'Outdoors' })
    const before = readProfile(b).hobbies.find((h) => h.name === 'Falconry')!
    expect(isDeclared(before)).toBe(true)

    const a: HobbyActivity = {
      hobby: 'Falconry',
      source: 'ebird-csv',
      activityCount: 247,
      level: 2,
      evidence: [],
      metricCounts: { 'falconry.flights': 247 },
    }
    applyActivity(b, a)

    const after = readProfile(b).hobbies.find((h) => h.name === 'Falconry')!
    expect(isDeclared(after)).toBe(false)
    expect(after.metricCounts!['falconry.flights']).toBe(247)
    expect(after.level).toBe(2)
  })
  it('leaves non-matching hobbies untouched', () => {
    const b = memBackend()
    addHobby(b, { name: 'Pottery', category: 'Craft' })
    applyActivity(b, {
      hobby: 'Birding', source: 'x', activityCount: 10, level: 1, evidence: [],
      metricCounts: { 'ebird.species': 10 },
    })
    expect(isDeclared(readProfile(b).hobbies.find((h) => h.name === 'Pottery')!)).toBe(true)
  })
})

describe('profileStore (browser singleton) — persistence + reactivity', () => {
  // jsdom provides a real localStorage; the singleton wires to it. This proves
  // the declare-first loop's keystone: an added hobby SURVIVES being re-read
  // from storage (the "it stays in my collection across a reload" guarantee).
  it('persists an added hobby to localStorage and notifies subscribers', () => {
    profileStore.reset()
    let notified = 0
    const unsub = profileStore.subscribe(() => void notified++)

    const before = profileStore.getSnapshot().hobbies.length
    profileStore.addHobby({ name: 'Lockpicking', category: 'Mind' })

    // Subscriber fired (React would re-render) …
    expect(notified).toBeGreaterThan(0)
    // … the snapshot grew …
    expect(profileStore.getSnapshot().hobbies.length).toBe(before + 1)
    // … and the hobby landed as a declared (empty) patch, persisted via the
    // store's own backend (the "survives reload" path the UI relies on).
    const added = profileStore.getSnapshot().hobbies.find((h) => h.name === 'Lockpicking')
    expect(added).toBeTruthy()
    expect(isDeclared(added!)).toBe(true)

    unsub()
    profileStore.reset()
  })

  it('reset() clears the saved collection back to the seed', () => {
    profileStore.addHobby({ name: 'Temporary', category: 'Craft' })
    expect(profileStore.getSnapshot().hobbies.some((h) => h.name === 'Temporary')).toBe(true)
    profileStore.reset()
    expect(profileStore.getSnapshot().hobbies.some((h) => h.name === 'Temporary')).toBe(false)
    expect(profileStore.getSnapshot().hobbies.length).toBe(sampleProfile.hobbies.length)
  })
})

describe('clearProgress — wipe progress, keep the hobbies', () => {
  it('keeps every hobby but strips level, metricCounts, and missions', () => {
    const b = memBackend()
    // An enriched hobby (real synced data) + a user-added declared one.
    applyActivity(b, {
      hobby: 'Birding', source: 'ebird', activityCount: 200, level: 3, evidence: [],
      metricCounts: { 'ebird.species': 200 },
    })
    addHobby(b, { name: 'Pottery', category: 'Craft', importance: 7, icon: '🏺' })
    const before = readProfile(b)
    const beforeNames = before.hobbies.map((h) => h.name).sort()

    const after = clearProgress(b)

    // Same hobbies, same identity — nothing dropped.
    expect(after.hobbies.map((h) => h.name).sort()).toEqual(beforeNames)
    const pottery = after.hobbies.find((h) => h.name === 'Pottery')!
    expect(pottery.importance).toBe(7) // identity preserved
    expect(pottery.icon).toBe('🏺')
    // Every hobby is back to declared, zero level, no synced metrics.
    for (const h of after.hobbies) {
      expect(h.level).toBe(0)
      expect(h.metricCounts).toBeUndefined()
      expect(h.missions).toBeUndefined()
      expect(isDeclared(h)).toBe(true)
    }
  })

  it('persists the cleared profile (survives a re-read)', () => {
    const b = memBackend()
    applyActivity(b, {
      hobby: 'Birding', source: 'ebird', activityCount: 50, level: 2, evidence: [],
      metricCounts: { 'ebird.species': 50 },
    })
    clearProgress(b)
    const reread = readProfile(b)
    expect(reread.hobbies.every((h) => isDeclared(h))).toBe(true)
  })
})

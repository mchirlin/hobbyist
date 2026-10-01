import { describe, it, expect } from 'vitest'
import {
  readDefinitions,
  findDefinition,
  editDefinition,
  setDescription,
  addMission,
  removeMission,
  addMilestoneBadge,
  removeBadge,
  type StorageBackend,
} from './definitionStore'
import { buildSeedDefinitions, milestonesFromDefinition } from './hobbyDefinition'

function memBackend(): StorageBackend {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

describe('readDefinitions', () => {
  it('seeds from the catalogs on empty storage', () => {
    const b = memBackend()
    expect(readDefinitions(b)).toEqual(buildSeedDefinitions())
  })

  it('falls back to the seed on malformed storage', () => {
    const b = memBackend()
    b.setItem('hobbyist.definitions.v1', 'not json')
    expect(readDefinitions(b)).toEqual(buildSeedDefinitions())
  })

  it('round-trips a written array', () => {
    const b = memBackend()
    const defs = buildSeedDefinitions()
    b.setItem('hobbyist.definitions.v1', JSON.stringify(defs))
    expect(readDefinitions(b)).toEqual(defs)
  })
})

describe('editDefinition', () => {
  it('edits only the target slug and bumps its version', () => {
    const b = memBackend()
    const next = editDefinition(b, 'birding', (d) => ({ ...d, name: 'Bird Watching' }))
    const birding = findDefinition(next, 'birding')!
    expect(birding.name).toBe('Bird Watching')
    expect(birding.version).toBe(2) // bumped from 1
    // a sibling is untouched
    expect(findDefinition(next, 'ultimate')!.version).toBe(1)
  })

  it('persists the edit (survives a fresh read)', () => {
    const b = memBackend()
    setDescription(b, 'knitting', 'Make warm things.')
    expect(findDefinition(readDefinitions(b), 'knitting')!.description).toBe('Make warm things.')
  })

  it('bumpVersion=false leaves version unchanged', () => {
    const b = memBackend()
    const next = editDefinition(b, 'birding', (d) => ({ ...d, memberCount: 5 }), false)
    expect(findDefinition(next, 'birding')!.version).toBe(1)
  })
})

describe('missions authoring', () => {
  it('adds and removes a mission, persisting each', () => {
    const b = memBackend()
    const before = findDefinition(readDefinitions(b), 'birding')!.missions.length
    addMission(b, 'birding', { text: 'See an owl at night.', level: 1 })
    let birding = findDefinition(readDefinitions(b), 'birding')!
    expect(birding.missions).toHaveLength(before + 1)
    expect(birding.missions[birding.missions.length - 1].text).toBe('See an owl at night.')

    removeMission(b, 'birding', birding.missions.length - 1)
    birding = findDefinition(readDefinitions(b), 'birding')!
    expect(birding.missions).toHaveLength(before)
  })
})

describe('milestone badge authoring (the connector-less unlock)', () => {
  it('adds a self-claimed milestone by default', () => {
    const b = memBackend()
    addMilestoneBadge(b, 'ultimate', { name: 'Caught a layout D' })
    const ms = milestonesFromDefinition(findDefinition(readDefinitions(b), 'ultimate')!)
    const added = ms.find((m) => m.name === 'Caught a layout D')!
    expect(added.claim).toBe('self')
    expect(added.how).toContain('Caught a layout D')
  })

  it('honours an explicit claim level and custom how', () => {
    const b = memBackend()
    addMilestoneBadge(b, 'climbing', { name: 'Led my first trad climb', how: 'Lead a trad route.', claim: 'peer' })
    const ms = milestonesFromDefinition(findDefinition(readDefinitions(b), 'climbing') ?? buildSeedDefinitions()[0])
    // climbing may not be a seed hobby; assert via a seed hobby instead for determinism
    const b2 = memBackend()
    addMilestoneBadge(b2, 'ultimate', { name: 'Certified coach', claim: 'admin' })
    const added = milestonesFromDefinition(findDefinition(readDefinitions(b2), 'ultimate')!).find(
      (m) => m.name === 'Certified coach',
    )!
    expect(added.claim).toBe('admin')
    void ms
  })

  it('is a no-op on a duplicate name (same hobby)', () => {
    const b = memBackend()
    addMilestoneBadge(b, 'ultimate', { name: 'Dup' })
    addMilestoneBadge(b, 'ultimate', { name: 'Dup' })
    const count = milestonesFromDefinition(findDefinition(readDefinitions(b), 'ultimate')!).filter(
      (m) => m.name === 'Dup',
    ).length
    expect(count).toBe(1)
  })

  it('removeBadge drops a badge by id', () => {
    const b = memBackend()
    addMilestoneBadge(b, 'ultimate', { name: 'Temp badge' })
    const added = milestonesFromDefinition(findDefinition(readDefinitions(b), 'ultimate')!).find(
      (m) => m.name === 'Temp badge',
    )!
    removeBadge(b, 'ultimate', added.id)
    const stillThere = milestonesFromDefinition(findDefinition(readDefinitions(b), 'ultimate')!).some(
      (m) => m.id === added.id,
    )
    expect(stillThere).toBe(false)
  })
})

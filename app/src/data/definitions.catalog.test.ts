// Drift guard: the committed universal catalog (definitions.json) MUST equal
// what the generator (buildSeedDefinitions) produces.
//
// definitions.json is a GENERATED artifact — `npm run gen:definitions` runs the
// seed builder and writes it. If someone edits a seed const (sampleProfile,
// MEDALS_BY_HOBBY, sampleQuests, the level ladder…) without regenerating, the
// shipped catalog goes stale. This test catches exactly that: it fails until you
// re-run the generator, so the committed file and the consts stay in lockstep.
//
// It also pins the catalog's schema so a shape change is a deliberate, reviewed
// bump rather than a silent divergence.

import { describe, it, expect } from 'vitest'
import { universalCatalog, CATALOG_SCHEMA } from './catalog'
import { buildSeedDefinitions } from './hobbyDefinition'

describe('universal catalog (definitions.json)', () => {
  it('matches the generator output exactly — regenerate with `npm run gen:definitions` if this fails', () => {
    expect(universalCatalog()).toEqual(buildSeedDefinitions())
  })

  it('ships at the current catalog schema version', () => {
    expect(CATALOG_SCHEMA).toBe(1)
  })

  it('returns a fresh array each call so callers cannot mutate the shared import', () => {
    const a = universalCatalog()
    const b = universalCatalog()
    expect(a).not.toBe(b)
    expect(a[0]).not.toBe(b[0])
    a[0].name = 'MUTATED'
    expect(universalCatalog()[0].name).not.toBe('MUTATED')
  })
})

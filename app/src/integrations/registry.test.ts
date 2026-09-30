import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerConnector,
  getConnector,
  listConnectors,
  connectorsForHobby,
  _resetRegistry,
  AUTOMATION_META,
  type Connector,
} from './registry'
import { registerBuiltinConnectors } from './connectors'
import type { HobbyActivity } from './activity'

function stub(id: string, hobby = 'Birding'): Connector<string> {
  return {
    id,
    name: id,
    hobby,
    level: 'manual',
    connect: { kind: 'none' },
    status: 'live',
    signal: 'test',
    normalize: (): HobbyActivity => ({
      hobby, source: id, activityCount: 0, level: 0, evidence: [],
    }),
  }
}

describe('connector registry', () => {
  beforeEach(() => _resetRegistry())

  it('registers and looks up by id', () => {
    registerConnector(stub('a'))
    expect(getConnector('a')?.id).toBe('a')
    expect(getConnector('missing')).toBeUndefined()
  })

  it('rejects duplicate ids (catches copy-paste bugs)', () => {
    registerConnector(stub('dup'))
    expect(() => registerConnector(stub('dup'))).toThrow(/already registered/)
  })

  it('lists in registration order', () => {
    registerConnector(stub('one'))
    registerConnector(stub('two'))
    expect(listConnectors().map((c) => c.id)).toEqual(['one', 'two'])
  })

  it('filters by hobby', () => {
    registerConnector(stub('b1', 'Birding'))
    registerConnector(stub('u1', 'Ultimate'))
    expect(connectorsForHobby('Birding').map((c) => c.id)).toEqual(['b1'])
    expect(connectorsForHobby('Ultimate').map((c) => c.id)).toEqual(['u1'])
  })

  it('every automation level has honest metadata', () => {
    for (const meta of Object.values(AUTOMATION_META)) {
      expect(meta.label).toBeTruthy()
      // No built-in level stores a credential — that's the design invariant.
      expect(meta.storesCredential).toBe(false)
    }
  })
})

describe('built-in connectors', () => {
  beforeEach(() => _resetRegistry())

  it('registers all four built-ins idempotently', () => {
    registerBuiltinConnectors()
    registerBuiltinConnectors() // second call is a no-op, not a duplicate throw
    const ids = listConnectors().map((c) => c.id).sort()
    expect(ids).toEqual(['ebird-api', 'ebird-csv', 'ultimate-results', 'youtube'])
  })

  it('eBird CSV connector normalizes raw CSV text end-to-end', () => {
    registerBuiltinConnectors()
    const csv = getConnector('ebird-csv')!
    const text = [
      'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,State/Province,County,Location ID,Location,Latitude,Longitude,Date,Time',
      'S1,American Robin,Turdus migratorius,1,1,,,,Park,,,2026-01-02,08:00',
      'S2,Gull sp.,Larus sp.,2,1,,,,Beach,,,2026-01-03,09:00',
    ].join('\n')
    const a = csv.normalize(text)
    expect(a.hobby).toBe('Birding')
    expect(a.activityCount).toBe(1) // Gull sp. excluded
  })

  it('YouTube connector maps uploads → level', () => {
    registerBuiltinConnectors()
    const yt = getConnector('youtube')!
    const a = yt.normalize({
      uploads: [
        { title: 'A', publishedAt: '2026-01-01' },
        { title: 'B', publishedAt: '2026-02-01' },
        { title: 'C', publishedAt: '2026-03-01' },
        { title: 'D', publishedAt: '2026-04-01' },
        { title: 'E', publishedAt: '2026-05-01' },
      ],
    })
    expect(a.hobby).toBe('Video Making')
    expect(a.activityCount).toBe(5)
    expect(a.level).toBe(2) // >=5 uploads → level 2
    expect(a.lastActive).toBe('2026-05-01')
  })
})

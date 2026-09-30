import { describe, it, expect } from 'vitest'
import { parseEbirdCsv } from '../integrations/ebirdCsv'
import { toBadge } from './BirdBadge'

// A realistic MyEBirdData.csv slice: the stable header + a mix of real species,
// repeats (to drive "most logged"), and non-species markers (sp./slash/hybrid)
// that must be excluded from the life-list count.
const HEADER =
  'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,State/Province,County,Location ID,Location,Latitude,Longitude,Date,Time,Protocol,Duration (Min),All Obs Reported,Distance Traveled (km),Area Covered (ha),Number of Observers,Breeding Code,Observation Details,Checklist Comments,ML Catalog Numbers'

function row(sub: string, name: string, date: string) {
  return `${sub},${name},Sci name,1,1,MA,Suffolk,L1,Pond,42,-71,${date},08:00,Traveling,30,1,1,,1,,,,`
}

const CSV = [
  HEADER,
  row('S1', 'American Robin', '2026-01-02'),
  row('S1', 'American Robin', '2026-01-02'),
  row('S1', 'Blue Jay', '2026-01-02'),
  row('S2', 'Northern Cardinal', '2026-03-10'),
  row('S2', 'American Robin', '2026-03-10'),
  row('S3', 'gull sp.', '2026-05-01'), // excluded — sp.
  row('S3', 'Mallard x American Black Duck (hybrid)', '2026-05-01'), // excluded — hybrid
  row('S3', 'Herring/Great Black-backed Gull', '2026-05-01'), // excluded — slash
  row('S3', 'Song Sparrow', '2026-05-01'),
].join('\n')

describe('toBadge', () => {
  const rows = parseEbirdCsv(CSV)
  const badge = toBadge(rows, 'Michael')

  it('counts distinct COUNTABLE species only (excludes sp./hybrid/slash)', () => {
    // Robin, Blue Jay, Cardinal, Song Sparrow = 4
    expect(badge.species).toBe(4)
  })

  it('ranks most-logged birds first', () => {
    // American Robin logged 3× — should lead.
    expect(badge.topBirds[0]).toBe('American Robin')
    expect(badge.topBirds).toContain('Blue Jay')
    expect(badge.topBirds.length).toBeLessThanOrEqual(4)
  })

  it('counts distinct checklists by submission id', () => {
    expect(badge.checklists).toBe(3) // S1, S2, S3
  })

  it('carries the latest outing date', () => {
    expect(badge.lastActive).toBe('2026-05-01')
  })

  it('carries the display name through', () => {
    expect(badge.name).toBe('Michael')
  })

  it('computes a Life List medal tier from the species count', () => {
    // 4 species is below Bronze (10) → not yet earned, next is Bronze.
    expect(badge.medal.earned).toBeNull()
    expect(badge.medal.next?.name).toBe('Bronze')
    expect(badge.medal.medal.id).toBe('birding-species')
  })

  it('earns a tier once the count crosses a threshold', () => {
    const many = Array.from({ length: 120 }, (_, i) => row('SX', `Bird ${i}`, '2026-06-01'))
    const b = toBadge(parseEbirdCsv([HEADER, ...many].join('\n')), 'X')
    expect(b.species).toBe(120)
    expect(b.medal.earned?.name).toBe('Silver') // 100 ≤ 120 < 300
    expect(b.medal.next?.name).toBe('Gold')
  })
})

import { describe, it, expect } from 'vitest'
import { parseEbirdCsv, ebirdCsvToActivity } from './ebirdCsv'

// A realistic MyEBirdData.csv header + rows. Columns beyond the ones the
// parser reads are trimmed here for readability — the parser keys by header
// name, not position, so extra/missing trailing columns are fine.
const HEADER =
  'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,Date,Time,Location'

function csv(rows: string[]): string {
  return [HEADER, ...rows].join('\n')
}

describe('parseEbirdCsv', () => {
  it('parses rows by header name and skips blank lines', () => {
    const text = csv([
      'S1,American Robin,Turdus migratorius,1,2,2026-05-01,08:00,Backyard',
      '',
      'S2,Blue Jay,Cyanocitta cristata,2,1,2026-05-02,09:00,Park',
    ])
    const rows = parseEbirdCsv(text)
    expect(rows).toHaveLength(2)
    expect(rows[0].commonName).toBe('American Robin')
    expect(rows[1].date).toBe('2026-05-02')
  })

  it('handles quoted fields containing commas', () => {
    const text = csv([
      'S1,"Gull, Herring","Larus argentatus",1,1,2026-05-01,08:00,"Beach, North End"',
    ])
    const rows = parseEbirdCsv(text)
    expect(rows[0].commonName).toBe('Gull, Herring')
    expect(rows[0].location).toBe('Beach, North End')
  })

  it('returns empty for empty input', () => {
    expect(parseEbirdCsv('')).toEqual([])
  })
})

describe('ebirdCsvToActivity', () => {
  it('counts distinct countable species as the life-list size', () => {
    const rows = parseEbirdCsv(
      csv([
        'S1,American Robin,Turdus migratorius,1,2,2026-05-01,08:00,Yard',
        'S2,American Robin,Turdus migratorius,1,1,2026-05-03,08:00,Yard', // dup species
        'S3,Blue Jay,Cyanocitta cristata,2,1,2026-05-02,09:00,Park',
      ]),
    )
    const a = ebirdCsvToActivity(rows)
    expect(a.activityCount).toBe(2) // Robin + Jay, dedup'd
    expect(a.hobby).toBe('Birding')
    expect(a.source).toBe('ebird-csv')
  })

  it('uses the latest date as lastActive', () => {
    const rows = parseEbirdCsv(
      csv([
        'S1,American Robin,Turdus migratorius,1,2,2026-05-01,08:00,Yard',
        'S2,Blue Jay,Cyanocitta cristata,2,1,2026-07-04,09:00,Park',
      ]),
    )
    expect(ebirdCsvToActivity(rows).lastActive).toBe('2026-07-04')
  })

  // Regression: issue #3 — the exclusion regex was `\bsp\.\b`, whose trailing
  // \b fails after a period at end-of-string, so a trailing "sp." entry
  // ("Gull sp.") was wrongly COUNTED, inflating the life list. Fixed to
  // `\bsp\.(?!\w)`. These cases lock the fix.
  describe('non-species exclusion (sp. regex regression)', () => {
    it('excludes a trailing "sp." entry (the fixed bug)', () => {
      const rows = parseEbirdCsv(
        csv(['S1,Gull sp.,Larus sp.,1,1,2026-05-01,08:00,Beach']),
      )
      expect(ebirdCsvToActivity(rows).activityCount).toBe(0)
    })

    it('excludes a mid-string "sp." entry', () => {
      const rows = parseEbirdCsv(
        csv(['S1,Gull sp. (large),Larus sp.,1,1,2026-05-01,08:00,Beach']),
      )
      expect(ebirdCsvToActivity(rows).activityCount).toBe(0)
    })

    it('excludes slash ("Gull, Herring/Ring-billed") and hybrid entries', () => {
      const rows = parseEbirdCsv(
        csv([
          'S1,"Herring/Ring-billed Gull",spp,1,1,2026-05-01,08:00,Beach',
          'S2,Mallard x American Black Duck hybrid,hyb,1,1,2026-05-01,08:00,Pond',
        ]),
      )
      expect(ebirdCsvToActivity(rows).activityCount).toBe(0)
    })

    it('does NOT exclude a real species that merely contains the letters "sp"', () => {
      const rows = parseEbirdCsv(
        csv(['S1,Sparrow,Passerellidae,1,1,2026-05-01,08:00,Field']),
      )
      expect(ebirdCsvToActivity(rows).activityCount).toBe(1)
    })

    it('counts only the countable species in a mixed checklist', () => {
      const rows = parseEbirdCsv(
        csv([
          'S1,American Robin,Turdus migratorius,1,1,2026-05-01,08:00,Yard',
          'S2,Northern Cardinal,Cardinalis cardinalis,2,1,2026-05-01,08:00,Yard',
          'S3,Gull sp.,Larus sp.,3,1,2026-05-01,08:00,Beach', // excluded
        ]),
      )
      expect(ebirdCsvToActivity(rows).activityCount).toBe(2)
    })
  })
})

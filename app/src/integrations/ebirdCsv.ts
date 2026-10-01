import type { HobbyActivity } from './activity'
import { levelFromThresholds } from './activity'

// Parser for eBird's personal export: a ZIP emailed via "Download My Data",
// containing MyEBirdData.csv. This is the REAL personal signal (your life
// list), unlike the region-only API. The same normalized output would later
// be produced automatically by an email-ingest connector (spectrum level 2).
//
// Known MyEBirdData.csv header (columns A–W), stable across exports:
//   Submission ID, Common Name, Scientific Name, Taxonomic Order, Count,
//   State/Province, County, Location ID, Location, Latitude, Longitude,
//   Date, Time, Protocol, Duration (Min), All Obs Reported,
//   Distance Traveled (km), Area Covered (ha), Number of Observers,
//   Breeding Code, Observation Details, Checklist Comments, ML Catalog Numbers

export interface EbirdCsvRow {
  commonName: string
  scientificName: string
  date: string
  location: string
  submissionId: string
}

// Life-list level thresholds by distinct species (illustrative birder tiers).
const LIFE_LIST_LEVELS = [1, 50, 150, 400, 700]

/** Minimal RFC-4180-ish CSV line splitter (handles quoted fields + commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } // escaped quote
        else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

/** Parse the raw MyEBirdData.csv text into typed rows (by header name). */
export function parseEbirdCsv(text: string): EbirdCsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map((h) => h.trim())
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase())
  const iCommon = idx('Common Name')
  const iSci = idx('Scientific Name')
  const iDate = idx('Date')
  const iLoc = idx('Location')
  const iSub = idx('Submission ID')
  const rows: EbirdCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i])
    const commonName = (iCommon >= 0 ? f[iCommon] : '')?.trim() ?? ''
    if (!commonName) continue
    rows.push({
      commonName,
      scientificName: (iSci >= 0 ? f[iSci] : '')?.trim() ?? '',
      date: (iDate >= 0 ? f[iDate] : '')?.trim() ?? '',
      location: (iLoc >= 0 ? f[iLoc] : '')?.trim() ?? '',
      submissionId: (iSub >= 0 ? f[iSub] : '')?.trim() ?? '',
    })
  }
  return rows
}

/** Normalize parsed rows into the common activity model. */
export function ebirdCsvToActivity(rows: EbirdCsvRow[]): HobbyActivity {
  // Life list = distinct species. eBird's own "spuh"/"sp." and hybrid/slash
  // entries aren't countable species; exclude the obvious non-species markers.
  const isCountable = (name: string) =>
    // "sp." can appear mid-string ("Gull sp. (large)") or at the end ("Gull
    // sp."). A trailing \b fails after the period at end-of-string, so match
    // "sp." not followed by another word char instead.
    name && !/\bsp\.(?!\w)/i.test(name) && !name.includes('/') && !/\bhybrid\b/i.test(name)
  const species = new Set(
    rows.map((r) => r.commonName).filter(isCountable),
  )
  const count = species.size
  const dates = rows.map((r) => r.date).filter(Boolean).sort()
  const lastActive = dates[dates.length - 1]
  const evidence = rows
    .slice(0, 5)
    .map((r) => ({ label: r.commonName, date: r.date }))
  return {
    hobby: 'Birding',
    source: 'ebird-csv',
    activityCount: count,
    level: levelFromThresholds(count, LIFE_LIST_LEVELS),
    lastActive,
    evidence,
    // Feeds the Life List medal + flips the Birding patch declared → enriched.
    metricCounts: { 'ebird.species': count },
  }
}

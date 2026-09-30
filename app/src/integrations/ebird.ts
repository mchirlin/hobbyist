import type { SourceAdapter, HobbyActivity } from './activity'
import { levelFromThresholds } from './activity'

// Shape of one observation from eBird /v2/data/obs/{regionCode}/recent
export interface EbirdObservation {
  speciesCode: string
  comName: string
  sciName: string
  locName: string
  obsDt: string // "2020-01-21 16:35"
  howMany?: number
  subId: string
}

// eBird API facts (verified from the API docs):
//   Base: https://api.ebird.org
//   Endpoint: /v2/data/obs/{regionCode}/recent   (e.g. US-NY, or a locId)
//   Auth header: X-eBirdApiToken: <token>
// NOTE: the API has no "personal life list" endpoint — it is region/hotspot/
// checklist based. For the prototype we use region-recent (distinct species
// seen in a region), which proves the live pipeline. A user's OWN life-list
// total comes from eBird's My-Data CSV export, layered on later.
export const EBIRD_BASE = 'https://api.ebird.org'
export function ebirdRecentUrl(regionCode: string, back = 14, maxResults = 100) {
  return `${EBIRD_BASE}/v2/data/obs/${encodeURIComponent(regionCode)}/recent?back=${back}&maxResults=${maxResults}`
}

// Birding level thresholds by distinct species count (illustrative).
const SPECIES_LEVEL_THRESHOLDS = [1, 15, 40, 100, 250]

export const ebirdAdapter: SourceAdapter<EbirdObservation[]> = {
  id: 'ebird',
  normalize(raw): HobbyActivity {
    const obs = Array.isArray(raw) ? raw : []
    // distinct species is the meaningful signal (region-recent already returns
    // the most-recent sighting per species, but dedupe defensively)
    const species = new Set(obs.map((o) => o.speciesCode))
    const count = species.size
    const sortedDates = obs.map((o) => o.obsDt).sort()
    const lastActive = sortedDates[sortedDates.length - 1]
    const evidence = obs.slice(0, 5).map((o) => ({
      label: o.comName,
      date: o.obsDt,
    }))
    return {
      hobby: 'Birding',
      source: 'ebird',
      activityCount: count,
      level: levelFromThresholds(count, SPECIES_LEVEL_THRESHOLDS),
      lastActive,
      evidence,
    }
  },
}

// Geocaching source data + demo fixture.
//
// SOURCE: geocaching.com shows a public profile with a running "caches found"
// total and a dated find log. There is no open public API (a partner key is
// required), so the honest connector level is a public-profile read (scrape).
// This module holds the raw shape and a small demo fixture used by the
// prototype's "Load my geocaching finds" button; the pure normalize lives on
// the connector in connectors.ts (activityCount = caches found).

/** One found cache from the public profile log. */
export interface GeocacheFind {
  name: string
  date?: string
  url?: string
}

/** Raw payload the geocaching connector normalizes. */
export interface GeocacheProfile {
  username?: string
  finds: GeocacheFind[]
}

// Demo seed — a handful of finds so the connector produces a visible signal
// end-to-end today. Replace with a real public-profile parse when the scraper
// is built (see GitHub issue #9's approach: static public page, cache-hard).
export const MICHAEL_GEOCACHE_FINDS: GeocacheProfile = {
  username: 'mchirlin',
  finds: [
    { name: 'Old Mill Trailhead', date: '2026-08-14' },
    { name: 'Riverside Micro', date: '2026-07-30' },
    { name: "Cedar Ridge Cache", date: '2026-06-22' },
    { name: 'Downtown Letterbox Hybrid', date: '2026-05-18' },
    { name: 'Summit Ammo Can', date: '2026-04-02' },
  ],
}

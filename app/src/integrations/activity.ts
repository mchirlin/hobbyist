// The common "activity" model every integration adapter maps onto.
// This is the reusable spine for Auto-Sync: an external platform's raw data
// (eBird sightings, Strava activities, YouTube uploads, Ravelry projects…)
// is normalized into a HobbyActivity, which then drives a hobby's importance
// (patch size) and level in the sash.

/** One piece of evidence backing an activity signal (for display/verification). */
export interface ActivityEvidence {
  label: string // e.g. "Hooded Crow" or "Uploaded: How I 3D-print gears"
  date?: string // ISO-ish timestamp when it happened
  url?: string // link back to the source item
}

/** Normalized activity for one hobby, produced by an adapter. */
export interface HobbyActivity {
  hobby: string // hobby name this maps to, e.g. "Birding"
  source: string // adapter id, e.g. "ebird"
  /**
   * Raw activity magnitude in the source's own units (species seen, uploads,
   * km run…). Adapters set this; the app decides how to combine it with other
   * sources and turn it into an importance weight.
   */
  activityCount: number
  /** Derived level 0-based (Novice…Master). Adapter maps its metric → level. */
  level: number
  /** Most recent activity timestamp, for the "freshness" signal. */
  lastActive?: string
  /** A few evidence items to show on the hobby / verify the signal. */
  evidence: ActivityEvidence[]
  /**
   * Medal-metric counts this signal produces, keyed like ProfileHobby.metricCounts
   * (e.g. { 'ebird.species': 247 }). This is what the enrich step merges into a
   * hobby so a DECLARED patch (no counts) flips to ENRICHED and its medal tiers
   * move. Optional: a signal that drives only level/importance can omit it.
   */
  metricCounts?: Record<string, number>
}

/**
 * An integration adapter. Given some source-specific config (a region code, a
 * channel id, an auth token supplied out-of-band), it returns normalized
 * activity. Kept sync-agnostic: the fetch mechanism (browser, cron helper,
 * server) is the caller's concern — the adapter only transforms raw → model.
 */
export interface SourceAdapter<Raw = unknown> {
  id: string
  /** Map already-fetched raw API data into the common model. Pure + testable. */
  normalize(raw: Raw, ctx?: Record<string, unknown>): HobbyActivity
}

/** Map an activity count to a 0-based level using ascending thresholds. */
export function levelFromThresholds(count: number, thresholds: number[]): number {
  let level = 0
  for (let i = 0; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1
  }
  return level
}

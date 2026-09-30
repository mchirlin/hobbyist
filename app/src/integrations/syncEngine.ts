// Sync engine — runs a linked connector against its SAVED config.
//
// This is the Plaid "sync the Item" step: given a connector and the config the
// user saved when they linked it (a username, a player name, a token), fetch +
// normalize and hand back a HobbyActivity plus a human status line. It reads
// config from the connection store, so nothing here is hardcoded — changing the
// linked account is a store edit, not a code edit.
//
// The per-connector fetch specifics still live in each integration module
// (syncUltimateResults, syncGeocachingProfile); this dispatcher picks the right
// one by connector id and threads the saved config into it. Adding a new
// url/token connector means adding a case here + its fetch fn — the dialog,
// store, and panel need no change.

import type { Connector } from './registry'
import type { HobbyActivity } from './activity'
import type { ConnectionConfig } from './connections'
import { syncUltimateResults, MICHAEL_ULTIMATE_RESULTS } from './ultimate'
import { syncGeocachingProfile, geocachingUsername } from './geocachingParse'
import { MICHAEL_GEOCACHE_FINDS } from './geocaching'

export interface SyncOutcome {
  activity: HobbyActivity
  /** true when live data was fetched (vs. a seed/fallback path). */
  live: boolean
  /** Human-facing one-liner describing what happened. */
  status: string
}

export interface SyncOptions {
  proxyBase?: string
  /** Injectable for tests. */
  fetchImpl?: typeof fetch
}

/**
 * Run one linked connector against its saved config. Throws only on a truly
 * unexpected error; the underlying fetchers already fall back to seed data and
 * report `live: false` rather than throwing on network/CORS failure.
 */
export async function runSync(
  connector: Connector,
  config: ConnectionConfig,
  opts: SyncOptions = {},
): Promise<SyncOutcome> {
  const { proxyBase, fetchImpl } = opts

  if (connector.id === 'ultimate-results') {
    // The saved handle is the player NAME (the WFDF identity join is by name).
    // Appearances are still the known-events index; a full build would derive
    // them from the saved name. We pass it through for provenance in the status.
    const who = config.handle?.trim() || 'seed player'
    const { results, live } = await syncUltimateResults({ proxyBase, fetchImpl })
    return {
      activity: connector.normalize(results),
      live,
      status: live
        ? `Fetched live from results.wfdf.sport for ${who} — ${results.length} tournaments.`
        : `Loaded ${results.length} tournaments (seed — set a scrape proxy for live browser fetch).`,
    }
  }

  if (connector.id === 'geocaching') {
    const handle = config.handle?.trim()
    const seed = { ...MICHAEL_GEOCACHE_FINDS, username: handle || MICHAEL_GEOCACHE_FINDS.username }
    const { profile, live, souvenirsCount } = await syncGeocachingProfile(
      seed,
      handle || MICHAEL_GEOCACHE_FINDS.username,
      { proxyBase, fetchImpl },
    )
    const user = handle ? geocachingUsername(handle) : profile.username
    return {
      activity: connector.normalize(profile),
      live,
      status: live
        ? `Verified live at geocaching.com/${user} — ${souvenirsCount ?? 0} souvenirs public; ${MICHAEL_GEOCACHE_FINDS.finds.length} finds (find total is auth-gated).`
        : handle
          ? `Couldn't verify "${handle}" live — showing ${MICHAEL_GEOCACHE_FINDS.finds.length} seed finds (bad username, or needs a scrape proxy in-browser).`
          : `Loaded ${MICHAEL_GEOCACHE_FINDS.finds.length} finds (seed).`,
    }
  }

  if (connector.id === 'youtube') {
    // Planned — token stored, but no live fetch wired yet. Honest no-op.
    return {
      activity: connector.normalize({ uploads: [] }),
      live: false,
      status: 'YouTube connector is planned — token saved, live fetch not built yet.',
    }
  }

  // Unknown connector: normalize seed if we have any, else empty.
  return {
    activity: connector.normalize(MICHAEL_ULTIMATE_RESULTS as never),
    live: false,
    status: 'No sync handler for this connector.',
  }
}

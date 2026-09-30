// Real fetch + parse for a geocaching.com public profile.
//
// SOURCE: https://www.geocaching.com/p/?u=<username>  (HTTP 200 for a real
// user, 404 "DNF" for a nonexistent one). Unlike results.wfdf.sport, this page
// is NOT a clean static data source:
//
//   • The profile owner's FIND COUNT is loaded client-side from an
//     authenticated API (/api/proxy/web/v1/users/... -> HTTP 401 without a
//     token). It is NOT present in the initial HTML, so it cannot be scraped
//     from the public page without a login / partner API key.
//   • The initial HTML DOES carry one genuinely-public numeric signal:
//     `window.publicProfile.souvenirsCount` (souvenirs earned), plus whether
//     the profile exists at all (200 vs 404).
//
// So this parser extracts what is HONESTLY public (existence + souvenir count)
// and is explicit that the find total requires auth. The connector uses the
// souvenir count as a real fetched activity signal when available, and falls
// back to the seed find-log fixture otherwise — the same honest boundary as the
// WFDF browser-CORS case and the ephemeral eBird runner: the PARSE is real; the
// richest data needs a non-public execution context.

import type { GeocacheProfile } from './geocaching'

/** What the PUBLIC profile page actually yields (no auth). */
export interface GeocachingPublicProfile {
  /** true when the page is a real profile (HTTP 200 with profile markup). */
  exists: boolean
  /** Souvenirs earned — the one public numeric signal in the initial HTML. */
  souvenirsCount?: number
  /** The find total is auth-gated; we can NEVER read it from the public page. */
  findCountAvailable: false
}

/**
 * Parse a geocaching.com public-profile HTML string.
 *
 * PURE (html -> result) so it is unit-testable against a saved fixture.
 * Returns exists:false when the page is the 404 "DNF" error shell.
 */
export function parseGeocachingProfile(html: string): GeocachingPublicProfile {
  // The 404 page renders an "Error 404: DNF" callout and no publicProfile block.
  const is404 = /Error 404: DNF/i.test(html) || /http-error-title/i.test(html)
  if (is404) {
    return { exists: false, findCountAvailable: false }
  }

  // window.publicProfile = { ... souvenirsCount: '6' ... }
  const souvMatch = /souvenirsCount:\s*'(\d+)'/i.exec(html)
  const hasProfile = /window\.publicProfile\s*=/.test(html)

  return {
    exists: hasProfile,
    souvenirsCount: souvMatch ? Number(souvMatch[1]) : undefined,
    findCountAvailable: false,
  }
}

/** Build the canonical public-profile URL for a username. */
export function geocachingProfileUrl(username: string): string {
  return `https://www.geocaching.com/p/?u=${encodeURIComponent(username)}`
}

/** Accept either a bare username or a full profile URL and return the username. */
export function geocachingUsername(input: string): string {
  const trimmed = input.trim()
  const m = /[?&]u=([^&#]+)/.exec(trimmed)
  if (m) return decodeURIComponent(m[1])
  // strip a trailing /p/ style path if someone pastes a profile path
  return trimmed.replace(/^https?:\/\/[^/]+\/p\/?/i, '').replace(/[/?].*$/, '') || trimmed
}

export interface GeocachingFetchResult {
  /** The public signal we could read (existence + souvenir count). */
  publicProfile: GeocachingPublicProfile
  /** Whether the live fetch succeeded (vs. threw / CORS-blocked). */
  live: boolean
}

/**
 * Fetch + parse a public profile. Runs anywhere fetch() reaches the host:
 * server/Node directly; in the browser, www.geocaching.com sends no CORS
 * headers, so prefix `proxyBase` (a small CORS proxy you host). Throws on
 * network / non-OK so the caller can fall back.
 */
export async function fetchGeocachingProfile(
  usernameOrUrl: string,
  opts: { proxyBase?: string; fetchImpl?: typeof fetch } = {},
): Promise<GeocachingPublicProfile> {
  const doFetch = opts.fetchImpl ?? fetch
  const username = geocachingUsername(usernameOrUrl)
  const target = geocachingProfileUrl(username)
  const url = opts.proxyBase ? `${opts.proxyBase}${encodeURIComponent(target)}` : target
  const res = await doFetch(url)
  if (!res.ok) throw new Error(`geocaching fetch failed: HTTP ${res.status}`)
  const html = await res.text()
  return parseGeocachingProfile(html)
}

/**
 * Sync a geocaching profile with honest fallback.
 *
 * The find LOG is not publicly available (auth-gated), so `finds` always comes
 * from the seed fixture — we cannot fabricate a real find list from the public
 * page. What the live fetch DOES add is a verified public signal: the profile
 * exists and how many souvenirs it has, surfaced as an extra evidence line so
 * the connector reflects something genuinely fetched rather than pure seed.
 *
 * Returns the (possibly seed) profile plus whether live data was obtained and,
 * when it was, the public souvenir count.
 */
export async function syncGeocachingProfile(
  seed: GeocacheProfile,
  usernameOrUrl: string | undefined,
  opts: { proxyBase?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ profile: GeocacheProfile; live: boolean; souvenirsCount?: number }> {
  const target = usernameOrUrl?.trim() || seed.username
  if (!target) return { profile: seed, live: false }

  try {
    const pub = await fetchGeocachingProfile(target, opts)
    if (!pub.exists) {
      // real fetch, but the username doesn't resolve — return seed, not live.
      return { profile: seed, live: false }
    }
    const username = geocachingUsername(target)
    // Add a verified public-signal evidence line to the seed finds. The find
    // COUNT stays seed-derived (auth-gated), but this proves a live read.
    const souvenirLine =
      pub.souvenirsCount != null
        ? [
            {
              name: `${pub.souvenirsCount} souvenirs earned (public profile, verified live)`,
              url: geocachingProfileUrl(username),
            },
          ]
        : []
    return {
      profile: { username, finds: [...souvenirLine, ...seed.finds] },
      live: true,
      souvenirsCount: pub.souvenirsCount,
    }
  } catch {
    return { profile: seed, live: false }
  }
}

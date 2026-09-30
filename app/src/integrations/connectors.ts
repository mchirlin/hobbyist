// Wires concrete adapters into the connector registry. Importing this module
// once (from the app entry) populates the registry. Kept separate from the
// registry mechanics so the registry itself stays dependency-free and testable.

import { registerConnector, getConnector } from './registry'
import { parseEbirdCsv, ebirdCsvToActivity, type EbirdCsvRow } from './ebirdCsv'
import { ultimateAdapter, type WfdfTournamentResult } from './ultimate'
import { levelFromThresholds, type HobbyActivity } from './activity'

/** Idempotently register all built-in connectors. */
export function registerBuiltinConnectors(): void {
  // Guard on the registry's own state (not a module flag) so a test that
  // resets the registry can re-register cleanly.
  if (getConnector('ebird-csv')) return

  // --- eBird CSV import (spectrum level: manual today, email later) --------
  // The real personal life list. Manual file-drop now; the identical output
  // would be produced by an email-ingest connector once that's built.
  registerConnector<string>({
    id: 'ebird-csv',
    name: 'eBird — Download My Data',
    hobby: 'Birding',
    level: 'manual',
    connect: { kind: 'file', accept: '.csv' },
    status: 'live',
    signal: 'Distinct species on your life list.',
    normalize(rawText: string): HobbyActivity {
      const rows: EbirdCsvRow[] = parseEbirdCsv(rawText)
      return ebirdCsvToActivity(rows)
    },
  })

  // --- eBird ephemeral login (spectrum level: ephemeral) ------------------
  // The no-store credential model: the user supplies credentials for ONE run,
  // the automation uses them in memory, then discards them. In this app the
  // credentials arrive via ctx (never stored); the runner side that actually
  // drives a headless browser lives in scripts/ephemeral-sync/run.mjs and would
  // hand back the same MyEBirdData.csv text this normalize() parses.
  registerConnector<string>({
    id: 'ebird-ephemeral',
    name: 'eBird — one-shot login sync',
    hobby: 'Birding',
    level: 'ephemeral',
    connect: { kind: 'credentials' },
    status: 'live',
    signal: 'Your life list, fetched via a login you re-enter each sync.',
    normalize(rawText: string): HobbyActivity {
      const rows: EbirdCsvRow[] = parseEbirdCsv(rawText)
      return ebirdCsvToActivity(rows)
    },
  })

  // --- Geocaching (spectrum level: scrape) ---------------------------------
  // geocaching.com publishes a public profile with a running "caches found"
  // total (and finds have dates). No public API without a partner key, so the
  // honest level is a public-profile read. activityCount = caches found.
  const GEOCACHE_LEVELS = [1, 25, 100, 500, 1000]
  interface GeocacheRaw { username?: string; finds: { name: string; date?: string; url?: string }[] }
  registerConnector<GeocacheRaw>({
    id: 'geocaching',
    name: 'Geocaching — caches found',
    hobby: 'Geocaching',
    level: 'scrape',
    connect: { kind: 'url', placeholder: 'Your geocaching.com profile URL or username' },
    status: 'live',
    signal: 'Caches you have found (from your public profile).',
    normalize(raw): HobbyActivity {
      const finds = raw?.finds ?? []
      const dates = finds.map((f) => f.date ?? '').filter(Boolean).sort()
      return {
        hobby: 'Geocaching',
        source: 'geocaching',
        activityCount: finds.length,
        level: levelFromThresholds(finds.length, GEOCACHE_LEVELS),
        lastActive: dates[dates.length - 1],
        evidence: finds.slice(0, 5).map((f) => ({ label: f.name, date: f.date, url: f.url })),
      }
    },
  })

  // --- YouTube uploads (spectrum level: api) — PLANNED ---------------------
  // Public channel uploads via an API key (no OAuth). Proves the registry
  // spans more than one hobby/source without any UI special-casing.
  const YT_UPLOAD_LEVELS = [1, 5, 20, 50, 150]
  interface YtRaw { uploads: { title: string; publishedAt: string; url?: string }[] }
  registerConnector<YtRaw>({
    id: 'youtube',
    name: 'YouTube — channel uploads',
    hobby: 'Video Making',
    level: 'api',
    connect: { kind: 'token', placeholder: 'YouTube Data API key' },
    status: 'planned',
    signal: 'Videos published on your channel.',
    normalize(raw): HobbyActivity {
      const uploads = raw?.uploads ?? []
      const dates = uploads.map((u) => u.publishedAt).filter(Boolean).sort()
      return {
        hobby: 'Video Making',
        source: 'youtube',
        activityCount: uploads.length,
        level: levelFromThresholds(uploads.length, YT_UPLOAD_LEVELS),
        lastActive: dates[dates.length - 1],
        evidence: uploads.slice(0, 5).map((u) => ({
          label: u.title, date: u.publishedAt, url: u.url,
        })),
      }
    },
  })

  // --- Ultimate results (spectrum level: scrape) ---------------------------
  // WFDF championship results (results.wfdf.sport) are static, no-login pages:
  // a per-player card carries the individual box score and a standings matrix
  // gives team placement. USAU nationals contribute team placement only. The
  // connector's raw input is the user's filtered tournament results (matched by
  // player NAME, since WFDF ids are per-event); ultimateAdapter is the pure
  // transform. Ships with a real seed fixture (MICHAEL_ULTIMATE_RESULTS) so the
  // signal is demonstrable end-to-end today.
  registerConnector<WfdfTournamentResult[]>({
    id: 'ultimate-results',
    name: 'Ultimate — WFDF/USAU tournament results',
    hobby: 'Ultimate',
    level: 'scrape',
    connect: { kind: 'url', placeholder: 'Your player name (e.g. Michael Chirlin)' },
    status: 'live',
    signal: 'Tournaments played, with placement and individual goals/assists.',
    normalize: ultimateAdapter.normalize,
  })
}

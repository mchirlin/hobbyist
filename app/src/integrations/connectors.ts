// Wires concrete adapters into the connector registry. Importing this module
// once (from the app entry) populates the registry. Kept separate from the
// registry mechanics so the registry itself stays dependency-free and testable.

import { registerConnector, getConnector } from './registry'
import { ebirdAdapter, type EbirdObservation } from './ebird'
import { parseEbirdCsv, ebirdCsvToActivity, type EbirdCsvRow } from './ebirdCsv'
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

  // --- eBird region API (spectrum level: api) ------------------------------
  // Supplementary "what's around me now" signal. Token, no password.
  registerConnector<EbirdObservation[]>({
    id: 'ebird-api',
    name: 'eBird — recent nearby',
    hobby: 'Birding',
    level: 'api',
    connect: { kind: 'token', placeholder: 'eBird API token' },
    status: 'live',
    signal: 'Distinct species reported near you recently.',
    normalize: ebirdAdapter.normalize,
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

  // --- Ultimate results (spectrum level: scrape) — PLANNED -----------------
  // Public tournament results page, no login. The hard, brittle corner.
  const ULTIMATE_LEVELS = [1, 3, 6, 12, 24]
  interface UltimateRaw { tournaments: { name: string; date?: string; finish?: string }[] }
  registerConnector<UltimateRaw>({
    id: 'ultimate-results',
    name: 'Ultimate — tournament results',
    hobby: 'Ultimate',
    level: 'scrape',
    connect: { kind: 'url', placeholder: 'WFDF/USAU results page URL' },
    status: 'planned',
    signal: 'Tournaments your team has appeared in.',
    normalize(raw): HobbyActivity {
      const events = raw?.tournaments ?? []
      const dates = events.map((e) => e.date ?? '').filter(Boolean).sort()
      return {
        hobby: 'Ultimate',
        source: 'ultimate-results',
        activityCount: events.length,
        level: levelFromThresholds(events.length, ULTIMATE_LEVELS),
        lastActive: dates[dates.length - 1],
        evidence: events.slice(0, 5).map((e) => ({
          label: e.finish ? `${e.name} — ${e.finish}` : e.name,
          date: e.date,
        })),
      }
    },
  })
}

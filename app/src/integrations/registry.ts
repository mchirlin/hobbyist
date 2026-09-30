// Connector registry — the formal catalog of every source that can feed the
// sash, tagged with its place on the automation spectrum. This is the single
// place the app enumerates connectors from: the Connect UI lists them, each
// one declares HOW it syncs (its spectrum level + auth needs), and all of them
// hand back the same normalized HobbyActivity via their adapter.
//
// The spectrum (see README "Connector automation spectrum"):
//   1 api        — API + token/OAuth, fully automatic, no stored password
//   2 email      — ride the platform's own emailed export (safe auto)
//   3 extension  — browser extension using the user's live session
//   4 ephemeral  — user-present login-then-automate, no stored credential
//   5 scrape     — public-page navigation, no login
//   6 manual     — user enters the number / drops a file
//
// A connector's `level` is an HONEST label of what it actually does, not an
// aspiration — the UI uses it to set expectations (freshness, effort, safety).

import type { HobbyActivity } from './activity'

export type AutomationLevel =
  | 'api'
  | 'email'
  | 'extension'
  | 'ephemeral'
  | 'scrape'
  | 'manual'

/** Human-facing gloss for each automation level. */
export const AUTOMATION_META: Record<
  AutomationLevel,
  { label: string; setAndForget: boolean; storesCredential: boolean; note: string }
> = {
  api: {
    label: 'API',
    setAndForget: true,
    storesCredential: false,
    note: 'Connect once with a token; refreshes on its own. Never sees your password.',
  },
  email: {
    label: 'Email export',
    setAndForget: true,
    storesCredential: false,
    note: "Rides the platform's own emailed data export. No login stored.",
  },
  extension: {
    label: 'Browser extension',
    setAndForget: false,
    storesCredential: false,
    note: 'Uses your live logged-in session in your own browser. Nothing leaves your device.',
  },
  ephemeral: {
    label: 'One-shot login',
    setAndForget: false,
    storesCredential: false,
    note: 'Enter credentials for a single run; they are used in memory and discarded.',
  },
  scrape: {
    label: 'Public page',
    setAndForget: true,
    storesCredential: false,
    note: 'Reads a public results page — no login at all. Brittle to page changes.',
  },
  manual: {
    label: 'Manual',
    setAndForget: false,
    storesCredential: false,
    note: 'You enter the number or drop a file. Always works, never automatic.',
  },
}

/** How the app kicks off a connector's sync (drives which UI control renders). */
export type ConnectMethod =
  | { kind: 'token'; placeholder: string } // ask for an API token
  | { kind: 'file'; accept: string } // drop a file (CSV/ZIP)
  | { kind: 'credentials' } // one-shot username+password (ephemeral)
  | { kind: 'url'; placeholder: string } // a public page URL to read
  | { kind: 'none' } // no input; runs on its own (email/extension)

/** A registered connector: metadata + the pure normalize step. */
export interface Connector<Raw = unknown> {
  /** Stable id, e.g. "ebird-csv". */
  id: string
  /** Display name, e.g. "eBird — Download My Data". */
  name: string
  /** Which hobby this connector feeds. */
  hobby: string
  /** Where it sits on the automation spectrum. */
  level: AutomationLevel
  /** How the app collects what it needs to sync. */
  connect: ConnectMethod
  /** Whether this connector is actually wired up yet (vs. planned). */
  status: 'live' | 'planned'
  /** One line describing the signal it produces. */
  signal: string
  /** Pure transform: already-fetched raw source data → normalized activity. */
  normalize(raw: Raw, ctx?: Record<string, unknown>): HobbyActivity
}

// ---- Registry -------------------------------------------------------------

const REGISTRY = new Map<string, Connector>()

/** Register a connector. Throws on duplicate id (catches copy-paste bugs). */
export function registerConnector<Raw>(c: Connector<Raw>): void {
  if (REGISTRY.has(c.id)) {
    throw new Error(`Connector id "${c.id}" already registered`)
  }
  REGISTRY.set(c.id, c as Connector)
}

/** Look up one connector by id. */
export function getConnector(id: string): Connector | undefined {
  return REGISTRY.get(id)
}

/** All registered connectors, in registration order. */
export function listConnectors(): Connector[] {
  return [...REGISTRY.values()]
}

/** All connectors that feed a given hobby. */
export function connectorsForHobby(hobby: string): Connector[] {
  return listConnectors().filter((c) => c.hobby === hobby)
}

/** Reset the registry (test helper). */
export function _resetRegistry(): void {
  REGISTRY.clear()
}

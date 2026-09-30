// Saved-connection store — the Plaid "Item" layer.
//
// Plaid Link is: pick an institution → a modal collects what it needs → the
// LINK is saved (as an "Item") → afterward you just "sync" against the saved
// Item, and can disconnect it. This module is that saved-Item layer for the
// sash's connectors: it persists, per connector id, the NON-SECRET config the
// user entered once (a username, a player name, an API token) plus when it was
// linked and last synced. Re-syncing reads config from here instead of a
// hardcoded fixture.
//
// SECURITY BOUNDARY — deliberately mirrors Plaid:
//   • We store non-secret config only: usernames, profile URLs, player names,
//     and API TOKENS (a token is designed to be stored and revoked; a password
//     is not). This matches every connector's `storesCredential: false`.
//   • The `ephemeral` (one-shot login) connector is NEVER saved here. Its whole
//     safety property is that nothing persists — the user re-enters credentials
//     each sync. isLinkable() returns false for it, and the dialog saves nothing.
//
// Persistence is localStorage (a prototype-appropriate, per-browser store). The
// pure read/write/merge logic is separated from the storage backend so it stays
// unit-testable with an injected backend.

import type { AutomationLevel } from './registry'

/** Config the user entered for a connector, by connect kind. All non-secret. */
export interface ConnectionConfig {
  /** For `url` connectors: the username / profile URL / player name. */
  handle?: string
  /** For `token` connectors: the API token (storable by design). */
  token?: string
}

/** A saved link (Plaid "Item"): which account is connected for one connector. */
export interface Connection {
  connectorId: string
  config: ConnectionConfig
  /** ISO timestamp the link was created. */
  linkedAt: string
  /** ISO timestamp of the last successful sync, if any. */
  lastSyncAt?: string
}

/** The persisted map: connectorId → Connection. */
export type ConnectionMap = Record<string, Connection>

const STORAGE_KEY = 'hobbyist.connections.v1'

/** A minimal storage backend (localStorage in the app; a stub in tests). */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * The `ephemeral` level is intentionally NOT linkable — a one-shot login stores
 * nothing. Every other level carries non-secret config that is safe to save.
 * This is the single source of truth the store, dialog, and panel all consult.
 */
export function isLinkable(level: AutomationLevel): boolean {
  return level !== 'ephemeral'
}

// ---- Pure read/write over an injected backend -----------------------------

/** Read the whole map. Returns {} on empty or malformed storage (never throws). */
export function readConnections(backend: StorageBackend): ConnectionMap {
  const raw = backend.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as ConnectionMap
    return {}
  } catch {
    return {}
  }
}

/** Overwrite the whole map. */
export function writeConnections(backend: StorageBackend, map: ConnectionMap): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(map))
}

/** Save (create or replace) one connection, stamping linkedAt. */
export function saveConnection(
  backend: StorageBackend,
  connectorId: string,
  config: ConnectionConfig,
  now: () => string = () => new Date().toISOString(),
): Connection {
  const map = readConnections(backend)
  const existing = map[connectorId]
  const conn: Connection = {
    connectorId,
    config,
    // Preserve the original link date on a re-configure; only set once.
    linkedAt: existing?.linkedAt ?? now(),
    lastSyncAt: existing?.lastSyncAt,
  }
  map[connectorId] = conn
  writeConnections(backend, map)
  return conn
}

/** Stamp a successful sync time on an existing connection (no-op if unlinked). */
export function markSynced(
  backend: StorageBackend,
  connectorId: string,
  now: () => string = () => new Date().toISOString(),
): void {
  const map = readConnections(backend)
  const conn = map[connectorId]
  if (!conn) return
  conn.lastSyncAt = now()
  writeConnections(backend, map)
}

/** Remove one connection (disconnect). */
export function removeConnection(backend: StorageBackend, connectorId: string): void {
  const map = readConnections(backend)
  if (!map[connectorId]) return
  delete map[connectorId]
  writeConnections(backend, map)
}

/** Read one connection, or undefined. */
export function getConnection(
  backend: StorageBackend,
  connectorId: string,
): Connection | undefined {
  return readConnections(backend)[connectorId]
}

// ---- Browser-facing store with subscribe (for React) ----------------------

function browserBackend(): StorageBackend {
  // Guarded so the module is import-safe in a non-DOM/test context.
  if (typeof localStorage !== 'undefined') return localStorage
  // In-memory fallback (SSR / tests that import the browser store directly).
  const mem = new Map<string, string>()
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
}

type Listener = () => void

/**
 * A tiny observable store over the browser backend, so React components can
 * subscribe and re-render on link/disconnect/sync. Kept dependency-free: the
 * panel uses useSyncExternalStore against these methods.
 */
export const connectionStore = (() => {
  const backend = browserBackend()
  const listeners = new Set<Listener>()
  // useSyncExternalStore demands a referentially-STABLE snapshot between
  // mutations — returning a fresh readConnections() object each call would loop
  // React forever. So we cache the last map and only replace it on a mutation.
  let cache: ConnectionMap = readConnections(backend)
  const refresh = () => {
    cache = readConnections(backend)
  }
  const emit = () => {
    refresh()
    listeners.forEach((l) => l())
  }

  return {
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot(): ConnectionMap {
      return cache
    },
    get(connectorId: string): Connection | undefined {
      return cache[connectorId]
    },
    save(connectorId: string, config: ConnectionConfig): Connection {
      const c = saveConnection(backend, connectorId, config)
      emit()
      return c
    },
    markSynced(connectorId: string): void {
      markSynced(backend, connectorId)
      emit()
    },
    remove(connectorId: string): void {
      removeConnection(backend, connectorId)
      emit()
    },
  }
})()

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isLinkable,
  readConnections,
  writeConnections,
  saveConnection,
  markSynced,
  removeConnection,
  getConnection,
  type StorageBackend,
  type ConnectionMap,
} from './connections'

// In-memory backend so the pure logic is testable without localStorage.
function memBackend(): StorageBackend {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

describe('isLinkable', () => {
  it('every level is linkable EXCEPT ephemeral (no-store guarantee)', () => {
    expect(isLinkable('api')).toBe(true)
    expect(isLinkable('email')).toBe(true)
    expect(isLinkable('extension')).toBe(true)
    expect(isLinkable('scrape')).toBe(true)
    expect(isLinkable('manual')).toBe(true)
    expect(isLinkable('ephemeral')).toBe(false)
  })
})

describe('connection store (pure)', () => {
  let backend: StorageBackend
  beforeEach(() => {
    backend = memBackend()
  })

  it('reads {} from empty storage', () => {
    expect(readConnections(backend)).toEqual({})
  })

  it('reads {} (never throws) from malformed storage', () => {
    backend.setItem('hobbyist.connections.v1', '{not json')
    expect(readConnections(backend)).toEqual({})
  })

  it('saves and reads back a connection with a linkedAt stamp', () => {
    const conn = saveConnection(backend, 'geocaching', { handle: 'GeoGophers' }, () => '2026-01-01T00:00:00Z')
    expect(conn.connectorId).toBe('geocaching')
    expect(conn.config.handle).toBe('GeoGophers')
    expect(conn.linkedAt).toBe('2026-01-01T00:00:00Z')
    expect(getConnection(backend, 'geocaching')?.config.handle).toBe('GeoGophers')
  })

  it('preserves the original linkedAt when a connection is re-configured', () => {
    saveConnection(backend, 'geocaching', { handle: 'old' }, () => '2026-01-01T00:00:00Z')
    const updated = saveConnection(backend, 'geocaching', { handle: 'new' }, () => '2026-06-06T00:00:00Z')
    expect(updated.config.handle).toBe('new')
    expect(updated.linkedAt).toBe('2026-01-01T00:00:00Z') // unchanged
  })

  it('markSynced stamps lastSyncAt on an existing connection', () => {
    saveConnection(backend, 'ultimate-results', { handle: 'Michael Chirlin' })
    markSynced(backend, 'ultimate-results', () => '2026-09-30T12:00:00Z')
    expect(getConnection(backend, 'ultimate-results')?.lastSyncAt).toBe('2026-09-30T12:00:00Z')
  })

  it('markSynced is a no-op for an unlinked connector', () => {
    markSynced(backend, 'not-linked')
    expect(getConnection(backend, 'not-linked')).toBeUndefined()
  })

  it('removeConnection deletes one link and leaves others', () => {
    saveConnection(backend, 'geocaching', { handle: 'a' })
    saveConnection(backend, 'ultimate-results', { handle: 'b' })
    removeConnection(backend, 'geocaching')
    expect(getConnection(backend, 'geocaching')).toBeUndefined()
    expect(getConnection(backend, 'ultimate-results')?.config.handle).toBe('b')
  })

  it('writeConnections round-trips the whole map', () => {
    const map: ConnectionMap = {
      geocaching: { connectorId: 'geocaching', config: { handle: 'x' }, linkedAt: '2026-01-01T00:00:00Z' },
    }
    writeConnections(backend, map)
    expect(readConnections(backend)).toEqual(map)
  })

  it('stores an API token config (tokens are storable by design)', () => {
    saveConnection(backend, 'youtube', { token: 'AIzaSyExample' })
    expect(getConnection(backend, 'youtube')?.config.token).toBe('AIzaSyExample')
  })
})

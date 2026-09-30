import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  parseGeocachingProfile,
  geocachingProfileUrl,
  geocachingUsername,
  fetchGeocachingProfile,
  syncGeocachingProfile,
} from './geocachingParse'
import type { GeocacheProfile } from './geocaching'

const here = dirname(fileURLToPath(import.meta.url))
// Real public profile captured live from geocaching.com/p/?u=GeoGophers.
const REAL_HTML = readFileSync(join(here, '__fixtures__', 'geocaching-profile.html'), 'utf-8')

// The 404 "DNF" shell geocaching.com returns for a nonexistent username.
const DNF_HTML = `<!DOCTYPE html><html><head><title>DNF</title></head><body>
  <h1 class="http-error-title">Error 404: DNF</h1></body></html>`

describe('parseGeocachingProfile (against the REAL captured public profile)', () => {
  it('recognizes a real profile and reads the public souvenir count', () => {
    const p = parseGeocachingProfile(REAL_HTML)
    expect(p.exists).toBe(true)
    expect(p.souvenirsCount).toBe(6) // the one genuinely-public number in the HTML
    expect(p.findCountAvailable).toBe(false) // honest: find total is auth-gated
  })

  it('returns exists:false for the 404 DNF shell', () => {
    const p = parseGeocachingProfile(DNF_HTML)
    expect(p.exists).toBe(false)
    expect(p.findCountAvailable).toBe(false)
  })
})

describe('geocachingUsername / geocachingProfileUrl', () => {
  it('extracts the username from a full profile URL', () => {
    expect(geocachingUsername('https://www.geocaching.com/p/?u=GeoGophers')).toBe('GeoGophers')
  })
  it('passes a bare username through', () => {
    expect(geocachingUsername('mchirlin')).toBe('mchirlin')
  })
  it('builds the canonical public-profile URL', () => {
    expect(geocachingProfileUrl('Geo Gophers')).toBe(
      'https://www.geocaching.com/p/?u=Geo%20Gophers',
    )
  })
})

describe('fetchGeocachingProfile', () => {
  it('fetches + parses (injected fetch = the real fixture)', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, text: async () => REAL_HTML }) as Response
    const p = await fetchGeocachingProfile('GeoGophers', { fetchImpl: fakeFetch })
    expect(p.exists).toBe(true)
    expect(p.souvenirsCount).toBe(6)
  })

  it('prefixes the proxy base when given (browser CORS path)', async () => {
    let calledUrl = ''
    const fakeFetch = async (u: string) => {
      calledUrl = u
      return { ok: true, status: 200, text: async () => REAL_HTML } as Response
    }
    await fetchGeocachingProfile('GeoGophers', {
      proxyBase: 'https://proxy.example/?u=',
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(calledUrl).toContain('https://proxy.example/?u=')
    expect(calledUrl).toContain(encodeURIComponent('www.geocaching.com'))
  })

  it('throws on a non-OK response so the caller can fall back', async () => {
    const fakeFetch = async () => ({ ok: false, status: 500, text: async () => '' }) as Response
    await expect(
      fetchGeocachingProfile('GeoGophers', { fetchImpl: fakeFetch as unknown as typeof fetch }),
    ).rejects.toThrow(/HTTP 500/)
  })
})

describe('syncGeocachingProfile (fetch-with-fallback)', () => {
  const seed: GeocacheProfile = {
    username: 'GeoGophers',
    finds: [
      { name: 'Old Mill', date: '2026-08-14' },
      { name: 'Riverside Micro', date: '2026-07-30' },
    ],
  }

  it('adds a verified public-signal line when the profile is live', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, text: async () => REAL_HTML }) as Response
    const r = await syncGeocachingProfile(seed, 'GeoGophers', { fetchImpl: fakeFetch })
    expect(r.live).toBe(true)
    expect(r.souvenirsCount).toBe(6)
    // souvenir evidence prepended, seed finds preserved
    expect(r.profile.finds[0].name).toMatch(/6 souvenirs earned/i)
    expect(r.profile.finds).toHaveLength(seed.finds.length + 1)
  })

  it('falls back to seed (not live) when the username 404s', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, text: async () => DNF_HTML }) as Response
    const r = await syncGeocachingProfile(seed, 'nobody-here', { fetchImpl: fakeFetch })
    expect(r.live).toBe(false)
    expect(r.profile).toEqual(seed)
  })

  it('falls back to seed on a network/CORS failure', async () => {
    const fakeFetch = async () => {
      throw new Error('network / CORS blocked')
    }
    const r = await syncGeocachingProfile(seed, 'GeoGophers', {
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(r.live).toBe(false)
    expect(r.profile).toEqual(seed)
  })
})

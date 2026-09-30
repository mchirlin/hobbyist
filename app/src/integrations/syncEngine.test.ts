import { describe, it, expect } from 'vitest'
import { runSync } from './syncEngine'
import { getConnector } from './registry'
import { registerBuiltinConnectors } from './connectors'

registerBuiltinConnectors()

// A fetch stub that always fails, forcing the honest seed-fallback path (so the
// test is deterministic and never hits the network).
const failingFetch: typeof fetch = async () => {
  throw new Error('network disabled in test')
}

describe('runSync', () => {
  it('geocaching: falls back to seed finds when the live fetch fails, live=false', async () => {
    const c = getConnector('geocaching')!
    const out = await runSync(c, { handle: 'GeoGophers' }, { fetchImpl: failingFetch })
    expect(out.activity.hobby).toBe('Geocaching')
    expect(out.live).toBe(false)
    expect(out.activity.activityCount).toBeGreaterThan(0) // seed finds present
    expect(out.status).toContain('GeoGophers')
  })

  it('ultimate: falls back to seed tournaments when the fetch fails, still normalizes', async () => {
    const c = getConnector('ultimate-results')!
    const out = await runSync(c, { handle: 'Michael Chirlin' }, { fetchImpl: failingFetch })
    expect(out.activity.hobby).toBe('Ultimate')
    expect(out.activity.activityCount).toBeGreaterThan(0)
    expect(out.live).toBe(false)
    // Seed-fallback path reports a seed status (the player name only appears on
    // the live path — we didn't fetch anyone here).
    expect(out.status).toMatch(/seed/i)
  })

  it('youtube (planned): returns an honest not-built-yet status, live=false', async () => {
    const c = getConnector('youtube')!
    const out = await runSync(c, { token: 'AIzaSyExample' })
    expect(out.live).toBe(false)
    expect(out.status).toMatch(/planned|not built/i)
    expect(out.activity.hobby).toBe('Video Making')
    expect(out.activity.activityCount).toBe(0)
  })
})

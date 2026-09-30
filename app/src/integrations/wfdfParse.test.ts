import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  parseWfdfPlayerCard,
  wfdfPlayerCardUrl,
  fetchWfdfPlayerCard,
} from './wfdfParse'

const here = dirname(fileURLToPath(import.meta.url))
// Real player card captured live from results.wfdf.sport (WMUCC 2026, #24).
const REAL_HTML = readFileSync(join(here, '__fixtures__', 'wfdf-playercard.html'), 'utf-8')

describe('parseWfdfPlayerCard (against the REAL captured WMUCC 2026 card)', () => {
  const ctx = {
    tournament: 'WMUCC 2026', date: '2026-06-28', division: 'Grand Master Open',
    placement: 4, body: 'WFDF',
  }

  it('extracts team and the individual stat line from the real HTML', () => {
    const r = parseWfdfPlayerCard(REAL_HTML, ctx)!
    expect(r).not.toBeNull()
    expect(r.team).toBe('Black Cans')
    expect(r.division).toBe('Grand Master Open') // from ctx (standings), not the card
    expect(r.tournament).toBe('WMUCC 2026')
    expect(r.placement).toBe(4)
    // the real numbers parsed out of the card's stat table
    expect(r.stats).toEqual({ games: 9, assists: 13, goals: 17, total: 30, wins: 5, winPct: 55.6 })
    // source invariant
    expect(r.stats!.total).toBe(r.stats!.goals + r.stats!.assists)
  })

  it('returns null for HTML with no stats table (defensive)', () => {
    expect(parseWfdfPlayerCard('<html><body>nope</body></html>', ctx)).toBeNull()
  })
})

describe('wfdfPlayerCardUrl', () => {
  it('builds the canonical event/player URL', () => {
    expect(wfdfPlayerCardUrl('wmucc-2026', 616)).toBe(
      'https://results.wfdf.sport/wmucc-2026/?view=playercard&series=0&player=616',
    )
  })
})

describe('fetchWfdfPlayerCard', () => {
  const ctx = { tournament: 'WMUCC 2026', date: '2026-06-28', division: 'Grand Master Open', placement: 4 }

  it('fetches, parses, and returns a result (injected fetch = the real fixture)', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, text: async () => REAL_HTML }) as Response
    const r = await fetchWfdfPlayerCard('wmucc-2026', 616, ctx, { fetchImpl: fakeFetch })
    expect(r.stats!.goals).toBe(17)
    expect(r.team).toBe('Black Cans')
  })

  it('prefixes the proxy base when given (browser CORS path)', async () => {
    let calledUrl = ''
    const fakeFetch = async (u: string) => {
      calledUrl = u
      return { ok: true, status: 200, text: async () => REAL_HTML } as Response
    }
    await fetchWfdfPlayerCard('wmucc-2026', 616, ctx, {
      proxyBase: 'https://proxy.example/?u=',
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(calledUrl).toContain('https://proxy.example/?u=')
    expect(calledUrl).toContain(encodeURIComponent('results.wfdf.sport'))
  })

  it('throws on a non-OK response so the caller can fall back', async () => {
    const fakeFetch = async () => ({ ok: false, status: 404, text: async () => '' }) as Response
    await expect(
      fetchWfdfPlayerCard('wmucc-2026', 616, ctx, { fetchImpl: fakeFetch as unknown as typeof fetch }),
    ).rejects.toThrow(/HTTP 404/)
  })
})

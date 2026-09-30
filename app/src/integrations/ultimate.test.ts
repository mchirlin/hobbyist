import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  ultimateAdapter,
  ordinal,
  medalFor,
  resultLabel,
  syncUltimateResults,
  MICHAEL_ULTIMATE_RESULTS,
  type WfdfTournamentResult,
} from './ultimate'

const here = dirname(fileURLToPath(import.meta.url))
const REAL_CARD_HTML = readFileSync(join(here, '__fixtures__', 'wfdf-playercard.html'), 'utf-8')

describe('ordinal', () => {
  it('formats common placements', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(22)).toBe('22nd')
  })
  it('handles the 11/12/13 exceptions', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })
})

describe('medalFor', () => {
  it('maps the podium and nothing else', () => {
    expect(medalFor(1)).toBe('Gold')
    expect(medalFor(2)).toBe('Silver')
    expect(medalFor(3)).toBe('Bronze')
    expect(medalFor(4)).toBeNull()
  })
})

describe('resultLabel', () => {
  it('renders a WFDF result with an individual stat line', () => {
    const r: WfdfTournamentResult = {
      tournament: 'WMUCC 2026',
      division: 'Grand Master Open',
      team: 'Black Cans',
      placement: 4,
      stats: { games: 9, assists: 13, goals: 17, total: 30, wins: 5, winPct: 55.6 },
    }
    expect(resultLabel(r)).toBe(
      'WMUCC 2026 — Grand Master Open, 4th (Black Cans) · 17G 13A in 9 games',
    )
  })

  it('renders a placement-only (USAU) result with a medal word and no stats', () => {
    const r: WfdfTournamentResult = {
      tournament: '2025 USA Ultimate Masters Championships',
      division: 'Grand Masters Men',
      team: 'Black Cans',
      placement: 1,
    }
    expect(resultLabel(r)).toBe(
      '2025 USA Ultimate Masters Championships — Grand Masters Men, Gold (Black Cans)',
    )
  })

  it('includes field size when present', () => {
    const r: WfdfTournamentResult = {
      tournament: 'X', division: 'D', team: 'T', placement: 4, fieldSize: 22,
    }
    expect(resultLabel(r)).toBe('X — D, 4th of 22 (T)')
  })
})

describe('ultimateAdapter.normalize', () => {
  it('counts tournaments, orders evidence newest-first, sets freshness', () => {
    const a = ultimateAdapter.normalize(MICHAEL_ULTIMATE_RESULTS)
    expect(a.hobby).toBe('Ultimate')
    expect(a.source).toBe('ultimate')
    expect(a.activityCount).toBe(2)
    // WMUCC 2026 (2026-06-28) is newer than USAU 2025 (2025-07-18)
    expect(a.lastActive).toBe('2026-06-28')
    expect(a.evidence[0].label).toContain('WMUCC 2026')
    expect(a.evidence[0].label).toContain('17G 13A')
    expect(a.evidence[1].label).toContain('Gold')
  })

  it('is empty-safe', () => {
    const a = ultimateAdapter.normalize([])
    expect(a.activityCount).toBe(0)
    expect(a.level).toBe(0)
    expect(a.evidence).toEqual([])
    expect(a.lastActive).toBeUndefined()
  })

  it('derives level from tournament count via the shallow ladder', () => {
    // thresholds [1,2,4,8,16]: 2 tournaments → level 2
    expect(ultimateAdapter.normalize(MICHAEL_ULTIMATE_RESULTS).level).toBe(2)
  })
})

describe('MICHAEL_ULTIMATE_RESULTS fixture (real captured data)', () => {
  it('carries the WMUCC 2026 Grand Master Open 4th + individual line', () => {
    const worlds = MICHAEL_ULTIMATE_RESULTS.find((r) => r.tournament === 'WMUCC 2026')!
    expect(worlds.division).toBe('Grand Master Open')
    expect(worlds.team).toBe('Black Cans')
    expect(worlds.placement).toBe(4)
    expect(worlds.stats).toEqual({ games: 9, assists: 13, goals: 17, total: 30, wins: 5, winPct: 55.6 })
    // total must equal goals + assists (source invariant)
    expect(worlds.stats!.total).toBe(worlds.stats!.goals + worlds.stats!.assists)
  })

  it('carries the 2025 USAU GM Nationals gold as placement-only', () => {
    const nats = MICHAEL_ULTIMATE_RESULTS.find((r) => r.body === 'USAU')!
    expect(nats.placement).toBe(1)
    expect(nats.division).toBe('Grand Masters Men')
    expect(nats.stats).toBeUndefined()
  })
})

describe('syncUltimateResults (real fetch path + fallback)', () => {
  it('fetches the WFDF card live (injected fetch = real HTML) and merges USAU placement', async () => {
    const fakeFetch = async () =>
      ({ ok: true, status: 200, text: async () => REAL_CARD_HTML }) as Response
    const { results, live } = await syncUltimateResults({
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(live).toBe(true)
    // WMUCC 2026 (parsed live) + USAU 2025 (placement-only) merged, newest first
    expect(results).toHaveLength(2)
    expect(results[0].tournament).toBe('WMUCC 2026')
    expect(results[0].stats).toEqual({ games: 9, assists: 13, goals: 17, total: 30, wins: 5, winPct: 55.6 })
    expect(results[1].body).toBe('USAU')
    expect(results[1].placement).toBe(1)
  })

  it('falls back to seed rows when the fetch fails (never emptier than the fixture)', async () => {
    const failing = async () => { throw new Error('network down') }
    const { results, live } = await syncUltimateResults({
      fetchImpl: failing as unknown as typeof fetch,
    })
    expect(live).toBe(false)
    // still 2 tournaments (WMUCC seed + USAU), so the sash is never emptier
    expect(results).toHaveLength(2)
    expect(results.find((r) => r.tournament === 'WMUCC 2026')?.stats?.goals).toBe(17)
  })
})

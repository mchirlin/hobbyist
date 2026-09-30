// WFDF Ultimate adapter — turns a player's tournament results (team placement
// + individual stat line) into normalized HobbyActivity.
//
// SOURCE: results.wfdf.sport is a static, no-login WFDF results system. Each
// event has a per-player card at
//   ?view=playercard&series=0&player=<id>
// exposing Games / Assists / Goals / Total / averages / Wins / Win-%, and a
// per-team standings matrix (?view=teams&list=bystandings) giving the team's
// final placement per division. A scraper (see the connector's `level: scrape`)
// parses both into the WfdfTournamentResult shape below; this module is the
// pure transform from that shape → the sash's activity model.
//
// Two honest limits this adapter is designed around:
//  1. IDENTITY: WFDF player ids are scoped PER EVENT (player=616 at WMUCC 2026
//     is not the same id at another event), so cross-event aggregation matches
//     on player NAME (+ optionally team). The connector supplies the name to
//     filter on; this module trusts the caller's filtered results.
//  2. GRANULARITY: WFDF championship cards have individual box scores; USAU
//     nationals results are TEAM-PLACEMENT ONLY. So `stats` is optional — a
//     tournament can contribute placement alone (USAU) or placement + a full
//     individual line (WFDF).

import type { SourceAdapter, HobbyActivity, ActivityEvidence } from './activity'
import { levelFromThresholds } from './activity'

/** A player's individual box score for one tournament (WFDF player card). */
export interface WfdfPlayerStats {
  games: number
  assists: number
  goals: number
  /** Assists + goals. Kept explicit (source reports it) rather than derived. */
  total: number
  /** Team wins in games this player appeared in. */
  wins: number
  /** Win percentage as reported, 0-100. */
  winPct: number
}

/** One tournament result for the user: their team's placement + optional stats. */
export interface WfdfTournamentResult {
  /** Event name, e.g. "WMUCC 2026". */
  tournament: string
  /** ISO-ish date (event start or end). Used for the freshness signal. */
  date?: string
  /** Division played, e.g. "Grand Master Open". */
  division: string
  /** Team name, e.g. "Black Cans". */
  team: string
  /** Final placement (1 = gold). */
  placement: number
  /** Total teams in the division (for "4th of 22" context). Optional. */
  fieldSize?: number
  /** Individual box score, when the source publishes one (WFDF, not USAU). */
  stats?: WfdfPlayerStats
  /** Governing body / source, e.g. "WFDF" or "USAU". */
  body?: string
}

// Level thresholds by number of championship-level tournaments the player has
// appeared in. Ultimate is milestone-heavy (a Worlds appearance is a big deal),
// so the ladder is deliberately shallow.
export const ULTIMATE_TOURNAMENT_LEVELS = [1, 2, 4, 8, 16]

/** Ordinal helper: 1 → "1st", 4 → "4th", 22 → "22nd". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Medal word for a podium placement, else null. */
export function medalFor(placement: number): 'Gold' | 'Silver' | 'Bronze' | null {
  return placement === 1 ? 'Gold' : placement === 2 ? 'Silver' : placement === 3 ? 'Bronze' : null
}

/** Build the human-facing evidence label for one tournament result. */
export function resultLabel(r: WfdfTournamentResult): string {
  const medal = medalFor(r.placement)
  const place = medal ?? ordinal(r.placement)
  const ofField = r.fieldSize ? ` of ${r.fieldSize}` : ''
  const head = `${r.tournament} — ${r.division}, ${place}${ofField} (${r.team})`
  if (!r.stats) return head
  const s = r.stats
  return `${head} · ${s.goals}G ${s.assists}A in ${s.games} games`
}

/**
 * Normalize a set of the user's tournament results into one HobbyActivity.
 * activityCount = number of tournaments played (the level driver). Evidence is
 * one row per tournament, richest first (most recent), carrying placement and,
 * where present, the individual stat line.
 */
export const ultimateAdapter: SourceAdapter<WfdfTournamentResult[]> = {
  id: 'ultimate',
  normalize(raw): HobbyActivity {
    const results = Array.isArray(raw) ? raw : []
    // newest first for evidence + freshness
    const sorted = [...results].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    const lastActive = sorted[0]?.date
    const evidence: ActivityEvidence[] = sorted.slice(0, 5).map((r) => ({
      label: resultLabel(r),
      date: r.date,
    }))
    return {
      hobby: 'Ultimate',
      source: 'ultimate',
      activityCount: results.length,
      level: levelFromThresholds(results.length, ULTIMATE_TOURNAMENT_LEVELS),
      lastActive,
      evidence,
    }
  },
}

// ---- Seed fixture: Michael's real results ---------------------------------
// Captured live from results.wfdf.sport (WMUCC 2026 player card #24, player=616)
// and play.usaultimate.org (2025 Masters Championships final standings). This
// doubles as the connector's demo data and the parser's golden fixture.
export const MICHAEL_ULTIMATE_RESULTS: WfdfTournamentResult[] = [
  {
    tournament: 'WMUCC 2026',
    date: '2026-06-28',
    division: 'Grand Master Open',
    team: 'Black Cans',
    placement: 4,
    body: 'WFDF',
    stats: { games: 9, assists: 13, goals: 17, total: 30, wins: 5, winPct: 55.6 },
  },
  {
    tournament: '2025 USA Ultimate Masters Championships',
    date: '2025-07-18',
    division: 'Grand Masters Men',
    team: 'Black Cans',
    placement: 1,
    body: 'USAU',
    // USAU publishes team placement only — no individual box score.
  },
]

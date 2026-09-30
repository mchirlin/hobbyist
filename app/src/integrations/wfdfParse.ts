// Real fetch + parse for results.wfdf.sport player cards.
//
// The WFDF results system is static server-rendered HTML with no login. A
// player card lives at:
//   https://results.wfdf.sport/<event>/?view=playercard&series=0&player=<id>
// and contains:
//   <h1>#<jersey> <Full Name></h1>
//   <p>Team: <a ...>Black Cans</a></p>
//   the division ("Grand Master Open") appears in the page
//   a stats table:  Games | Assists | Goals | Tot. | ... | Wins | Win-%
//
// parseWfdfPlayerCard() is PURE (html string -> result) so it is unit-testable
// against a saved fixture. fetchWfdfPlayerCard() does the network call.
//
// IMPORTANT — where this can run:
//   • Server / Node / the ephemeral runner: a plain fetch works (no CORS).
//   • Browser (this SPA): results.wfdf.sport sends no CORS headers, so a direct
//     fetch() from the page is blocked. The connector therefore fetches through
//     an optional proxy base (VITE_WFDF_PROXY) when running in the browser, and
//     falls back to the seed fixture when no proxy is configured. This is the
//     same honest boundary as the ephemeral eBird runner: the PARSE is real; the
//     live fetch needs a non-browser execution context or a proxy.

import type { WfdfTournamentResult, WfdfPlayerStats } from './ultimate'

/** Strip HTML tags and decode the few entities WFDF emits, collapsing space. */
function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pull the first capture group of a regex, or '' . */
function first(re: RegExp, html: string): string {
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

export interface WfdfParseContext {
  /** Event display name, e.g. "WMUCC 2026" (the card doesn't always state it). */
  tournament: string
  /** ISO-ish event date for the freshness signal. */
  date?: string
  /**
   * Division, e.g. "Grand Master Open". Supplied by the caller because the
   * player card does NOT reliably restate it near the player — division is a
   * property of which team sits in which standings column, so it comes from the
   * standings matrix / team lookup, not from scraping the card.
   */
  division: string
  /** Final placement — comes from the standings matrix, not the player card. */
  placement: number
  fieldSize?: number
  body?: string
}

/**
 * Parse a WFDF player-card HTML string into a WfdfTournamentResult.
 * tournament/date/division/placement are supplied via ctx (the standings matrix
 * and event index own those); the card itself yields name, team, and the stat
 * line. Returns null if the card has no recognizable stat table.
 */
export function parseWfdfPlayerCard(html: string, ctx: WfdfParseContext): WfdfTournamentResult | null {
  // Name: <h1>#24 Michael Chirlin</h1>  (jersey optional)
  const h1 = first(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
  const playerName = h1.replace(/^#\d+\s*/, '').trim()

  // Team: <p>Team: <a ...>Black Cans</a></p>
  const team = first(/Team:\s*<a[^>]*>([\s\S]*?)<\/a>/i, html) || 'Unknown'

  // Stats table: header row Games|Assists|Goals|Tot.|...|Wins|Win-% then a data
  // row. Grab the first data row after the "Assists" header cell.
  const tableStart = html.indexOf('Assists')
  let stats: WfdfPlayerStats | undefined
  if (tableStart >= 0) {
    const after = html.slice(tableStart)
    // the data row: the first <tr> containing <td>s after the header
    const rowMatch = /<tr>\s*((?:<td[^>]*>[\s\S]*?<\/td>\s*){6,})<\/tr>/i.exec(after)
    if (rowMatch) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        stripTags(m[1]),
      )
      // columns: Games, Assists, Goals, Tot., AssistAvg, GoalAvg, PointAvg, Wins, Win-%
      const num = (i: number) => Number((cells[i] ?? '').replace('%', '')) || 0
      if (cells.length >= 9) {
        stats = {
          games: num(0),
          assists: num(1),
          goals: num(2),
          total: num(3),
          wins: num(7),
          winPct: num(8),
        }
      }
    }
  }

  if (!playerName && !stats) return null
  return {
    tournament: ctx.tournament,
    date: ctx.date,
    division: ctx.division,
    team,
    placement: ctx.placement,
    fieldSize: ctx.fieldSize,
    stats,
    body: ctx.body ?? 'WFDF',
  }
}

/** Build the canonical player-card URL for an event slug + player id. */
export function wfdfPlayerCardUrl(eventSlug: string, playerId: number): string {
  return `https://results.wfdf.sport/${eventSlug}/?view=playercard&series=0&player=${playerId}`
}

/**
 * Fetch + parse a single player card. Runs anywhere fetch() reaches the host:
 * server/Node directly; in the browser it prefixes `proxyBase` (e.g. a small
 * CORS proxy you host) because results.wfdf.sport sends no CORS headers.
 * Throws on network / non-OK / unparseable, so the caller can fall back.
 */
export async function fetchWfdfPlayerCard(
  eventSlug: string,
  playerId: number,
  ctx: WfdfParseContext,
  opts: { proxyBase?: string; fetchImpl?: typeof fetch } = {},
): Promise<WfdfTournamentResult> {
  const doFetch = opts.fetchImpl ?? fetch
  const target = wfdfPlayerCardUrl(eventSlug, playerId)
  const url = opts.proxyBase ? `${opts.proxyBase}${encodeURIComponent(target)}` : target
  const res = await doFetch(url)
  if (!res.ok) throw new Error(`WFDF fetch failed: HTTP ${res.status}`)
  const html = await res.text()
  const parsed = parseWfdfPlayerCard(html, ctx)
  if (!parsed) throw new Error('WFDF card had no recognizable stats table')
  return parsed
}

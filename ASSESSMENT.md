# The Hobbyist — Honest Assessment & v1 Plan

_Written 2026-09-30, after building the multi-hobby sash, the Plaid-like connect
flow, live scrape connectors, and Pokémon-GO-style medals. This is the candid
"step back" take, kept in the repo so the reasoning behind the v1 cut isn't lost._

---

## Is this a cool idea? Yes — with one hard caveat.

The core idea is genuinely good: **your hobbies as a merit-badge sash, sized by
how much they matter to you, that you can share.** It borrows the two instincts
that make Strava and Pokémon GO sticky:

- **Strava** turns effort into an identity you show off.
- **Pokémon GO medals** make "a number you move" quietly addictive.

Both point at a space nobody serves well: the **generalist** — the person who's
decent at six things and has no single place that says so. That's a real,
unclaimed niche.

## The hard caveat: the whole value is real + effortless data.

The magic is "it just knows." The moment a user has to type in a geocaching
username, hand-enter Ultimate stats, or drop a CSV, it stops being a mirror of
who they are and becomes a form to fill out.

And that wall is brutal. As of this prototype:

| Connector | Real? | Reality |
|---|---|---|
| eBird — Download My Data (CSV) | ✅ **Fully real** | Parses your real export in-browser, zero auth. The one honest beachhead. |
| Ultimate — WFDF/USAU | ⚠️ Works server-side | Live fetch proven, but **browser CORS blocks it**; needs a proxy. |
| Geocaching | ⚠️ Partial | Public profile fetches server-side; **find totals are auth-gated** (only souvenir count is public). |
| eBird — one-shot login | ⚠️ Half | Real no-store lifecycle, mock login in-browser. |
| YouTube | ❌ Planned | Not built. |

**One out of five is fully real.** Every hobby worth showing is behind a login,
a scraper, or an API key. That's not a bug we haven't fixed — it's the *actual
product*, and it's hard, unglamorous, per-source, and breaks when sites change.

## A tension worth naming

A **shareable static artifact** (the sash) and a **fiddly self-improvement
dashboard** (medals, quests, importance sliders, connect flows) are almost two
different products:

- The **sash** is the thing someone screenshots and posts → it can spread.
- The **medals/quests** are the thing that keeps *you* coming back → they don't
  spread on their own.

Both are good. A v1 that tries to nail both nails neither. **The
sash-as-shareable-image is the wedge.**

## What it honestly is right now

A beautiful, well-tested prototype (**107 tests, clean build**) with **one real
data source** and a lot of convincing scaffolding. That's exactly the right
stage — but the distance from here to "cool thing people use" is almost entirely
the **data-connection problem**, not more UI.

---

## The sharpest-possible v1

> **"Paste your eBird CSV — get a shareable badge of your year in birding."**

Not a sash of six hobbies. Not medals plural. Not connectors plural.
**One hobby, one real data source, one image people want to post.**

### Why this shape

- **The sash needs ≥3 hobbies to look like anything** — which forces the
  "fill out six forms" problem that kills cold users. A **single-hobby badge**
  looks great with *one* connection.
- **eBird CSV is the one honest connector** — real, in-browser, zero-auth,
  live-tested. Birders are also a perfect early crowd: obsessive, list-driven,
  love showing off a life list, already export CSVs.
- **The shareable artifact is the growth engine**, not the dashboard. A birder
  posts "my 2026 life list — 247 species 🦅" and every birder who sees it wants
  theirs.

### In scope for v1 (only this)

1. **One landing action:** "Drop your eBird CSV." _(Already built and working.)_
2. **One generated artifact:** a single beautiful badge/card — species count,
   top birds, a tier (existing medal logic on one metric), the user's name.
   Static, screenshottable, **downloadable as PNG**.
3. **A share button + a "make your own" link back.** That's the loop.

No login, no saved connections, no multi-hobby sash, no quests panel.

### Cut from what's built (kept in the branch, not shipped)

- **Multi-hobby physics sash** → v2. Best asset, but demands N connectors.
- **Plaid connect flow / saved connections** → v2. Zero value with one
  zero-auth source; it exists to manage many linked accounts we don't have yet.
- **Geocaching / WFDF live fetch** → v2, gated behind a real CORS-proxy solution.
- **Medals system** → collapse to **one tier badge** on the single card. The
  framework stays; the UI shrinks.

### The one honest risk of this cut

It looks *smaller* than what exists — because it is. We've built a v2-shaped
thing; v1 is a slice of it. That feels like going backwards. It isn't: the
multi-hobby version **can't be tested with strangers until the connector problem
is solved**; the single-hobby version can be tested next week.

### The real question v1 answers

Not "is it cool" (it is). It's: **does one birder, unprompted, post their badge —
and does a second birder click "make mine"?** If yes, the connector grind is
worth it. If no, no amount of connectors saves it. v1 answers that for the price
of a weekend, not a quarter.

---

## Bottom line

Cool idea, real niche, the fun parts are built and they *are* fun. Whether it's
actually cool comes down to a problem we've cracked once out of five: **real,
effortless data**. Ship the single-hobby eBird badge, see if it spreads, and let
that decide whether the connector grind is worth it.

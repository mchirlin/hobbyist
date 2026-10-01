# The Hobbyist — Product Thesis

_Rewritten 2026-10-01 after the target market crystallized. The earlier version
of this file pitched a single-hobby shareable birding badge; that was the wrong
cut. This is the real product. The debugging/connector history is preserved at
the bottom because the data-connection wall is still the central hard problem._

---

## Who this is for

**Generalists / Renaissance people — specifically the ADHD collector-learner.**

Not the person who grinds one hobby to mastery. The person who:

- starts six things, goes deep on three, abandons two, and picks up a seventh
  next month;
- loves **collecting** and **learning new things** for their own sake;
- has no single place that says "here is everything I'm into."

This is a real, unclaimed niche. Every existing tracker serves the *specialist*
(Strava for one sport, Goodreads for one medium). Nobody celebrates **breadth**.

## The core insight: reward breadth and novelty, not depth and streaks

Most gamified apps punish exactly the behavior this market exhibits. Duolingo
shames you when a streak breaks. Fitness apps make you "fall behind." For an
ADHD collector, that guilt loop is fatal — they bounce.

**This product inverts it.** The win is "I started a 7th hobby this month," not
"I kept a 500-day streak." Breadth is the achievement. Novelty is the reward.
The dopamine lives in **filling a new empty slot**, not in the 500th rep of an
old one. The product should always be dangling the next collectable thing.

The mental model is a **collection display case** — a sash / medal case full of
distinct patches. Your market are collectors; a collection shown at a glance,
with visible variety and visible gaps-to-fill, *is* the product. (The earlier
single-badge "performance stat" was the opposite of this. It was a receipt, not
a trophy shelf — which is why it felt one-dimensional.)

## The core loop: declare-first, enrich-later (works for BOTH)

The key decision — and the thing that makes it work — is that a hobby lives in
**two states**, and the transition between them is the loop:

1. **Declare (instant, zero friction).** Tap "I'm into pottery now" → an **empty
   patch** appears immediately. This is the collector dopamine hit and the ADHD
   low-activation-energy path. The medal case shows the medal before you've
   earned it — the empty slot is the invitation.
2. **Enrich (optional, earned).** *Later*, connect real data (eBird CSV, a
   profile, an API) → the patch **fills in and levels up** with honest,
   earned depth. This is the reason to come back.

Declare-first gives immediacy and breadth. Data-first gives honesty and depth.
**The arrow between them is the magic**: tap to collect → optionally connect →
watch it fill. Neither alone is the product; the loop is.

### What this means for the data model (already mostly supported)

`ProfileHobby` already carries `importance`, `level`, `missions`, and
`metricCounts`. The two states map directly:

- **Declared hobby** = a `ProfileHobby` with no `metricCounts` yet (empty patch,
  level 0, "connect to level up" affordance).
- **Enriched hobby** = `metricCounts` populated by a connector sync, driving
  medal tiers and level.

No schema rework needed — the states are a presence/absence of real data on an
existing shape.

## Why the connector wall still matters (more, not less)

The data-connection problem is **more** central for this market, because an ADHD
collector will not fill out six forms. Declare-first *buys time* against this
wall (the hobby exists and feels good before any data), but "enrich" still has to
be near-effortless or the second half of the loop never fires.

Current honest state of connectors:

| Connector | Real? | Reality |
|---|---|---|
| eBird — Download My Data (CSV) | ✅ **Fully real** | Parses a real export in-browser, zero auth. The one honest beachhead. |
| Ultimate — WFDF/USAU | ⚠️ Works server-side | Live fetch proven, but **browser CORS blocks it**; needs a proxy. |
| Geocaching | ⚠️ Partial | Public profile fetches server-side; **find totals are auth-gated**. |
| eBird — one-shot login | ⚠️ Half | Real no-store lifecycle, mock login in-browser. |
| YouTube | ❌ Planned | Not built. |

Declare-first means a hobby no longer *depends* on its connector to exist — which
makes a partial/CORS-blocked connector a "level-up later" affordance instead of a
dead end. That's a meaningful softening of the wall, not a solution to it.

## What's built and reusable toward this

A well-tested prototype (**115 tests, clean build**, live at
`https://mchirlin.github.io/hobbyist/`) that already contains most of the pieces
this thesis needs — they were just cut down for the single-badge v1:

- **The multi-hobby physics sash** — the collection display case. This is the
  product's center, not a v2 nice-to-have.
- **The Plaid-like connect flow** (`connections.ts`, `ConnectDialog`,
  `syncEngine`) — this is literally the "enrich" half of the loop.
- **The medal system** (`quests/medals.ts`, Bronze→Platinum per metric) — the
  collectable, multi-axis reward. A *case* of medals across axes is the
  anti-one-dimensional answer.
- **The eBird badge** — now reframed as *one tile* that can be enriched, not the
  whole product.

**The earlier assessment cut the wrong way.** It parked the sash, the connect
flow, and the medals as "v2" to ship a testable single badge. But for *this*
market, the sash-as-collection-case **is v1** — breadth is the whole point, and
a single badge can't express breadth.

## Connector roadmap (candidate sources)

Declared hobbies create demand for connectors. Captured ideas, with an honest
read on how automatic each can realistically be (the enrich half must be
near-effortless or it never fires):

| Hobby | Source(s) | Likely automation | Notes |
|---|---|---|---|
| Birding | eBird CSV | ✅ real today | The beachhead. |
| Ultimate | WFDF / USAU | ⚠️ needs proxy | Server-side works; CORS-blocked in browser. |
| Geocaching | geocaching.com | ⚠️ partial | Souvenirs public; find total auth-gated. |
| **Foodie** | **Yelp** | ⚠️ scrape / API | Public profile (reviews, check-ins) is scrapable but CORS-walled; Yelp Fusion API is business data, not a user's review history — a user export or scrape+proxy is the real path. Metric: reviews written / places visited. |
| **Vacation** | **TripAdvisor, Kayak** | ⚠️ scrape / mixed | TripAdvisor public profile (reviews, cities, "countries visited") is a strong collector metric but scrape+proxy, no open API. Kayak has no public profile API — likely email-export (itineraries) or manual. Metric: countries / cities visited, trips logged. |
| YouTube | YouTube Data API | 🔜 OAuth | Planned; genuinely automatic once OAuth lands. |

The pattern holds across all of them: the richest signal is behind CORS, auth,
or an export — which is why the **CORS proxy** is the single highest-leverage
unlock, and **OAuth** (Strava-style) is the flagship "connect once, keeps
pulling" experience. Declare-first means every one of these can ship as an empty
patch *now* and get its connector later.

## v1 for the Renaissance-collector thesis

> **"Collect everything you're into. Tap to add a hobby instantly; connect real
> data to level it up."**

1. **Declare:** a frictionless "add a hobby" that drops an empty patch into the
   collection case immediately.
2. **Collect/display:** the sash/medal-case as the home surface — breadth
   visible at a glance, empty slots inviting the next one.
3. **Enrich:** the existing connect flow turns a declared patch into an earned
   one; medals/levels move as real data lands.
4. **Share:** the full collection case is the artifact worth posting — "look at
   everything I'm into," which is inherently multi-dimensional.

## The real question v1 answers

Not "is it cool." It's: **does a collector-learner keep adding hobbies, and does
connecting one real source feel good enough to pull them back?** Breadth +
return — those are the two signals. If adding the 4th hobby and watching one fill
in both feel rewarding, the connector grind is worth it.

---

## Appendix: the data-connection history (why the wall is real)

The hard, unglamorous truth from building five connectors: **one of five is
fully real** (eBird CSV). The rest hit browser CORS, auth-gated endpoints, or
aren't built. Scraping public pages works server-side but is blocked in-browser
and breaks when sites change. This is the actual product problem, and
declare-first mitigates but does not eliminate it — "enrich" still needs to be
near-effortless per source. See the connector table above for current state.

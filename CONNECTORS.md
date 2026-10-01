# Hobby ↔ Data source catalog

A living list of hobbies and the websites/services we could pull real data from
to **enrich** a declared patch. This is the demand side of the declare-first
loop: a hobby ships as an empty patch *now*; a connector fills it in later. The
whole collecting dopamine depends on enrich being near-effortless, so every
entry carries an honest read on how automatic the pull can realistically be.

## How to read the columns

- **Metric(s)** — the collectable number(s) that would fill the patch. Collector
  metrics beat performance metrics: *count / variety / completeness* (species,
  countries, breweries) spreads better than a single score.
- **Auth** — what the data sits behind: `public` (open page), `login` (user
  session), `OAuth` (token grant), `export` (user downloads their own data),
  `API key` (developer key, often business data not user history).
- **Automation tier** — how close to "it just filled in" we can get:
  - ✅ **real today** — works in a plain browser, no backend. (CSV/export drop.)
  - 🔁 **proxy** — public data but CORS-walled; a tiny CORS proxy unlocks it.
  - 🔜 **OAuth** — genuinely automatic "connect once, keeps pulling"; needs a
    backend for token exchange.
  - 📤 **export** — user downloads a file and drops it (the eBird pattern).
  - ✍️ **manual** — no realistic pull; user enters the number themselves.
  - ❓ **unknown** — not yet investigated.

Automation tiers are **best guesses until verified** — confirm the actual access
path before building a connector (a public profile that looks scrapable can be
JS-rendered or rate-limited; an "API" can be business data, not user history).

---

## Catalog

### Already in the roadmap / built

| Hobby | Source(s) | Metric(s) | Auth | Tier | Notes |
|---|---|---|---|---|---|
| Birding | eBird | species, checklists, rarities | export | ✅ real today | The beachhead — CSV drop works in-browser, zero auth. |
| Ultimate (frisbee) | WFDF, USAU | games, tournaments, rating | public/login | 🔁 proxy | Server-side works; CORS-blocked in browser. |
| Geocaching | geocaching.com | finds, souvenirs | public/login | 🔁 proxy / ❓ | Souvenirs public; find total auth-gated. |
| Content / video | YouTube | videos, views, subscribers | OAuth | 🔜 OAuth | Genuinely automatic once OAuth lands. |
| Foodie | Yelp | reviews written, places visited, check-ins | login/API key | 🔁 proxy / 📤 | Public profile scrapable but CORS-walled; Fusion API is *business* data, not a user's review history — scrape+proxy or user export is the real path. |
| Vacation / travel | TripAdvisor, Kayak | countries, cities, trips, reviews | public/export | 🔁 proxy / 📤 | TripAdvisor public profile ("countries visited") is a great collector metric but scrape+proxy, no open API. Kayak has no public profile API — likely email/itinerary export or manual. |

### New candidates (to investigate)

| Hobby | Source(s) | Metric(s) | Auth | Tier | Notes |
|---|---|---|---|---|---|
| Reading | Goodreads | books read, pages, genres, shelves | export/OAuth | 📤 / ❓ | Goodreads has a CSV export (books + shelves + ratings) — likely a ✅ export-drop like eBird. Public API is deprecated/closed to new keys; the StoryGraph is an alternative with its own export. |
| Drinking (beer) | Untappd | unique beers, check-ins, badges, breweries | OAuth/public | 🔜 OAuth / 🔁 proxy | Untappd has an OAuth API (approval-gated) and public profiles. Badges + unique-beer count are *perfect* collector metrics. Verify API access tier. |

---

## Prime candidates to brainstorm next

Grouped so we can pick a category and fill it in. Collector-friendly hobbies with
plausible data behind them — not yet triaged:

- **Reading / media:** Goodreads, StoryGraph, Letterboxd (films), Trakt (TV),
  Backloggd / HowLongToBeat (games), Last.fm / Spotify (music), Serializd.
- **Fitness / outdoors:** Strava (the flagship OAuth), Garmin, Peloton, AllTrails
  (hikes), Komoot, Strava segments, Fitbit / Google Fit, Hevy (lifting).
- **Food / drink:** Untappd (beer), Vivino (wine), Yelp, Google Maps timeline
  (places), Resy / OpenTable (reservations).
- **Travel / places:** TripAdvisor, Nomadlist, Foursquare/Swarm (check-ins),
  Google Maps timeline, airline mileage, Kayak.
- **Collecting proper:** Discogs (records), BoardGameGeek (board games), MTG /
  TCG trackers, Pokémon TCG, LEGO (Brickset / Rebrickable), stamps/coins.
- **Making / craft:** GitHub (code — commits, repos, languages), Ravelry
  (knitting), Thingiverse / Printables (3D printing), Strava for... no.
- **Nature / science:** iNaturalist (species beyond birds), eBird, Clear Outside
  / AstroBin (astronomy), mushroom / plant ID apps.
- **Learning:** Duolingo (languages — streak *and* count), Coursera / edX
  (courses), Anki (cards reviewed), Chess.com / Lichess (games, rating).

---

## Product pillar: hobby admins / communities (Reddit-style)

Direction from Michael: **each hobby has admin(s)** who own and curate it, like a
subreddit has moderators. This reframes the product from a *personal* collection
case into a **platform of hobby communities you collect memberships in**.

Why it fits the ADHD collector-learner thesis:

- **The admin is the curator who removes the "where do I start?" friction.** The
  scariest moment in a new hobby is not knowing what counts as progress. An admin
  authors the hobby's **levels, badges, recommended first steps, stores and
  apps** — so declaring a hobby drops you onto a *curated ladder*, not an empty
  void. (This is exactly what the imported sheet's `Levels`, `Badges`,
  `How to get started`, `Recommended Stores`, `Apps` columns are for.)
- **Declaring a hobby becomes social.** An empty patch isn't just yours — it
  joins you to a community whose admin has laid out the path and whose members
  ("People I know") you may already know. Novelty hit + curated path = the loop.
- **It unlocks the long tail.** Most hobbies will never have a data connector
  (see finding below). Admin-authored **badges and levels** let a hobby be rich
  *without* any scraped source — the human curates the collectables.

**Honest scope flag:** admins + communities means a real backend — accounts,
roles/permissions, user-generated content, moderation, ownership disputes: the
whole Reddit operational surface. This is a platform commitment, not a static
SPA. It need not be v1, but it changes what the product *is*, so it is named here
before it silently becomes the plan. The declare-first loop still works
single-player today; communities are the layer that makes the long-tail hobbies
(skydiving, glassblowing) rich without connectors.

### The two kinds of collectable (the key design consequence)

| Kind | Defined by | Example | Needs a connector? |
|---|---|---|---|
| **Data-pulled** | an external source's count | eBird species, Untappd beers | yes (the connector grind) |
| **Admin-authored** | a hobby admin / the user | "Led my first trad climb", "Rated 50 films" | no — human curates it |

The imported sheet shows **~40 of ~45 hobbies are badge-and-community**, not
data-pulled. **Finding: the connector grind serves a minority; admin-authored
badges + communities serve the majority.** Build the admin/badge-authoring path
and most of the catalog becomes rich with no API at all.

---

## Imported from Michael's hobby sheet

Source: the shared Google Sheet (45 hobbies). Its columns —
*How to get started · Community · Recommended Stores · Apps · Badges ·
People I know · Levels* — are adopted as the hobby schema (richer than the
connector-only view above). Blank cells = not yet filled; **People I know** is
the social seed for the communities layer.

| Hobby | Community site | Apps | Data tier | Badges (authored) | People I know |
|---|---|---|---|---|---|
| Climbing | theCrag | | 🔁 proxy / ✍️ | Led first sport climb; Led first trad climb | Dan McEwan, Yvonne, Anya, Brisbane guy |
| Skiing | | | ✍️ | | Andy |
| Ultimate Frisbee | | | 🔁 proxy | | |
| Dodgeball | | | ✍️ | | Vir |
| Softball | | | ✍️ | | Sarah Tsermengas |
| Board Games | BoardGameGeek | | 🔁 proxy / 📤 | | Angelus |
| Video Games | | | 🔜 (Steam/Trakt) | | Jono, Dan |
| Making Video Games | | | ✍️ | | |
| Making Apps | | | ✍️ / 🔜 (GitHub) | | Chase |
| Programming | | | 🔜 (GitHub) | | Chase |
| Stand Up Paddleboarding | | | ✍️ | | Ali's friend |
| Painting | | | ✍️ | | |
| Drawing | | | ✍️ | | Josh |
| Karate | | | ✍️ | | |
| Swing Dancing | Gottaswing | | ✍️ | | |
| Surfing | | | ✍️ | | Josh, Oli (Colony) |
| Playing Guitar | | | ✍️ | | Dad |
| Playing Piano | | | ✍️ | | |
| Fishing | | | ✍️ | | Queensland guy |
| Horse Back Riding | | | ✍️ | | |
| Car Racing | | | ✍️ | | |
| Dirt Biking | | | ✍️ | | |
| Mountain Biking | | | 🔜 (Strava) | | |
| Skydiving | | | ✍️ | | |
| Bungee Jumping | | | ✍️ | | |
| Sailing | | | ✍️ | | Liz, train guy |
| Speed cubing | | | ✍️ / ❓ | | |
| Cup stacking | | | ✍️ | | |
| Magic | | | ✍️ | | Two kids from games |
| Glassblowing | | | ✍️ | | |
| Archery | | | ✍️ | | |
| Blacksmithing | | | ✍️ | | Braden |
| Miniature painting | | | ✍️ | | |
| Blogging | | | ✍️ / 🔜 | | |
| Making videos | | | 🔜 (YouTube) | | |
| Canyoning | | | ✍️ | | |
| Spelunking | | | ✍️ | | |
| Stamp collecting | | | ✍️ | | |
| Birding | eBird | BirdsEye | ✅ real today | | Trevor Waller |
| Writing | | | ✍️ | | |
| Stand up comedy | | | ✍️ | | |
| Bowling | | | ✍️ | | |
| Geocaching | Geocaching.com | Geocaching | 🔁 proxy | | |
| Hiking | | | 🔜 (AllTrails/Strava) | | |
| RC flying | | | ✍️ | | |
| Piloting | | | ✍️ | | |
| Memorization | | | ❓ | | |
| Geography | | | ❓ | | |
| Exercise | | | 🔜 (Strava/Fit) | | |
| Dragonboating | | | ✍️ | | |
| Darts | | | ✍️ | | |
| Starting a website | | | ✍️ | | |
| RPGs | | | ✍️ | | |
| Slack Lining | | | ✍️ | | |
| Flying suit (wingsuit) | | | ✍️ | | |
| Backpacking | | | ✍️ | | |
| Cooking | | | ✍️ | | |
| Medieval Warrior | | | ✍️ | | Dan McEwan |
| Skateboard | | | ✍️ | | |
| Knitting/Sewing | Ravelry | | 🔁 proxy / 📤 | | Kerri Mulder |

---

## Open questions for the catalog itself

1. **What's the universal "collector" metric?** Most *data-pulled* sources expose
   a *count of distinct things* (species, beers, books, countries). Standardizing
   on "distinct items collected" makes cross-hobby medals coherent — but see Q4,
   since most hobbies are admin-authored, not counted.
2. **Which tier do we chase first?** Export-drop (📤) hobbies are the cheapest
   wins after Birding (Goodreads, likely Letterboxd/Discogs). The CORS proxy
   (🔁) unlocks a batch at once. OAuth (🔜) is the flagship but costs a backend.
3. **Manual-entry fallback.** Should every hobby support a user just typing the
   number, so declare-first never feels hollow while a connector is pending?
4. **Admin-authored vs data-pulled badges.** The sheet proves most hobbies live
   on human-authored milestones ("Led my first trad climb"), not API counts. Do
   we build the **badge/level authoring** path (serves ~40 hobbies, needs the
   communities backend) before or after the connector grind (serves ~5)?
5. **Who is an admin, and how is one appointed?** First-declarer? Invite-only?
   This is the first governance question the Reddit-style model forces.

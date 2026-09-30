# The Hobbyist

> *"Add that second dimension."*

A learning project to design and build a web app about **hobbies** — a place to
discover new hobbies, track your own, level up, and connect with other people
who share them.

This README captures the **ideas and vision** for the project, gathered from a
Trello board, a slide deck, and a hobby-catalog spreadsheet. It is intentionally
technology-agnostic — the point right now is *learning*, so nothing here commits
to a particular stack.

---

## The Big Idea

Most hobby resources are one-dimensional: a list, a wiki, a forum. The Hobbyist
adds a **second dimension** — turning hobbies into something you can *explore*,
*measure*, *progress through*, and *share*.

Three pillars:

1. **Discover** — a rich, browsable catalog of hobbies with graphics, cost
   ranges, local popularity, descriptions, and curated ways to get started.
2. **Progress** — gamify each hobby with levels and badges you earn (and can
   verify), so picking up a new skill feels like a game.
3. **Connect** — a personal hobby profile, plus social discovery to find people
   near you (or friends-of-friends) who do the same things.

### Two engines drive the sash *(north star)*

Progress runs on **two complementary engines** — this is the core loop of the
product, and the two resolve the tension between "effortless" and "engaging":

1. **Passive mirror — set-and-forget.** The sash *assembles itself* from your
   real activity on connected platforms (see *Auto-Sync*). This is the
   **"who I am"** layer: it grows and updates on its own with near-zero upkeep.
   The ideal here is genuinely automatic sync.
2. **Quests — active, opt-in.** **Daily / weekly / monthly challenges** you
   complete to level up, earn pips, keep streaks, and unlock new patches. This
   is the **"what I'm doing right now"** layer — the engagement and retention
   loop that brings you back.

Why two engines instead of one: the passive layer wants set-and-forget (silent
background sync), while quests are inherently *user-present* — you're actively
doing the challenge — so the no-store "check me in" moment fits there naturally
rather than as a compromise. Each automation model lives on the layer where it
belongs.

Quests also cover auto-sync's blind spots: a hobby with **no clean data source**
(Ultimate results, a brand-new hobby, day-one cold start) can still level up
through quests, so quests double as an engaging *manual data path* for the
sources auto-sync can't reach.

---

## Feature Ideas

### Discover — the hobby catalog

For each hobby, show:

- **Category graphics** indicating where the hobby falls on axes such as:
  - Intellectual ↔ physical
  - Casual ↔ extreme
- **Cost** — a range from casual to professional: how much to get started.
- **Scene** — popularity in your area; a heat map of where it's most popular.
- **How to get started** — packages or recommendations for first steps.
  - Possibly *sell* starter packages — e.g. for surfing, a lesson + 5 free
    wetsuit/board rentals.
- **Description** of the hobby.
- **First-person stories** from someone who does it really well: how they got
  into it and what it takes to excel.
- **Learning resources** — links to good tutorials, YouTube videos, courses.

### Progress — gamification

- **Levels** in each hobby, advanced by accomplishing fixed goals.
- **Badges** the user can earn, for example:
  - First time standing up on a surfboard
  - First time juggling 5 balls
- **Verifiable badges** — link or upload proof (photos, YouTube, social,
  in-app upload, GoPro app, etc.).

#### Levels & Missions

Make progressing in a hobby feel like a game with a clear path forward.

- **Level up** — each hobby has tiers (e.g. Novice → Apprentice → Skilled →
  Expert → Master). You climb by completing goals, earning badges, and — where
  it fits — improving on an AI-coached video score.
- **Suggested missions** — instead of leaving "get better" vague, the app hands
  you concrete next steps sized to your current level:
  - *Guitar, Novice:* "Play a clean G–C–D chord change 10 times in a row."
  - *Climbing, Apprentice:* "Send your first outdoor 5.8."
  - *3D Printing, Skilled:* "Print a multi-part model with moving joints."
  - *Birding, Novice:* "Log 10 different species on eBird."
  - *Geocaching, Novice:* "Find your first 5 caches."
- **AI-generated missions** — for any hobby (or any level) that doesn't have
  hand-authored missions, generate a sensible ladder of them automatically,
  personalized to the user's gear, budget, and location.
- **Mission → badge → level** — completing a mission earns a badge; enough
  badges unlock the next level. This is the loop that keeps people coming back.
- **Ties into AI video coaching** — a mission can be "get an AI coaching score
  above X on your swing," making progress measurable, not just self-reported.

#### Quests — daily / weekly / monthly *(active engine)*

Where auto-sync is the passive mirror, **quests are the active engine** —
time-boxed challenges that give the sash a heartbeat and a reason to come back.
They're the recurring, gamified layer on top of the one-time "missions" ladder.

- **Cadence tiers** — challenges refresh on a rhythm, each with a different
  weight:
  - **Daily** — small, streak-building ("Practice one scale," "Log a bird,"
    "Do a 15-minute session"). Low effort, keeps the habit alive.
  - **Weekly** — meaningful progress ("Birded 5 different days," "Finished a
    knitting section," "Uploaded a practice video"). The main XP driver.
  - **Monthly** — big milestones or **limited-time / seasonal patches**
    ("Attend a tournament," "Complete a project," "Hit a personal best"). The
    collectible hook — a patch you can *only* earn that month.
- **Feeds the same progression** — completing a quest earns pips/badges toward
  the *same* levels as passive activity, so both engines advance one bar. (A
  separate streak/seasonal track can layer on for flavor.)
- **Covers no-API hobbies** — a quest is a legitimate way to level up a hobby no
  platform tracks, so Ultimate, a new hobby, and a cold-start sash all have a
  path forward without waiting on a connector.
- **Streaks & momentum** — daily streaks and "don't break the chain" mechanics
  make the sash feel alive between passive syncs.

**Open design questions** (not yet decided — worth resolving as we build):

- **Quest source** — app-authored (curated per hobby), community-submitted, or
  **auto-generated from your data** ("you birded 4 days last week — hit 5 for a
  bonus")? Likely a mix, with AI generating the long tail (mirrors
  *AI-generated missions* above).
- **Verification** — auto-verified from a connected source (birded 5 days = eBird
  confirms), self-attested (honor system), or evidence-based (photo/video, ties
  into badge proof + AI video coaching)? Verification method probably scales
  with reward size.
- **Reward shape** — quests fill the same level pips as passive activity, or a
  parallel track (streaks, seasonal-only patches, limited-time badges)?
- **Missed quests** — do streaks punish a miss, or is it purely additive and
  encouraging? (Ties to the "never discourage a beginner" principle.)

### Connect — the social layer

- **Hobby profile** showing what a person likes doing.
- **Social discovery** — find friends (or friends-of-friends) who share a hobby,
  or even the same equipment.
- **Find partners** for a hobby who are at a similar level.
- Promote relevant deals/offers matching a user's interests.

### Extra / "someday" ideas

- **Map with fog of war** — reveal hobbies/areas as you explore them.
- **Life list** — things you want to try at least once.
- **Selling used gear** for hobbies.
- **Expert opinions** on the best way to start new things.
- **Hobby of the Week** (like a Wikipedia "article of the day").
- **Best video** of someone doing a hobby wins a prize.
- **Incentivize expert involvement** — experts should *want* others to love
  what they love.

---

## Beyond the App

### VLOG / BLOG — "Master of None"

A promotional companion series: try a new hobby (maybe once a week) and share
what it's like to attempt something for the first time.

- Talk to experts in each field (board-game designers, professional surfers…).
- **The challenge:** reach the "level 3 badge" for each hobby — e.g. do a
  stand-up set, release an app on the App Store, play a song on guitar.
- End each episode with a **Success / Fail**.

### Convention (future)

A "try new things" event — a bunch of beginner classes across many hobbies.

### Marketing & revenue ideas

- Buy a **patch/pin** once you reach a certain level.
- **Advertising** revenue from relevant companies.
- **Promotion** deals from Groupon-type companies.
- **Ads.**
- A **membership** that lets people go try new things.

---

## Copy & Blurbs

Voice/tone samples collected for the site:

> **You have too much time on your hands.**
> Hobbies are about more than just passing the time. We at Hobbyist see hobbies
> as integral to a happy and healthy life. Educating oneself in a new hobby
> encourages lifelong learning and promotes higher self-esteem *(cite a study)*.
> Novel experiences help maintain brain health *(cite a study)* and improve
> cognitive ability *(cite another study)*. So, get out there and learn a new
> skill today.

> **Are you a hobby master?**
> Getting others involved in your hobby will grow your community and help sustain
> its future! Use Hobbyist to spread the word about what you love and get more
> people involved.

---

## The Signature Visual — the "Hobby Badge Cloud"

The most **shareable** thing about a profile should be a single image that
instantly says *who you are through your hobbies* — not a list, a picture. The
whole thing should be **one designed object with your name on it** (like a
Spotify Wrapped card or a Strava year-in-sport), using real illustration, so
people *want* to generate and post theirs.

> **Design lesson learned early:** a cluster of colored circles with emoji reads
> as a *chart*, not an identity. Emoji carry no craft or ownership. The visual
> has to feel *designed* — a crest, a collection, a poster — to earn a share.

### Chosen direction — The Patch Sash / Pin Board

Your hobbies as a **collection of embroidered scout patches on a sash** (or
enamel pins on a denim jacket) — the literal "merit badge collection" done for
real, with texture and craft.

- Each hobby is an **illustrated patch**: a distinctive emblem, not an emoji,
  with stitched borders, a category color, and a merit-badge silhouette.
  *(Implementation: the sash is **art-agnostic** via `app/src/components/art.ts` —
  each hobby resolves to an `ArtDescriptor` through a fallback chain: a
  registered badge image (`public/badges/*.svg`) → the hand-drawn inline emblem
  → the emoji icon → a star. Finished art drops in with one `registerArt()`
  line and no renderer change; `Birding` and `Ultimate` already ship real
  full-color image badges as proof.)*
- **Size / prominence = importance** — your signature hobbies get bigger,
  more-detailed patches placed front and center; dabbles are small pins.
- **Level shows on the patch** — stars, a rank ring, or chevrons on the patch
  edge encode how far you've progressed.
- **The whole sash is the object** — a framed collectible with your **name and
  an archetype** ("The Maker", "The Explorer") on a banner, made to export as
  one clean shareable card.
- **Collectible feel** — earning a new patch (a new hobby, a level-up) is a
  reward; the sash filling up is the long-game hook.

### Other directions considered (revisit later)

- **A · The Crest** — a single heraldic shield divided into segments, one per
  top hobby (biggest at center), line-art icons, a banner with your name and
  archetype. Reads as a coat of arms; instantly a profile picture.
- **B · The Constellation** — hobbies as stars on a night sky, connected into a
  personal constellation; brighter/bigger stars = more important. Poetic and
  premium; an animated twinkle sells it. "This is my sky."
- **D · The Wrapped Card** — a bold Spotify-Wrapped-style poster: big type,
  punchy gradient, top hobbies ranked with playful stats ("You're in your
  3D-printing era"). Built for stories/social; the most viral, least "chart".

Any of these could become an alternate export *style* for the same underlying
data (name + weighted, leveled hobbies), so a user could pick the look they
want to share.

### What makes it work (applies to any direction)

- **Weight is obvious** — importance drives size / prominence / placement.
- **Real illustration, not emoji** — a distinctive style is what earns a share.
- **One object with your name on it** — a card/crest/sash, not floating parts.
- **Made to share** — exports as a single clean PNG/SVG for social or a profile
  header. A "hobby fingerprint."
- **Interactive on the web** — hover/tap for the hobby, your level, and a link
  to its page; static export for sharing.

> This visual is effectively the app's logo-that-is-also-your-profile: every
> user's is unique, and seeing someone else's is an invitation to compare.

### Gauging importance (patch size)

A patch's **size = how important that hobby is** in the user's life, so how we
capture "importance" is a core mechanic — the two axes are deliberately
separate: **size = passion/importance**, **level = skill**.

**Decision:** the primary source is **auto-sync from external platforms** (see
*Auto-Sync* below) — the sash should build itself with minimal manual input.
Explicit entry is the **cold-start fallback and override**, not the main path.

- **Primary (auto):** importance is computed from real activity pulled from the
  services you already use (Strava volume, eBird sightings, Ravelry projects,
  YouTube uploads, Ultimate event history, etc.). Heavy activity grows a patch;
  dormancy shrinks it. See the *Auto-Sync* section for how connections work.
- **Fallback (explicit):** before anything is connected — or for a hobby no
  platform tracks — the user sets importance directly via a slider or by ranking
  hobbies. This keeps a brand-new sash usable on day one.
- **Override always available:** whatever activity computes, the user can pin or
  adjust any hobby's size/level by hand.

Store `importance` as a value that can be user-set **or** computed, so the same
field serves both paths.

Approaches considered:

- **Explicit rating (1–10 slider)** — simple, but people rate poorly in
  isolation.
- **Relative ranking** — "pick your top 3", or a few pairwise "which matters
  more, A or B?" comparisons, then derive weights. People compare far better
  than they score; good for onboarding.
- **Activity-inferred** — the magical, self-updating option; needs usage data.
- **Hybrid** — seed explicitly at signup, let activity adjust over time. The
  likely long-term answer.

Implementation note: to make the size difference read strongly, the visual sizes
each patch by **importance squared** (radius ∝ importance), so a signature hobby
looks dramatically bigger than a dabble.

---

## AI-Generated Content

Now that AI is broadly capable, it can generate and personalize much of the
catalog and coaching content that would otherwise be hand-authored:

- **Auto-generate hobby descriptions**, "how to get started" guides, and
  cost/gear breakdowns for any hobby — so the catalog can cover the long tail,
  not just popular hobbies.
- **Personalized starter plans** — given your budget, location, and current
  skills, generate a tailored first-month plan for a new hobby.
- **Level & badge suggestions** — propose sensible progression tiers and
  milestone badges for a hobby that doesn't have them defined yet.
- **"What should I try?" recommender** — suggest new hobbies from your existing
  interests, personality, and the fog-of-war map of what you haven't explored.
- **Learning-resource curation** — surface and summarize the best tutorials,
  videos, and communities for a hobby.
- **Content for the VLOG/blog** — draft episode outlines, expert-interview
  questions, and social captions for the "Master of None" series.
- **Verify badge proof** — use vision models to help confirm an uploaded photo
  or video plausibly shows the claimed achievement.
- **Generate badge art** — produce the merit-badge icon/art for a hobby that
  doesn't have custom artwork yet, keeping a consistent style.

> Principle: AI fills and personalizes the catalog at scale; humans (experts,
> the community) still provide the authentic stories and verification.

---

## AI Video Coaching *(flagship business idea)*

**Upload a video of yourself doing a hobby, and get AI-generated coaching on how
to improve.** This is the standout product idea — a real, chargeable service, not
just a feature.

How it works:

1. **Record & upload** a clip — a golf swing, a guitar riff, a climbing route, a
   juggling attempt, a 3D-print time-lapse, a stand-up set.
2. **AI analyzes** the video against what "good" looks like for that hobby
   (technique, form, timing, tempo, common beginner mistakes).
3. **Get actionable feedback** — specific, prioritized tips ("your elbow drops on
   the downswing", "you're rushing the chorus", "shift your weight onto your
   right foot before the reach"), ideally with timestamps and annotated frames.
4. **Track improvement over time** — compare a new clip to an old one and show
   measurable progress; feed it back into the level/badge system.

Why it's compelling:

- **Coaching is expensive and local; this is cheap and on-demand.** A beginner
  who'd never hire a coach gets a coach-like second opinion instantly.
- **It ties everything together** — a coaching clip is also badge-proof, also
  progress tracking, also content for the VLOG.
- **Clear monetization** — pay per analysis, a coaching subscription, or a
  freemium tier (basic tips free, detailed breakdown paid).

Design & product questions to work through:

- **Per-hobby rubrics** — each hobby needs a "what good looks like" definition.
  Start with a few hobbies where feedback is visual and well-understood (golf
  swing, guitar posture, climbing movement) rather than trying to cover
  everything at once.
- **Human-in-the-loop** — let real experts review/approve AI feedback, or offer a
  paid "escalate to a human coach" upgrade for the hard cases.
- **Trust & tone** — feedback must be encouraging, not discouraging; a beginner
  bailing after harsh notes is the failure mode to avoid.
- **Privacy** — people are uploading videos of themselves; be explicit about
  what's stored, who sees it, and let clips stay private by default.

---

## Auto-Sync — the sash builds itself *(core vision)*

**The Hobbyist should require almost no manual updating.** Instead of you
telling it what you do and how much, it **pulls your activity from the platforms
that are already tracking it** — so your sash, your levels, and your importance
weights stay current on their own.

You already leave a trail across hobby-specific services. Connect them once, and
the sash reflects real life:

- **Ultimate** → tournament/roster history from governing bodies and event
  sites (e.g. **USAU**, **WFDF**, **WMUCC/WUCC** event pages, league sites).
- **Knitting** → projects, patterns, and finished objects from **Ravelry**.
- **Birding** → life list and recent sightings from **eBird**.
- **Running / cycling / hiking** → activity and volume from **Strava**.
- **Climbing** → logged routes/grades from **theCrag** / Mountain Project.
- **Geocaching** → finds and hides from **Geocaching.com**.
- **Board games** → collection and plays from **BoardGameGeek**.
- **Video making / any hobby you post** → your **YouTube** uploads (count,
  views, cadence) as evidence of activity and level.
- **Music** → practice/performance logs, setlists, uploads.

**How each connection can work (varies by platform):**

- **Official API + OAuth** where one exists (Strava, YouTube, eBird via its API,
  BoardGameGeek's XML API) — the clean path.
- **Data export / feeds** (many sites offer CSV/RSS/profile exports).
- **User-authorized scraping** of a public profile page where there's no API
  (some event/results sites) — last resort, brittle, and must respect terms of
  service.
- **Manual/import fallback** for anything not connected — never a hard blocker.

**What the synced signals feed:**

- **Importance (patch size)** — volume and recency of real activity drive how
  big a hobby's patch is, automatically. Heavy Strava months → cycling grows;
  a dormant hobby quietly shrinks.
- **Level & badges** — achievements map to levels (a logged 5.10 lead, a
  completed sweater, a 100-species year, a published video).
- **Freshness** — "last active" per hobby, so the sash shows what's alive now.

**Design principles:**

- **Connect-once, then passive** — the whole point is low upkeep.
- **User owns the mapping** — they approve each connection and can override any
  auto-derived size/level (auto-seed, human final say).
- **Privacy first** — explicit consent per source; pull only what's needed;
  let a hobby or a whole source stay private and off the shared sash.
- **Graceful cold start** — with nothing connected, fall back to the explicit
  slider/ranking so a new sash still works on day one.
- **Normalization is the hard part** — every platform measures differently
  (finds vs. projects vs. kudos vs. views); each source needs an adapter that
  maps its metrics onto the common activity/level model.

> This is what makes the sash feel *alive* rather than a form you filled in
> once: it's a real-time portrait assembled from what you actually do.

### Connector automation spectrum

The goal is **automatic, even the "download" step** — but different platforms
allow different levels of automation. There is no single mechanism; instead each
source gets a **connector** using the best automation *that source permits*, and
all connectors feed the same normalized activity model. The app is transparent
about which sources are live-auto vs. which need an occasional nudge.

From cleanest to most brittle:

1. **Official API + OAuth — fully automatic, sanctioned.** Connect once, a
   backend refreshes on a schedule. The gold standard. *(Strava, YouTube,
   Ravelry; Google Takeout even supports scheduled exports.)*
2. **Email-ingest of the platform's own export — automatic and safe.** Many
   sites email you a data export link (eBird's "Download My Data" does). The
   user connects a read-only inbox or forwards to a dedicated address; the
   backend watches for the export email and imports the file automatically.
   Rides the platform's *own* sanctioned export, so no password storage.
3. **Browser extension — automatic while the user is logged in.** The user
   installs an extension that reads/exports their data using *their own* live
   session in *their own* browser. No server-side credential storage.
4. **Headless-browser auto-login ("a robot that logs in as you").** A
   server-side browser signs in with stored credentials, clicks export,
   downloads, imports — on a schedule. Genuinely automatic, but carries real
   costs: **storing the user's password** (a serious security/trust burden),
   **breaks whenever the site changes HTML or adds CAPTCHA/2FA**, and is
   **usually against the site's Terms of Service**. A maintenance treadmill;
   last resort. *(This is what bank aggregators did pre-open-banking.)*
5. **Scheduled scrape of a public profile/results page.** Poll a public page on
   a schedule. Only public data, still brittle and ToS-sensitive. Often the
   *only* option for no-API sources like tournament results.
6. **Manual / assisted entry — the universal fallback.** The user enters it, or
   AI parses a pasted screenshot/file. Never a hard blocker.

**The honest reality:** you can't make *every* source automatic the same way.
"Automatic even for the download" is fully solved for API sources (1), safely
solved for export-by-email sources (2–3), and only *best-effort* for no-API
sources (4–5) where it's brittle and/or ToS-sensitive.

**Per-source mapping (the sources in this doc):**

| Source | Best automatic path | Notes |
|---|---|---|
| Strava | 1 · API + OAuth | live, clean |
| YouTube | 1 · API | uploads/views |
| Ravelry | 1 · API + OAuth | projects |
| eBird | 2 · email-ingest of "Download My Data" | no personal API; API is region-only |
| Ultimate (WFDF/USAU/WMUCC) | 5 · scheduled public-results scrape | no API, no personal export — brittle |

**Design stance:** build one connector at a time, always via the cleanest
mechanism the source allows; never store a password when an API or email-export
path exists; be transparent in-app about each source's freshness and method;
degrade gracefully to manual.

**Implementation (prototype):** the spectrum is now backed by a real connector
registry — `app/src/integrations/registry.ts` defines the `Connector` shape
(id, hobby, automation `level`, `connect` method, `status`, and a pure
`normalize` step) and the `AUTOMATION_META` table that gives each level its
honest label (set-and-forget? stores a credential?). `app/src/integrations/connectors.ts`
registers the built-ins: eBird CSV (live, manual→email), eBird region API
(live, api), YouTube uploads (planned, api) and Ultimate results (planned,
scrape). The **Connectors** panel in the app enumerates the registry and renders
each source with its spectrum badge — new sources plug in by registering a
connector, with no UI special-casing.

---

## Integrations & Marketplaces

The Hobbyist doesn't need to own commerce or community — it can **connect** to
where those already happen, and be the layer that gets you *started*.

- **Specialty hobby sites & communities** — deep links and data from the
  established platforms per hobby (theCrag, BoardGameGeek, eBird, Ravelry,
  Geocaching.com, Strava, etc.), so a hobby page routes you to the real hub.
- **Second-hand & local buying** — surface listings for the gear you need to
  start, from:
  - **Facebook Marketplace**
  - **Buy Nothing** groups (free/local, low-barrier entry)
  - Craigslist / OfferUp and hobby-specific used-gear marketplaces
- **Experiences & entry deals** — link to intro classes, lessons, and day-passes
  via **Groupon**-type services, so "try it once" is one click and one cheap
  ticket away.
- **New-gear retailers** — recommended stores and affiliate links for the
  starter package when someone's ready to commit.
- **Events & meetups** — pull local events for a hobby (Meetup, event APIs) to
  feed the "scene" / heat-map view.

> The through-line: reduce the friction of *starting*. Whatever you need to try
> a hobby — cheap gear, a first lesson, local people — The Hobbyist points you
> straight at it.

---

## Data Model (from the catalog)

The hobby spreadsheet suggests the shape of a hobby record. Each hobby can carry:

| Field | Meaning |
|---|---|
| **Hobby** | Name |
| **How to get started** | First-step guidance |
| **Community** | Link to a community site (e.g. theCrag, BoardGameGeek, eBird) |
| **Recommended Stores** | Where to buy gear |
| **Apps** | Related apps (e.g. BirdsEye, Geocaching) |
| **Packages** | Starter bundles / offers |
| **Description** | About the hobby |
| **Badges** | Milestones (e.g. "Led my first sport climb") |
| **People I know** | Social connections who do it |
| **Levels** | Progression tiers *(some hobbies may need breaking down further)* |

### Example hobby catalog (seed ideas)

A large, informal list of candidate hobbies to seed the catalog, grouped loosely:

- **Climbing** — community: theCrag; badges: *Led my first sport climb*,
  *Led my first trad climb*
- **Board Games** — community: BoardGameGeek
- **Birding** — community: eBird; app: BirdsEye
- **Geocaching** — community: Geocaching.com; app: Geocaching
- **Knitting / Sewing** — community: Ravelry
- **Video Games** — *(candidate to break down into sub-hobbies)*

Other hobbies noted: Skiing, Ultimate Frisbee, Dodgeball, Softball, Making Video
Games, Making Apps, Programming, Stand Up Paddleboarding, Painting, Drawing,
Karate, Swing Dancing, Surfing, Playing Guitar, Playing Piano, Fishing,
Horseback Riding, Car Racing, Dirt Biking, Mountain Biking, Skydiving, Bungee
Jumping, Sailing, Speed Cubing, Cup Stacking, Magic, Glassblowing, Archery,
Blacksmithing, Miniature Painting, Blogging, Making Videos, Canyoning,
Spelunking, Stamp Collecting, Writing, Stand-Up Comedy, Bowling, Hiking, RC
Flying, Piloting, Memorization, Geography, Exercise, Dragonboating, Darts,
Starting a Website, RPGs, Slacklining, Wingsuit Flying, Backpacking, Cooking,
Medieval Warrior, Skateboarding.

---

## Screens (from the build plan)

The Trello board sketched the initial pages/components to build:

- **Profile Page** — a user's hobby profile.
- **Hobbies Page** — the browsable list of hobbies.
- **Hobby Page** — a single hobby, composed of:
  - **Level** component
  - **Link** component
  - **Blurb** section
- **Skill Grid** — a visual grid of skills/hobbies (icons, JSON-driven data).
- **Screen mockups** — design before building.

Other build notes from the board: choose a name, design a logo, register a
domain, market research, and a business plan (early startup framing).

---

## Sources

The ideas above were gathered from:

- **Trello board** — *The Hobbyist* (build plan, screens, components)
- **Slide deck** — *The Hobbyist: Add that second dimension* (vision, feature,
  promotional, marketing, and monetization ideas; blurbs)
- **Spreadsheet** — hobby catalog with the field structure and seed hobby list

---

## Status & Stack

This is a **learning repo**. We're starting simple and adding complexity only
when a feature needs it.

**Chosen starting stack (learning-friendly):**

- **Frontend:** [Vite](https://vitejs.dev/) + **React** + **TypeScript** — fast
  dev server, component-based, the current mainstream for learning modern web.
- **The signature visual:** rendered as **SVG** (a circle-packing bubble
  cluster) so it's crisp at any size and exports cleanly to a shareable image.
- **Data:** plain **JSON** seed files for the hobby catalog and a sample
  profile — no database yet. A real backend/DB (e.g. Express + a datastore)
  comes later, once data needs to persist.

Everything above the stack line is deliberately implementation-agnostic; the
stack is just where we're *starting* so we can see ideas working.

### Getting started

```bash
cd app
npm install
npm run dev
```

Then open the printed local URL to see the **Hobby Badge Cloud** prototype.

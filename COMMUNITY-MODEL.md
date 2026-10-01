# Hobby communities & admins — design

Direction from Michael: **each hobby is a community with admin(s)**, Reddit-style,
and the thing admins do is author the **levels, missions, and badges** that let a
hobby be rich. Combined with the catalog finding — ~40 of ~45 real hobbies have
*no* data connector and live on human-authored milestones — this is the pillar
that makes the long tail work.

This doc designs: the **roles**, the **authoring** of levels/missions/badges, and
the **governance** that keeps it from rotting (the Reddit failure modes).

---

## 0. The one insight that makes this cheap

The progression machinery **already exists** and is already pure + tested — it is
just hardcoded in the source instead of community-owned:

| Concept | Lives in code as | Who authors it today | Who should author it |
|---|---|---|---|
| **Levels** | `LEVELS` const (`Novice…Master`) + `LEVEL_XP_THRESHOLDS` | developer | hobby admin |
| **Missions** | `Mission` on `ProfileHobby` + `sampleQuests` | developer | hobby admin |
| **Quests** (daily/weekly/monthly XP) | `Quest` + `sampleQuests.ts` | developer | hobby admin |
| **Badges / Medals** | `MEDALS_BY_HOBBY` const + `medalProgress()` | developer | hobby admin |

So the design is **not** "invent levels and missions." It is: **lift these four
hardcoded catalogs into a community-owned, admin-editable `HobbyDefinition`** and
decide who may edit it. The engines (`hobbyXp`, `levelFromXp`, `medalProgress`)
do not change at all — they consume a definition instead of a const.

---

## 1. The core object: `HobbyDefinition`

A hobby stops being a string and a hardcoded medal list. It becomes a
**community-owned definition** that admins edit and members adopt:

```ts
interface HobbyDefinition {
  slug: string                 // 'climbing' — stable id
  name: string                 // 'Climbing'
  category: HobbyCategory
  emblem: string               // inline-svg key or emoji
  description: string          // what this hobby is / how to get started
  // --- the authored progression (today's hardcoded catalogs, now owned) ---
  levels: LevelDef[]           // the ladder: name + XP threshold per rung
  missions: MissionDef[]       // suggested next steps, tagged by level
  quests: QuestDef[]           // daily/weekly/monthly XP challenges
  badges: BadgeDef[]           // data-pulled medals AND admin-authored milestones
  // --- community metadata ---
  admins: UserId[]             // ordered; admins[0] = owner
  memberCount: number
  connectors?: ConnectorRef[]  // optional data sources (eBird, Untappd…)
  version: number              // bumped on every published edit
  status: 'draft' | 'published'
}
```

A member's `ProfileHobby` then references a definition + their own progress
(`metricCounts`, quest completions, declared-badge claims) — exactly today's
shape, just pointing at a shared definition instead of a baked-in const.

### Two badge kinds (the catalog's key finding, encoded)

```ts
type BadgeDef =
  | { kind: 'metric'; id; name; unit; metricKey; tiers: MedalTier[] }   // data-pulled (eBird species)
  | { kind: 'milestone'; id; name; how; claim: 'self' | 'peer' | 'admin' } // human-authored ("Led my first trad climb")
```

`metric` badges are exactly today's `Medal` — the connector feeds `metricKey`.
`milestone` badges are new and serve the ~40 connector-less hobbies: a human
declares them done. The `claim` field is the trust dial (see §4).

---

## 2. Roles

Four roles, each a strict superset of the one below. Deliberately few — Reddit's
pain is role sprawl and absent owners.

| Role | Can | Cannot |
|---|---|---|
| **Owner** (`admins[0]`) | everything a Mod can + appoint/remove mods, transfer or abdicate ownership, archive the hobby | — |
| **Mod** (admin) | edit the `HobbyDefinition` (levels, missions, quests, badges, description, connectors); approve `peer`/`admin` badge claims; publish a new `version` | change ownership, delete the hobby |
| **Member** | adopt the hobby (declare the patch), complete quests, claim `self` badges, request `peer` verification, propose edits | edit the definition |
| **Visitor** | view the public hobby page + leaderboard | adopt or edit |

- **Owner is single and explicit** (`admins[0]`), so there is always exactly one
  accountable party — the fix for Reddit's "who even runs this sub" rot.
- **A member who declares a brand-new hobby becomes its Owner** by default
  (first-declarer homesteading) — see governance §5 for the abandonment path.

---

## 3. Authoring: levels, missions, badges

The admin editing surface maps 1:1 onto the four existing engines. Nothing here
needs new math.

### Levels — edit the ladder
Today `LEVELS` is a fixed 5-rung const shared by every hobby. Admin-authored
levels let a hobby name its own ladder ("Belayer → Leader → Trad Leader") and set
its own XP thresholds (`LEVEL_XP_THRESHOLDS` becomes per-definition). `levelFromXp`
consumes the definition's thresholds unchanged.

### Missions — the "what do I do next" list
`Mission { text, level }` already exists. The admin writes the suggested steps per
level — this is the **"How to get started"** column from Michael's sheet made
first-class. For a connector-less hobby this is the entire progression spine.

### Badges — both kinds
- **Metric badges**: admin sets `name/unit/metricKey/tiers` — exactly authoring a
  `Medal` today, but the admin picks thresholds that mean something in-domain.
- **Milestone badges**: admin writes `name` + `how` + the `claim` trust level.
  This is the sheet's literal badge list ("Led my first sport climb") turned into
  claimable achievements with **zero connector required**.

### Quests — the XP drip
Admin authors daily/weekly/monthly quests (`sampleQuests` becomes definition
data). XP stays cadence-derived (`CADENCE_XP`), so reward shape is consistent
across hobbies and admins can't inflate XP arbitrarily (a guardrail: cadence
picks the XP, admin picks only the text + cadence).

---

## 4. The trust problem: how a milestone badge is earned honestly

Data-pulled badges are self-proving (the count came from eBird). Milestone badges
are self-reported, which invites inflation — the thing that would make the whole
collection feel fake. The `claim` field is the dial, chosen **per badge by the
admin** to match how checkable the milestone is:

| `claim` | Earned when | Use for |
|---|---|---|
| `self` | member taps "I did this" | low-stakes, unfalsifiable-anyway ("Practiced 10 min") |
| `peer` | another member vouches | social, checkable ("Led a trad climb" — your partner saw it) |
| `admin` | a mod approves the claim | prestige / gatekept ("Certified instructor") |

This mirrors how real hobby communities already confer status (your climbing
partner witnessed the lead; the dojo awards the belt). It also makes **"People I
know"** from the sheet load-bearing: peers are the verification graph, not just
flavor.

**ADHD-market guardrail:** default new milestone badges to `self`. Friction kills
this market; make earning *easy and frequent*, reserve `peer`/`admin` for the few
badges where prestige is the point. The dopamine is in *claiming*, not in a
verification queue.

---

## 5. Governance — the Reddit failure modes, pre-empted

The point of naming this now is that communities rot in known ways. Each gets a
designed answer:

1. **Absent/squatting owner.** A hobby whose owner is inactive N days and has
   pending edits/claims enters **"adoptable"** — any active mod (or, if none, any
   member) can petition to take ownership. No dormant squatter can freeze a hobby.
2. **Bad admin edits.** Every publish bumps `version` and is **non-destructive** —
   member progress references the version it was earned under, so an admin cannot
   retroactively revoke everyone's Gold by lowering a threshold. Definitions are
   append-forward; a member's earned badges are theirs.
3. **Duplicate/competing hobbies** ("Climbing" vs "Rock Climbing"). Slugs are
   unique; a **merge-request** flow lets owners fold one into another, migrating
   members. Discovery shows member count so the canonical one wins naturally.
4. **Vandalism / spam claims.** `peer`/`admin` badges gate it; `self` badges are
   cosmetic-only on *your* patch and never affect a leaderboard, so inflating them
   hurts no one but your own honesty.
5. **Governance of the authored content itself.** A member can **propose an edit**
   (new mission, new badge); mods accept/reject. This is the pressure-release
   valve so a hobby improves without the owner being a bottleneck — and the
   recruiting path for new mods (good proposers get promoted).

---

## 6. Honest scope — what this costs

This is the platform commitment flagged in `CONNECTORS.md`, stated plainly:

- **Needs a backend.** Accounts, identity, roles, shared `HobbyDefinition`
  storage, the claim/verification flow, moderation. The current static SPA has no
  server — this is the line between "personal badge toy" and "platform."
- **Needs moderation tooling** eventually (report, review queue) — the Reddit tax.
- **But the client-side engines are done.** `medalProgress`, `hobbyXp`,
  `levelFromXp`, the sash, the patches — all already pure and consume a definition
  with no rewrite. The backend's job is to *store and serve* definitions and
  mediate claims; the fun part already runs.

### Suggested sequencing (cheapest real value first)
1. **Lift the hardcoded catalogs into `HobbyDefinition` objects, still local.**
   No backend yet — just prove the app renders from a definition, not a const, and
   that an admin-less single user can edit their own hobby's levels/missions/
   badges. This is pure client work and de-risks the whole model.
2. **Add `milestone` badges with `claim: 'self'`.** Unlocks the ~40 connector-less
   hobbies immediately, single-player, no backend. Highest thesis payoff per unit
   effort.
3. **Then the backend**: shared definitions, real admins, peer/admin claims,
   governance — the social layer, once the single-player definition model is
   proven to feel good.

---

## 7. Open decisions (need Michael)

1. **Who becomes an admin of a hobby that already exists in the seed catalog**
   (Birding, Climbing)? Pre-assign Michael as owner, or leave them owner-less /
   system-curated until a human adopts them?
2. **Is step 1 (local definitions, single-player authoring) the next build**, or
   do we go straight for the social backend? Step 1 is cheap and reversible; the
   backend is the big commitment.
3. **Leaderboards per hobby?** They make metric badges competitive (great for the
   collector), but add a comparison axis that can feel like pressure for the
   abandon-friendly ADHD market. In or out of v1 of the community layer?

---

## §7 — AI badge-art generator (next big build)

**The ask:** a good AI image generator, in a chosen house style, that mints the
badge/patch artwork for a hobby *and* for individual accomplishments (medals,
milestones) within it. This is the piece that turns the collection from "a
number in a frame" into a genuinely desirable, show-it-off artifact — directly
on-thesis for the ADHD collector-learner (novel art per new patch = the dopamine
hit; a distinct earned-medal illustration = a trophy worth screenshotting).

### Why the codebase is already shaped for this
The art pipeline (`components/art.ts`) is **art-agnostic by design** — it was
built as the seam for exactly this. `resolveArt(hobby, icon)` walks a fallback
chain and returns a tagged `ArtDescriptor`; the sash renderer paints whatever it
gets. So an AI generator does not touch the renderer at all — it only needs to:
1. produce art for a hobby/accomplishment, then
2. call `registerInlineArt(name, svg)` (preferred — renders live AND survives
   the SVG→canvas→PNG export, and has no base-path dependency) or
   `registerArt(name, href)` for a hosted raster.

Persisted home: `HobbyDefinition.emblem` already exists (currently an emoji or
inline-svg key). Generated art should be stored against the definition (and, for
accomplishments, against the `BadgeDef`), so it is community-owned and travels
with the hobby — not a per-session throwaway.

### The hard decisions (fork, to settle before building)
- **House style is the whole product.** The generator is only as good as a
  *consistent, recognizable* style — a sash of 20 patches in 20 different styles
  looks like clip-art, not a collection. Options: (a) a fine-tuned / LoRA model
  pinned to one embroidered-patch look; (b) a heavily-engineered style prompt
  prefix + negative prompt against a general model; (c) a curated SVG motif
  library the model only *composes*. (a) is the strongest identity and the most
  setup; (b) is fastest to try; (c) keeps everything inline-SVG + export-safe.
- **Raster vs. vector.** The pipeline prefers inline SVG (export-safe, base-path
  independent). Most image models emit raster PNGs — which means either hosting
  them (a backend/CDN + the base-path care we already hit once) or vectorizing.
  An SVG-native or SVG-post-processed path keeps the export story clean.
- **Where it runs.** Image models need an API key and a server — this is the
  same backend commitment as the community layer (§6 step 3), plus per-image
  cost. A client-only app cannot hold the key. So this likely lands *with* the
  backend, not before it. Interim: a "generate" button that calls a thin proxy
  endpoint (the same CORS-proxy shape the connectors want).
- **Cost + abuse control.** Generation costs money per image; an admin minting
  art for a community hobby, or a user re-rolling endlessly, needs a quota.
- **Accomplishment art, not just hobby art.** A medal tier (Bronze→Platinum) and
  a milestone ("Led my first trad climb") each want their own illustration, not
  just a recolor — so the generator takes a *subject + tier/context*, and the
  `BadgeDef` grows an optional `art` field alongside `tiers`.

### Smallest honest first step
A **style spike**: pick 2–3 candidate house styles, generate the same 5 hobby
patches in each (Birding, Climbing, 3D Printing, Reading, Drinking), and look at
them *as a sash together* — because consistency across patches, not any single
image, is the thing to judge. No app wiring, no backend yet; just prove a style
is good enough to build the pipeline around. Then wire the winning style through
`registerInlineArt`/`registerArt` and persist to `HobbyDefinition.emblem`.

### §7.1 — POC outcome (2026-10-01, SETTLED)

The style spike ran end to end. Vendor, model, generation recipe, and the tier
ladder are now decided. Nothing below is built in the app yet — this is the
design conclusion the productionization work should implement.

**Vendor & model — proven working.**
- **AWS Bedrock + Stability AI**, region **`us-west-2`**, via the `hobbyist` AWS
  profile (account `564112989632`, user `kiro-crew`).
- **Model: `stability.stable-image-core-v1:1`** (Stable Image Core). It was the
  consistency winner over Stable Image Ultra and SD 3.5 Large — Core reliably
  produces a bordered circular badge; Ultra/SD3.5 drifted between framed and
  borderless, which breaks a sash of many patches.
- One-time **AWS Marketplace subscription** is done (Stability models are
  Marketplace offerings; first invoke per model requires `aws-marketplace:Subscribe`,
  which was granted once). `kiro-crew` can now invoke freely.
- Bedrock Stability does **NOT** emit a transparent alpha channel even when
  prompted (returns RGB, white background). So: no transparent-PNG path — handle
  circular cropping at display time (CSS/SVG circle clip) or via the separate
  remove-background editing model.

**Generation recipe — what made it reliable.**
- **Seed-locked** (`seed` fixed per hobby) keeps the emblem near-identical across
  the four variants of the same tier-family, so only the border changes.
- **Hex-anchored colors + negative prompt** are mandatory. Loose color words
  drift (e.g. "pale platinum" rendered green). Pin an explicit metal/gem name AND
  a hex value, and add a negative prompt excluding the stray colors.
- **Concrete, singular motifs — never the raw hobby name.** Vague/compound
  motifs produce gremlins ("binoculars motif" → binoculars fused to the beak;
  "glowing object" → eye-like blobs). Each hobby needs a curated subject phrase
  (admin-editable), fed into a locked style suffix.

**Tier ladder — DECIDED, two media.** The medium itself changes as you ascend —
cloth → treasure — so a promotion is visible at a glance across the sash.
- **Copper · Silver · Gold** → **embroidered patch** (matte fabric, satin-stitch,
  metal-thread merrowed border). The "earned through doing" climb.
- **Emerald · Ruby · Diamond** → **jeweled enamel medallion** (glossy vitreous
  enamel, polished metal setting, faceted gemstones, high gloss — explicitly NOT
  fabric/stitching). The prestige tiers.
- Rejected along the way: platinum (indistinguishable from silver); gem-studded
  *stitched rims* (jewels fought the stitch edge — confusing); an app-drawn SVG
  tier ring (double-border seam, texture never matched the AI emblem).

**Not built (productionization backlog):**
1. The two StyleRecipes as code (see `badge-style-recipes.md`) — a locked prompt
   template + params per medium/tier.
2. The six-tier model on `HobbyDefinition` / `BadgeDef` (one generated image per
   tier, authored once).
3. The server-side proxy that holds the AWS creds and runs `invoke-model`
   (same backend commitment as §6 step 3 — the browser can't hold the key).
4. The admin "generate a few, pick one" authoring flow.

**Evidence:** spike images under `spike-patches/` (gitignored): `v2/` (clean
emblems), `seedtier2/` (hardened metal tiers), `medium/` (the final stitched-vs-
jewel comparison).

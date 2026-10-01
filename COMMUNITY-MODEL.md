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

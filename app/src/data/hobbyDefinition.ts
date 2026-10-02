// HobbyDefinition — the community-owned, admin-editable definition of a hobby.
//
// See COMMUNITY-MODEL.md §0–§1. The whole point of this file is the "one insight
// that makes this cheap": the four progression catalogs ALREADY EXIST as
// hardcoded developer constants —
//     • levels   → LEVELS + LEVEL_XP_THRESHOLDS   (quests/quests.ts, data/types.ts)
//     • missions → Mission on ProfileHobby         (data/types.ts, sampleProfile.ts)
//     • quests   → sampleQuests                     (quests/sampleQuests.ts)
//     • badges   → MEDALS_BY_HOBBY                  (quests/medals.ts)
// — and the pure engines (medalProgress, hobbyXp, levelFromXp) consume data, not
// the consts directly. So "step 1" is NOT inventing progression; it is LIFTING
// those consts into editable `HobbyDefinition` objects, with the consts kept as
// the authoritative SEED (buildSeedDefinitions composes from them, so there is no
// parallel copy to drift). An admin — for now, the single local user — can then
// edit a definition's levels/missions/badges, and the same engines render it.
//
// This module is PURE: types + a deterministic seed builder + accessors that read
// a definition the way the old consts were read. The editable persisted store is
// definitionStore.ts (mirrors profileStore.ts). No backend yet (§6 sequencing).

import type { HobbyCategory } from './types'
import { LEVELS } from './types'
import {
  MEDALS_BY_HOBBY,
  type Medal,
  type MedalTier,
} from '../quests/medals'
import { sampleQuests } from '../quests/sampleQuests'
import {
  LEVEL_XP_THRESHOLDS,
  CADENCE_XP,
  onceXp,
  type QuestCadence,
  type Quest,
} from '../quests/quests'
import { sampleProfile } from './sampleProfile'

// ---- Authored progression pieces ------------------------------------------

/** One rung of a hobby's level ladder — admin-authored (name + XP to reach). */
export interface LevelDef {
  name: string
  /** Total XP required to REACH this rung (ascending; rung 0 is always 0). */
  xpThreshold: number
}

/**
 * A suggested next step, tagged to a level. DEPRECATED: missions are now
 * modelled as one-time quests (`QuestDef` with `cadence:'once'` + `level`).
 * The type is retained only so definitions persisted before the unification
 * still parse; `buildSeedDefinitions` no longer emits any, and the accessors
 * fold any legacy `missions` into the quest list.
 */
export interface MissionDef {
  text: string
  /** 0-based level index this mission belongs to. */
  level: number
}

/**
 * A challenge that earns XP. Unifies the old mission + quest split:
 *   • recurring — cadence daily/weekly/monthly, repeatable (the engine).
 *   • one-time  — cadence 'once' + a `level`, the per-rung "do this next"
 *                 step that used to be a Mission. Now XP-bearing (onceXp).
 */
export interface QuestDef {
  id: string
  cadence: QuestCadence
  text: string
  /** Required for one-time (`once`) quests: the 0-based level they belong to. */
  level?: number
}

/**
 * Two badge kinds — the catalog's key finding, encoded (COMMUNITY-MODEL §1):
 *   • metric    — today's Medal: a connector feeds `metricKey`, tiers earn by count.
 *   • milestone — NEW: a human-authored achievement with no connector. The `claim`
 *                 field is the trust dial (self / peer / admin), defaulting to self
 *                 so the ~40 connector-less hobbies get rich single-player, today.
 */
export type MilestoneClaim = 'self' | 'peer' | 'admin'

export type BadgeDef =
  | {
      kind: 'metric'
      id: string
      name: string
      unit: string
      metricKey: string
      how: string
      tiers: MedalTier[]
    }
  | {
      kind: 'milestone'
      id: string
      name: string
      how: string
      claim: MilestoneClaim
    }

/**
 * A curated external resource for a hobby — the "where to go to get into this"
 * facet. The AI drafter proposes these; the admin curates them. `kind` drives
 * both the display icon and the ONE special-cased type the product cares about:
 *   • community — the hobby's main discussion board. In practice a subreddit
 *                 (r/<something>); the renderer badges it as the canonical
 *                 "talk to people about this" link, which is why it's a first-
 *                 class kind rather than a plain website.
 *   • app       — a mobile/desktop app worth installing (eBird, Strava…).
 *   • website   — a reference site, wiki, or shop.
 *   • video     — a channel / course / playlist.
 * A resource whose `kind` is 'community' and whose url is a subreddit is the
 * flagship link; connectors (eBird, Strava…) can later bind to an 'app' entry.
 */
export type ResourceKind = 'community' | 'app' | 'website' | 'video'

export interface ResourceLink {
  kind: ResourceKind
  /** Display label, e.g. "r/birding" or "eBird". */
  label: string
  /** Fully-qualified URL. */
  url: string
  /** Optional one-line "why this is useful". */
  note?: string
}

// ---- The definition --------------------------------------------------------

/**
 * A hobby as a community-owned definition rather than a bare string + hardcoded
 * medal list. In step 1 the community metadata (admins, memberCount, version,
 * status) is present but single-user/local — the backend (§6 step 3) will make
 * it shared. `slug` is the stable id; `name` is display.
 */
export interface HobbyDefinition {
  slug: string
  name: string
  category: HobbyCategory
  /** Emoji or inline-svg key shown on the patch. */
  emblem: string
  description: string
  // the authored progression (lifted from the hardcoded catalogs):
  levels: LevelDef[]
  missions: MissionDef[]
  quests: QuestDef[]
  badges: BadgeDef[]
  /**
   * Curated external links (community board, apps, websites, videos). Optional
   * for back-compat: seed definitions and anything persisted before this field
   * existed have none, and `resourcesFromDefinition` defaults it to []. The AI
   * drafter populates it for newly authored hobbies.
   */
  resources?: ResourceLink[]
  // community metadata (local/single-user in step 1):
  admins: string[] // ordered; admins[0] = owner. Empty = unclaimed/system-curated.
  memberCount: number
  version: number
  status: 'draft' | 'published'
}

/** Stable slug from a hobby name: lowercased, non-alphanumerics → hyphens. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ---- Seed builder: compose definitions FROM the hardcoded catalogs ----------
//
// The consts remain the source of truth; this LIFTS them, losslessly, into
// editable objects. Any hobby present in the seed profile, the medal catalog, or
// the quest list gets a definition — the union, so nothing is dropped.

/** The default level ladder, shared today (LEVELS + LEVEL_XP_THRESHOLDS). */
export function defaultLevels(): LevelDef[] {
  return LEVELS.map((name, i) => ({
    name,
    xpThreshold: LEVEL_XP_THRESHOLDS[i] ?? LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1],
  }))
}

/**
 * Normalize an author-edited level ladder into one the XP engine can consume.
 *
 * A hobby may name its own rungs, but `levelFromXp` / `xpToNextLevel` assume a
 * well-formed ascending ladder, so authoring without a guard would let an admin
 * create a non-monotonic or empty ladder that breaks progression for every
 * member. This is the keystone invariant for level-ladder authoring:
 *   • at least one rung (an empty ladder falls back to a single "Novice@0");
 *   • rung 0's threshold is ALWAYS 0 (level 0 is reached at 0 XP);
 *   • thresholds are STRICTLY ASCENDING — a rung whose threshold is ≤ the prior
 *     rung's is nudged to prior+1 so no two rungs share an XP gate (which would
 *     make a level unreachable / ambiguous);
 *   • names are trimmed, and a blank name falls back to "Level N".
 *
 * Pure and deterministic — the editor calls it, the store persists its output,
 * so what's stored is always engine-safe.
 */
export function normalizeLevels(input: LevelDef[]): LevelDef[] {
  if (!input || input.length === 0) return [{ name: 'Novice', xpThreshold: 0 }]
  const out: LevelDef[] = []
  for (let i = 0; i < input.length; i++) {
    const name = (input[i]?.name ?? '').trim() || `Level ${i + 1}`
    let xpThreshold = Math.max(0, Math.floor(Number(input[i]?.xpThreshold) || 0))
    if (i === 0) {
      xpThreshold = 0
    } else {
      const prev = out[i - 1].xpThreshold
      if (xpThreshold <= prev) xpThreshold = prev + 1
    }
    out.push({ name, xpThreshold })
  }
  return out
}

/** A metric BadgeDef built from an existing Medal (lossless). */
function badgeFromMedal(m: Medal): BadgeDef {
  return {
    kind: 'metric',
    id: m.id,
    name: m.name,
    unit: m.unit,
    metricKey: m.metricKey,
    how: m.how,
    tiers: m.tiers,
  }
}

/**
 * Build the seed definitions by composing the hardcoded catalogs. Deterministic
 * and pure — the same output every call. This is what the store seeds from on
 * first run; thereafter the persisted (possibly edited) copy wins.
 */
export function buildSeedDefinitions(): HobbyDefinition[] {
  // Gather the set of hobby names across every catalog so none is dropped.
  const names = new Set<string>()
  for (const h of sampleProfile.hobbies) names.add(h.name)
  for (const name of Object.keys(MEDALS_BY_HOBBY)) names.add(name)
  for (const q of sampleQuests) names.add(q.hobby)

  // Category + emblem come from the seed profile when known; else sensible defaults.
  const seededHobby = new Map(sampleProfile.hobbies.map((h) => [h.name, h]))

  const defs: HobbyDefinition[] = []
  for (const name of names) {
    const seeded = seededHobby.get(name)
    const medals = MEDALS_BY_HOBBY[name] ?? []
    // Recurring quests (daily/weekly/monthly) from the sample quest catalog.
    const recurring: QuestDef[] = sampleQuests
      .filter((q) => q.hobby === name)
      .map((q) => ({ id: q.id, cadence: q.cadence, text: q.text }))
    // One-time quests folded from the seed hobby's old missions — the per-rung
    // "do this next" steps, now XP-bearing. Stable id from slug + level + index.
    const slug = slugify(name)
    const onceQuests: QuestDef[] = (seeded?.missions ?? []).map((m, i) => ({
      id: `${slug}-once-${m.level}-${i}`,
      cadence: 'once' as const,
      text: m.text,
      level: m.level,
    }))
    const quests: QuestDef[] = [...recurring, ...onceQuests]

    defs.push({
      slug,
      name,
      category: seeded?.category ?? 'Making',
      emblem: seeded?.icon ?? '✨',
      description: `${name} — a hobby in your collection.`,
      levels: defaultLevels(),
      // Missions are unified into quests (cadence 'once'); none authored here.
      missions: [],
      quests,
      badges: medals.map(badgeFromMedal),
      // Step-1 local defaults: unclaimed (no owner), single member (you), v1 published.
      admins: [],
      memberCount: seeded ? 1 : 0,
      version: 1,
      status: 'published',
    })
  }
  // Stable order: seed-profile order first (as the UI expects), then the rest.
  const order = new Map(sampleProfile.hobbies.map((h, i) => [h.name, i]))
  defs.sort((a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999))
  return defs
}

// ---- Accessors: read a definition the way the old consts were read ----------
//
// These let consumers (MedalCase, QuestBoard, progress) source from a definition
// without changing the pure engines. The old const-based path still works, so
// the lift is additive and back-compatible.

/** Metric badges of a definition as `Medal[]` — drop-in for medalsForHobby. */
export function medalsFromDefinition(def: HobbyDefinition): Medal[] {
  return def.badges
    .filter((b): b is Extract<BadgeDef, { kind: 'metric' }> => b.kind === 'metric')
    .map((b) => ({
      id: b.id,
      name: b.name,
      unit: b.unit,
      metricKey: b.metricKey,
      how: b.how,
      tiers: b.tiers,
    }))
}

/** Milestone badges of a definition (the connector-less, human-claimed kind). */
export function milestonesFromDefinition(
  def: HobbyDefinition,
): Extract<BadgeDef, { kind: 'milestone' }>[] {
  return def.badges.filter(
    (b): b is Extract<BadgeDef, { kind: 'milestone' }> => b.kind === 'milestone',
  )
}

/**
 * Materialize a definition's quests into runtime `Quest[]` with XP computed:
 * recurring quests use CADENCE_XP; one-time (`once`) quests use onceXp(level).
 * Also folds any LEGACY `missions` (from a definition persisted before the
 * unification) into one-time quests, so old stored data keeps working.
 */
export function questsFromDefinition(def: HobbyDefinition): Quest[] {
  const fromQuests: Quest[] = def.quests.map((q) => ({
    id: q.id,
    hobby: def.name,
    cadence: q.cadence,
    text: q.text,
    level: q.level,
    xp: q.cadence === 'once' ? onceXp(q.level ?? 0) : CADENCE_XP[q.cadence],
  }))
  // Legacy missions → one-time quests (only if not already present as quests).
  const seenText = new Set(fromQuests.map((q) => q.text))
  const fromMissions: Quest[] = (def.missions ?? [])
    .filter((m) => !seenText.has(m.text))
    .map((m, i) => ({
      id: `${def.slug}-once-${m.level}-${i}`,
      hobby: def.name,
      cadence: 'once' as const,
      text: m.text,
      level: m.level,
      xp: onceXp(m.level),
    }))
  return [...fromQuests, ...fromMissions]
}

/**
 * The definition's one-time quests as `MissionDef[]` (back-compat shim for any
 * remaining caller that thinks in "missions"). Derived from `cadence:'once'`
 * quests plus any legacy `missions`.
 */
export function missionsFromDefinition(def: HobbyDefinition): MissionDef[] {
  const fromOnce: MissionDef[] = def.quests
    .filter((q) => q.cadence === 'once')
    .map((q) => ({ text: q.text, level: q.level ?? 0 }))
  const seenText = new Set(fromOnce.map((m) => m.text))
  const legacy = (def.missions ?? []).filter((m) => !seenText.has(m.text))
  return [...fromOnce, ...legacy]
}

/** The definition's level ladder as plain names (drop-in for LEVELS). */
export function levelNamesFromDefinition(def: HobbyDefinition): string[] {
  return def.levels.map((l) => l.name)
}

/** The definition's XP thresholds (drop-in for LEVEL_XP_THRESHOLDS). */
export function xpThresholdsFromDefinition(def: HobbyDefinition): number[] {
  return def.levels.map((l) => l.xpThreshold)
}

/** The definition's curated resource links, defaulting to [] for back-compat. */
export function resourcesFromDefinition(def: HobbyDefinition): ResourceLink[] {
  return def.resources ?? []
}

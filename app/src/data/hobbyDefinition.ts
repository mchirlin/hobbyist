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
import { LEVEL_XP_THRESHOLDS, type QuestCadence } from '../quests/quests'
import { sampleProfile } from './sampleProfile'

// ---- Authored progression pieces ------------------------------------------

/** One rung of a hobby's level ladder — admin-authored (name + XP to reach). */
export interface LevelDef {
  name: string
  /** Total XP required to REACH this rung (ascending; rung 0 is always 0). */
  xpThreshold: number
}

/** A suggested next step, tagged to a level. Lifts `Mission` to definition data. */
export interface MissionDef {
  text: string
  /** 0-based level index this mission belongs to. */
  level: number
}

/** A daily/weekly/monthly XP challenge. Lifts a `Quest` minus its derived xp. */
export interface QuestDef {
  id: string
  cadence: QuestCadence
  text: string
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
    const missions: MissionDef[] = (seeded?.missions ?? []).map((m) => ({
      text: m.text,
      level: m.level,
    }))
    const quests: QuestDef[] = sampleQuests
      .filter((q) => q.hobby === name)
      .map((q) => ({ id: q.id, cadence: q.cadence, text: q.text }))

    defs.push({
      slug: slugify(name),
      name,
      category: seeded?.category ?? 'Making',
      emblem: seeded?.icon ?? '✨',
      description: `${name} — a hobby in your collection.`,
      levels: defaultLevels(),
      missions,
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

/** The definition's level ladder as plain names (drop-in for LEVELS). */
export function levelNamesFromDefinition(def: HobbyDefinition): string[] {
  return def.levels.map((l) => l.name)
}

/** The definition's XP thresholds (drop-in for LEVEL_XP_THRESHOLDS). */
export function xpThresholdsFromDefinition(def: HobbyDefinition): number[] {
  return def.levels.map((l) => l.xpThreshold)
}

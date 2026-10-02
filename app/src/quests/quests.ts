// Quest model — the single "active engine" of The Hobbyist.
//
// A Quest is the ONE kind of thing you check off to earn XP and level a hobby.
// It comes in two flavours, distinguished by cadence:
//   • recurring  — daily / weekly / monthly challenges you redo (the engine).
//   • one-time   — `cadence: 'once'`, gated to a LEVEL. This is the old
//                  "mission": a per-rung "do this next" step. It used to be a
//                  teeth-less checklist; now it earns XP like everything else,
//                  scaled by its level so a Master-rung step is a real reward.
//
// There is deliberately no separate "mission" type/store anymore — one Quest,
// one completion store, one UI. (See the unification note in hobbyDefinition.)
//
// This module is pure and testable: quest definitions, XP math, and the
// completion → level derivation live here; the UI just renders + calls in.

export type QuestCadence = 'daily' | 'weekly' | 'monthly' | 'once'

export interface Quest {
  id: string
  /** Hobby name this quest levels up, matching ProfileHobby.name. */
  hobby: string
  cadence: QuestCadence
  /** Short imperative goal, e.g. "Log a bird you've never seen before." */
  text: string
  /** XP awarded on completion. Bigger cadence = bigger reward. */
  xp: number
  /**
   * 0-based level this quest belongs to. Required for one-time (`once`)
   * quests — they are the per-rung "do this next" ladder, surfaced by level.
   * Recurring quests leave it undefined (they apply at any level).
   */
  level?: number
}

/** Runtime completion record: questId → ISO timestamp it was completed. */
export type QuestCompletions = Record<string, string>

/**
 * XP reward per recurring cadence tier — daily small, weekly meaningful,
 * monthly big. One-time quests don't use a flat value; their XP scales with
 * level via `onceXp` (a level-0 step < a daily; a top-rung step ≈ a monthly).
 */
export const CADENCE_XP: Record<QuestCadence, number> = {
  daily: 10,
  weekly: 40,
  monthly: 120,
  once: 0, // placeholder — one-time XP is level-scaled; see onceXp.
}

/**
 * XP for a one-time (per-level) quest. Scales with the rung so climbing the
 * ladder feels earned: 30 / 60 / 90 / 120 / 150 for levels 0–4. Sits between
 * a daily (10) and a monthly (120), so one-time steps matter but don't dwarf
 * the recurring engine.
 */
export function onceXp(level: number): number {
  const lvl = Math.max(0, Math.floor(level || 0))
  return 30 + lvl * 30
}

/**
 * XP needed to REACH each level (0-based, aligned to LEVELS in data/types).
 * Level 0 = Novice at 0 XP; each tier costs progressively more.
 */
export const LEVEL_XP_THRESHOLDS = [0, 60, 200, 500, 1000]

/** Total XP earned for one hobby from its completed quests. */
export function hobbyXp(
  quests: Quest[],
  completions: QuestCompletions,
  hobby: string,
): number {
  return quests
    .filter((q) => q.hobby === hobby && completions[q.id])
    .reduce((sum, q) => sum + q.xp, 0)
}

/** Map an XP total to a 0-based level using LEVEL_XP_THRESHOLDS. */
export function levelFromXp(xp: number): number {
  let level = 0
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) level = i
  }
  return level
}

/** XP remaining until the next level, or null if already maxed. */
export function xpToNextLevel(
  xp: number,
): { needed: number; nextLevel: number } | null {
  const current = levelFromXp(xp)
  const next = current + 1
  if (next >= LEVEL_XP_THRESHOLDS.length) return null
  return { needed: LEVEL_XP_THRESHOLDS[next] - xp, nextLevel: next }
}

export function isCompleted(
  completions: QuestCompletions,
  questId: string,
): boolean {
  return Boolean(completions[questId])
}

// Quest model — the "active engine" of The Hobbyist.
//
// Two engines drive the sash: the passive mirror (auto-sync from connected
// sources) and Quests — daily / weekly / monthly challenges the user
// completes to earn XP and level up a hobby. Quests need no connectors, so
// they're the graceful path for cold-start and no-API hobbies.
//
// This module is pure and testable: quest definitions, XP math, and the
// completion → level derivation live here; the UI just renders + calls in.

export type QuestCadence = 'daily' | 'weekly' | 'monthly'

export interface Quest {
  id: string
  /** Hobby name this quest levels up, matching ProfileHobby.name. */
  hobby: string
  cadence: QuestCadence
  /** Short imperative goal, e.g. "Log a bird you've never seen before." */
  text: string
  /** XP awarded on completion. Bigger cadence = bigger reward. */
  xp: number
}

/** Runtime completion record: questId → ISO timestamp it was completed. */
export type QuestCompletions = Record<string, string>

/** XP reward per cadence tier — daily small, weekly meaningful, monthly big. */
export const CADENCE_XP: Record<QuestCadence, number> = {
  daily: 10,
  weekly: 40,
  monthly: 120,
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

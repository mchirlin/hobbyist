// Core data shapes for The Hobbyist.
// Kept deliberately small — this is a learning scaffold, not a schema spec.

export type HobbyCategory =
  | 'Outdoors'
  | 'Making'
  | 'Music'
  | 'Games'
  | 'Sport'
  | 'Craft'
  | 'Mind'

/** A concrete next step suggested for a hobby at a given level. */
export interface Mission {
  /** Short imperative goal, e.g. "Find your first 5 caches." */
  text: string
  /** Which level this mission belongs to (0-based index into LEVELS). */
  level: number
  /** Whether the user has completed it. */
  done?: boolean
}

/** A hobby the user has on their profile. */
export interface ProfileHobby {
  /** Hobby name, e.g. "Geocaching". */
  name: string
  /** Which category it belongs to (drives the badge color). */
  category: HobbyCategory
  /**
   * How important this hobby is in the user's life, 1–10.
   * This is the single most important field: it drives badge SIZE
   * in the shareable Hobby Badge Cloud.
   */
  importance: number
  /** Optional short emoji/icon shown in the badge center. */
  icon?: string
  /** Current level index (0-based into LEVELS). */
  level?: number
  /** Suggested missions to progress this hobby. */
  missions?: Mission[]
  /**
   * Counts for medal metrics, keyed by a medal's `metricKey`
   * (see quests/medals.ts), e.g. { 'geocaching.finds': 12 }. Drives which
   * medal tier is earned. A connector sync updates these; seeded for cold-start.
   */
  metricCounts?: Record<string, number>
}

/** The level ladder every hobby climbs. */
export const LEVELS = ['Novice', 'Apprentice', 'Skilled', 'Expert', 'Master'] as const

export interface Profile {
  displayName: string
  hobbies: ProfileHobby[]
}

// Medals — concrete, countable ways to level up each hobby, in the mold of
// Pokémon GO's medals: a named METRIC (caches found, species logged, tournaments
// played) with TIERED thresholds (Bronze / Silver / Gold / Platinum). Unlike the
// freeform `missions` prose, a medal is a number you make measurable progress
// toward, and the same count that drives a connector's activityCount drives the
// medal — so a sync visibly nudges the bar.
//
// Design:
//   • Each hobby has one or more medals (a hobby can track several things).
//   • A medal has ordered TIERS, each with a threshold. Bronze/Silver/Gold/
//     Platinum by convention, but the count of tiers is per-medal.
//   • `medalProgress(medal, count)` is pure: given the current count it returns
//     the earned tier, the next tier, and how far along the bar is. This is what
//     the UI renders and what tests pin.
//
// The metric a medal counts is named by `metricKey`, so a future wiring can pull
// the live number from a connector's activity (e.g. Birding's species count from
// the eBird CSV). For now hobbies carry a seed `count` and the medal shows the
// tier that count has reached.

export type MedalTierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

/** Palette per tier — used for the medal ring/fill. */
export const TIER_COLOR: Record<MedalTierName, string> = {
  Bronze: '#b06c38',
  Silver: '#9aa4ad',
  Gold: '#e0aa1e',
  Platinum: '#6ec3d6',
}

export interface MedalTier {
  name: MedalTierName
  /** Count required to earn this tier. Ascending across a medal's tiers. */
  threshold: number
}

export interface Medal {
  /** Stable key, e.g. "birding-species". */
  id: string
  /** Display name, e.g. "Life List". */
  name: string
  /** What one unit is, e.g. "species". Used in "12 / 25 species". */
  unit: string
  /** A machine key naming the metric, so a connector count can feed it later. */
  metricKey: string
  /** One-line description of how you earn it. */
  how: string
  /** Ordered tiers (ascending threshold). */
  tiers: MedalTier[]
}

const T = (bronze: number, silver: number, gold: number, plat: number): MedalTier[] => [
  { name: 'Bronze', threshold: bronze },
  { name: 'Silver', threshold: silver },
  { name: 'Gold', threshold: gold },
  { name: 'Platinum', threshold: plat },
]

/**
 * The medal catalog, keyed by hobby name. Thresholds are hand-tuned per hobby
 * so they mean something in that domain (a birder's 500 species ≈ a geocacher's
 * 1000 finds ≈ serious). Each hobby's PRIMARY medal is listed first.
 */
export const MEDALS_BY_HOBBY: Record<string, Medal[]> = {
  Birding: [
    {
      id: 'birding-species',
      name: 'Life List',
      unit: 'species',
      metricKey: 'ebird.species',
      how: 'Log distinct species on eBird.',
      tiers: T(10, 100, 300, 600),
    },
  ],
  Geocaching: [
    {
      id: 'geocaching-finds',
      name: 'Cache Hunter',
      unit: 'finds',
      metricKey: 'geocaching.finds',
      how: 'Find and log caches on geocaching.com.',
      tiers: T(5, 50, 250, 1000),
    },
    {
      id: 'geocaching-souvenirs',
      name: 'Souvenir Collector',
      unit: 'souvenirs',
      metricKey: 'geocaching.souvenirs',
      how: 'Earn souvenirs from events and challenges.',
      tiers: T(1, 10, 25, 50),
    },
  ],
  Ultimate: [
    {
      id: 'ultimate-tournaments',
      name: 'Tournament Circuit',
      unit: 'tournaments',
      metricKey: 'ultimate.tournaments',
      how: 'Play sanctioned WFDF/USAU tournaments.',
      tiers: T(1, 5, 15, 40),
    },
    {
      id: 'ultimate-scores',
      name: 'Playmaker',
      unit: 'goals + assists',
      metricKey: 'ultimate.scores',
      how: 'Rack up goals and assists across games.',
      tiers: T(10, 100, 500, 1500),
    },
  ],
  '3D Printing': [
    {
      id: 'printing-prints',
      name: 'Print Farm',
      unit: 'finished prints',
      metricKey: 'printing.prints',
      how: 'Complete prints — from first cube to full builds.',
      tiers: T(1, 25, 100, 500),
    },
  ],
  Electronics: [
    {
      id: 'electronics-builds',
      name: 'Solder Slinger',
      unit: 'builds',
      metricKey: 'electronics.builds',
      how: 'Finish circuits — kits and your own designs.',
      tiers: T(1, 10, 50, 150),
    },
  ],
  PCB: [
    {
      id: 'pcb-boards',
      name: 'Board Bringup',
      unit: 'boards',
      metricKey: 'pcb.boards',
      how: 'Design, order, and bring up custom PCBs.',
      tiers: T(1, 5, 20, 50),
    },
  ],
  Ukulele: [
    {
      id: 'ukulele-songs',
      name: 'Repertoire',
      unit: 'songs',
      metricKey: 'ukulele.songs',
      how: 'Learn to play full songs start to finish.',
      tiers: T(1, 10, 30, 75),
    },
  ],
  'Video Making': [
    {
      id: 'video-uploads',
      name: 'Showreel',
      unit: 'videos',
      metricKey: 'youtube.uploads',
      how: 'Publish finished edits.',
      tiers: T(1, 10, 50, 200),
    },
  ],
  Storytelling: [
    {
      id: 'storytelling-sets',
      name: 'Stage Time',
      unit: 'told sets',
      metricKey: 'storytelling.sets',
      how: 'Tell stories at open mics and shows.',
      tiers: T(1, 10, 30, 100),
    },
  ],
  Knitting: [
    {
      id: 'knitting-projects',
      name: 'Finished Objects',
      unit: 'projects',
      metricKey: 'knitting.projects',
      how: 'Complete knitting projects (FOs).',
      tiers: T(1, 10, 40, 100),
    },
  ],
}

export interface MedalProgress {
  medal: Medal
  count: number
  /** Highest tier earned, or null if below the first threshold. */
  earned: MedalTier | null
  /** The next tier to reach, or null if maxed (Platinum earned). */
  next: MedalTier | null
  /** 0–1 progress from the earned tier's threshold toward the next. */
  fraction: number
  /** true when the top tier is earned. */
  maxed: boolean
}

/**
 * PURE: compute which tier a count has earned and how far toward the next.
 * fraction is measured from the earned threshold (0 at just-earned) toward the
 * next threshold (1 at just-about-to-earn); before Bronze it's progress from 0
 * toward the Bronze threshold; when maxed it's 1.
 */
export function medalProgress(medal: Medal, count: number): MedalProgress {
  const tiers = medal.tiers
  let earnedIdx = -1
  for (let i = 0; i < tiers.length; i++) {
    if (count >= tiers[i].threshold) earnedIdx = i
    else break
  }
  const earned = earnedIdx >= 0 ? tiers[earnedIdx] : null
  const next = earnedIdx + 1 < tiers.length ? tiers[earnedIdx + 1] : null
  const maxed = earnedIdx === tiers.length - 1

  let fraction: number
  if (maxed) {
    fraction = 1
  } else {
    const lo = earned ? earned.threshold : 0
    const hi = next!.threshold
    fraction = hi > lo ? Math.max(0, Math.min(1, (count - lo) / (hi - lo))) : 0
  }
  return { medal, count, earned, next, fraction, maxed }
}

/** All medals for a hobby (empty array if none defined). */
export function medalsForHobby(hobby: string): Medal[] {
  return MEDALS_BY_HOBBY[hobby] ?? []
}

/** Short label like "Gold · 320 / 600 species" or "Locked · 3 / 5 finds". */
export function medalLabel(p: MedalProgress): string {
  const target = p.next?.threshold ?? p.earned?.threshold ?? 0
  const tierWord = p.maxed ? 'Platinum (max)' : p.earned ? p.earned.name : 'Locked'
  return `${tierWord} · ${p.count} / ${target} ${p.medal.unit}`
}

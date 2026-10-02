// AI-assisted hobby authoring — the draft engine.
//
// The product direction (recorded in COMMUNITY-MODEL and the member briefing):
// authoring a hobby should be AI-assisted — the admin names a hobby and the
// system DRAFTS every facet (description, level ladder, missions, quests, and
// milestone badges), then the admin reviews and tweaks rather than authoring
// from a blank page. This module is that drafter.
//
// WHY A PURE, IN-BROWSER DRAFTER (not an LLM call) IS THE RIGHT STEP-1:
// the app is a static GitHub Pages site with no server, and an LLM API key can
// no more ship to the browser than the AWS creds could (see the badge-gen
// local-only decision). So the IN-APP drafter is deterministic + template-based
// — it runs offline, costs nothing, and produces a complete, engine-safe draft
// today. An author-time `node` script (scripts/draft-gen/) can OPTIONALLY call a
// real LLM for richer copy and write its output through this same shape — the UI
// never changes. This mirrors exactly how badge art works: a local script owns
// the model call; the app owns the seam.
//
// This module is PURE and deterministic: (name, category) → a complete
// HobbyDefinition draft. The wizard renders it, the admin edits it, the store
// persists it. Everything it emits is already normalized to be engine-safe.

import type { HobbyCategory } from './types'
import {
  type HobbyDefinition,
  type LevelDef,
  type MissionDef,
  type QuestDef,
  type BadgeDef,
  type ResourceLink,
  defaultLevels,
  normalizeLevels,
  slugify,
} from './hobbyDefinition'
import type { QuestCadence } from '../quests/quests'

/**
 * A hobby draft is just a HobbyDefinition that hasn't been committed yet. We
 * carry it as the full shape so the wizard edits exactly what will be stored —
 * no lossy intermediate form. `status: 'draft'` marks it un-published until the
 * admin commits.
 */
export type HobbyDraft = HobbyDefinition

/** Provenance of a draft, surfaced in the wizard so the admin knows what to trust. */
export type DraftSource = 'template' | 'llm'

export interface DraftResult {
  draft: HobbyDraft
  /** Which engine produced it — 'template' is the in-browser default. */
  source: DraftSource
}

// ---- Category flavor -------------------------------------------------------
//
// The one lever that makes a template draft feel authored rather than generic:
// a per-category voice. A "Making" hobby's missions talk about finishing a
// build; a "Sport" hobby's talk about reps and matches. Keep these short and
// composable — the hobby NAME is slotted in, so "Pottery" (Craft) and "Running"
// (Sport) read differently without any per-hobby data.

interface CategoryFlavor {
  /** One-line "what this is" opener for the description. */
  blurb: (name: string) => string
  /** A verb phrase for the core activity, e.g. "throw a pot", "log a run". */
  doVerb: string
  /** The unit a practitioner counts, e.g. "sessions", "pieces", "runs". */
  unit: string
  /** A noun for a shareable artifact/outing, e.g. "piece", "outing", "track". */
  artifact: string
}

const FLAVORS: Record<HobbyCategory, CategoryFlavor> = {
  Outdoors: {
    blurb: (n) => `${n} gets you outside and moving — every outing is progress.`,
    doVerb: 'head out',
    unit: 'outings',
    artifact: 'trip',
  },
  Making: {
    blurb: (n) => `${n} is about building things with your hands and shipping finished work.`,
    doVerb: 'build something',
    unit: 'builds',
    artifact: 'build',
  },
  Music: {
    blurb: (n) => `${n} rewards steady practice — minutes add up into skill.`,
    doVerb: 'practice',
    unit: 'sessions',
    artifact: 'song',
  },
  Games: {
    blurb: (n) => `${n} is a social, replayable loop — every session counts.`,
    doVerb: 'play a session',
    unit: 'plays',
    artifact: 'match',
  },
  Sport: {
    blurb: (n) => `${n} is reps and matches — show up and the levels follow.`,
    doVerb: 'train',
    unit: 'sessions',
    artifact: 'session',
  },
  Craft: {
    blurb: (n) => `${n} turns practice into finished pieces you can hold and show off.`,
    doVerb: 'make something',
    unit: 'pieces',
    artifact: 'piece',
  },
  Mind: {
    blurb: (n) => `${n} compounds — a little curiosity every day goes a long way.`,
    doVerb: 'dig in',
    unit: 'sessions',
    artifact: 'entry',
  },
}

/** A tasteful default emoji per category when the admin gives none. */
const CATEGORY_EMOJI: Record<HobbyCategory, string> = {
  Outdoors: '🏞️',
  Making: '🛠️',
  Music: '🎵',
  Games: '🎲',
  Sport: '🏅',
  Craft: '🧶',
  Mind: '📚',
}

// ---- Facet drafters (each pure) --------------------------------------------

/** A two-sentence "what it is + how to start" description. */
export function draftDescription(name: string, category: HobbyCategory): string {
  const f = FLAVORS[category]
  return (
    `${f.blurb(name)} ` +
    `Start small — ${f.doVerb} once this week, note it, and let your ${f.unit} stack up into levels.`
  )
}

/**
 * The level ladder. We keep the shared five-rung ladder (Novice→Master) because
 * the XP engine and quests are tuned to it; the draft's contribution is RENAMING
 * the rungs into the hobby's own voice so a Birding "Master" can read as
 * "Big Lister" etc. For a template draft we keep the canonical names (safe,
 * recognizable); an LLM draft is where custom rung names shine. Returns the
 * engine-safe default ladder.
 */
export function draftLevels(_name: string, _category: HobbyCategory): LevelDef[] {
  return defaultLevels()
}

/**
 * Missions — the per-rung "what do I do next" spine, one per level. These are
 * the highest-value facet: a connector-less hobby lives or dies on having a
 * concrete next step at every rung. We draft one mission per level, escalating.
 */
export function draftMissions(name: string, category: HobbyCategory): MissionDef[] {
  const f = FLAVORS[category]
  const n = name
  return [
    { level: 0, text: `Do ${n} for the first time and note it.` },
    { level: 1, text: `${cap(f.doVerb)} three times in one week.` },
    { level: 2, text: `Finish your first real ${f.artifact} and share it.` },
    { level: 3, text: `Help someone else get started with ${n}.` },
    { level: 4, text: `Complete a standout ${f.artifact} you're proud of.` },
  ]
}

/** Daily / weekly / monthly challenges. Ids are slug-scoped so they're unique. */
export function draftQuests(name: string, category: HobbyCategory): QuestDef[] {
  const slug = slugify(name)
  const f = FLAVORS[category]
  const make = (cadence: QuestCadence, text: string): QuestDef => ({
    id: `${slug}-${cadence}`,
    cadence,
    text,
  })
  return [
    make('daily', `Spend 15 minutes on ${name} today.`),
    make('weekly', `${cap(f.doVerb)} at least twice this week.`),
    make('monthly', `Complete one meaningful ${f.artifact} this month.`),
  ]
}

/**
 * Milestone badges — the connector-less, self-claimed achievements that give a
 * hobby a reason to come back. We draft three escalating ones; all default to
 * `claim: 'self'` per the market guardrail (friction kills engagement).
 */
export function draftBadges(name: string, category: HobbyCategory): BadgeDef[] {
  const slug = slugify(name)
  const f = FLAVORS[category]
  const mk = (label: string, how: string): BadgeDef => ({
    kind: 'milestone',
    id: `${slug}-ms-${slugify(label)}`,
    name: label,
    how,
    claim: 'self',
  })
  return [
    mk('First Steps', `Complete your very first ${name} ${f.artifact}.`),
    mk('Regular', `${cap(f.doVerb)} ${f.unit === 'builds' ? '5 builds' : 'ten times'} total.`),
    mk('Devotee', `Keep ${name} going for three straight months.`),
  ]
}

// ---- Resources (links) facet -----------------------------------------------
//
// The "where do I go to get into this" facet, added per the authoring vision:
// a drafted hobby should come with good links out of the box — crucially a
// COMMUNITY board (a subreddit is the near-universal answer), plus a couple of
// apps/websites worth integrating with. The drafter uses a small CURATED map
// for hobbies we know well (correct subreddit + the real apps), and falls back
// to a reasonable guess (r/<slug>, a web search) for anything else. The admin
// edits these in the wizard — a guessed subreddit is a starting point, not a
// claim it exists.

/** Curated, known-good resources for specific hobbies (keyed by display name). */
const CURATED_RESOURCES: Record<string, ResourceLink[]> = {
  Birding: [
    { kind: 'community', label: 'r/birding', url: 'https://www.reddit.com/r/birding/' },
    { kind: 'app', label: 'eBird', url: 'https://ebird.org/', note: 'Log sightings; connectable here.' },
    { kind: 'app', label: 'Merlin Bird ID', url: 'https://merlin.allaboutbirds.org/', note: 'Free ID by photo or sound.' },
    { kind: 'website', label: 'All About Birds', url: 'https://www.allaboutbirds.org/' },
  ],
  '3D Printing': [
    { kind: 'community', label: 'r/3Dprinting', url: 'https://www.reddit.com/r/3Dprinting/' },
    { kind: 'website', label: 'Printables', url: 'https://www.printables.com/', note: 'Free model library.' },
    { kind: 'website', label: 'Thingiverse', url: 'https://www.thingiverse.com/' },
    { kind: 'app', label: 'OrcaSlicer', url: 'https://github.com/SoftFever/OrcaSlicer' },
  ],
  Climbing: [
    { kind: 'community', label: 'r/climbing', url: 'https://www.reddit.com/r/climbing/' },
    { kind: 'app', label: 'Mountain Project', url: 'https://www.mountainproject.com/' },
    { kind: 'app', label: 'Kaya', url: 'https://kaya.app/', note: 'Log gym sends.' },
  ],
  Reading: [
    { kind: 'community', label: 'r/books', url: 'https://www.reddit.com/r/books/' },
    { kind: 'app', label: 'StoryGraph', url: 'https://www.thestorygraph.com/' },
    { kind: 'app', label: 'Goodreads', url: 'https://www.goodreads.com/' },
  ],
  'Board Games': [
    { kind: 'community', label: 'r/boardgames', url: 'https://www.reddit.com/r/boardgames/' },
    { kind: 'website', label: 'BoardGameGeek', url: 'https://boardgamegeek.com/' },
  ],
  Geocaching: [
    { kind: 'community', label: 'r/geocaching', url: 'https://www.reddit.com/r/geocaching/' },
    { kind: 'app', label: 'Geocaching.com', url: 'https://www.geocaching.com/' },
  ],
  Electronics: [
    { kind: 'community', label: 'r/electronics', url: 'https://www.reddit.com/r/electronics/' },
    { kind: 'website', label: 'Adafruit Learn', url: 'https://learn.adafruit.com/' },
  ],
  Ukulele: [
    { kind: 'community', label: 'r/ukulele', url: 'https://www.reddit.com/r/ukulele/' },
    { kind: 'website', label: 'Ukulele Tabs', url: 'https://ukulele-tabs.com/' },
  ],
  Knitting: [
    { kind: 'community', label: 'r/knitting', url: 'https://www.reddit.com/r/knitting/' },
    { kind: 'app', label: 'Ravelry', url: 'https://www.ravelry.com/', note: 'Patterns + project log.' },
  ],
}

/** A per-category website fallback so even an unknown hobby gets a useful link. */
const CATEGORY_SITE: Record<HobbyCategory, { label: string; url: string } | null> = {
  Outdoors: { label: 'AllTrails', url: 'https://www.alltrails.com/' },
  Making: { label: 'Instructables', url: 'https://www.instructables.com/' },
  Music: { label: 'Ultimate Guitar', url: 'https://www.ultimate-guitar.com/' },
  Games: { label: 'BoardGameGeek', url: 'https://boardgamegeek.com/' },
  Sport: { label: 'Strava', url: 'https://www.strava.com/' },
  Craft: { label: 'Craftsy', url: 'https://www.craftsy.com/' },
  Mind: { label: 'YouTube', url: 'https://www.youtube.com/' },
}

/**
 * A best-guess subreddit slug for a hobby name. Reddit boards are usually the
 * de-slugged, no-hyphen form ("3D Printing" → r/3Dprinting is NOT guessable, so
 * curated entries win); for unknown hobbies we guess r/<alnum, no spaces> which
 * the admin confirms. Lowercased is the safest universal guess.
 */
function guessSubreddit(name: string): string {
  const compact = name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `https://www.reddit.com/r/${compact}/`
}

/**
 * Draft the resources facet. Known hobbies get their curated set; unknown ones
 * get a guessed community board + a category website + a web-search starter, so
 * every drafted hobby lands with at least one community link (the flagship) and
 * a place to look things up. The admin curates from there.
 */
export function draftResources(name: string, category: HobbyCategory): ResourceLink[] {
  const curated = CURATED_RESOURCES[name]
  if (curated) return curated.map((r) => ({ ...r }))

  const out: ResourceLink[] = [
    {
      kind: 'community',
      label: `r/${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
      url: guessSubreddit(name),
      note: 'Best guess — confirm the board exists.',
    },
  ]
  const site = CATEGORY_SITE[category]
  if (site) out.push({ kind: 'website', label: site.label, url: site.url })
  out.push({
    kind: 'website',
    label: `Search: how to start ${name}`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(`how to get started with ${name}`)}`,
  })
  return out
}

// ---- The whole-draft composer ----------------------------------------------

/**
 * Draft a COMPLETE hobby definition from just a name + category — the "generate
 * all facets" entry point the wizard calls. Deterministic and engine-safe: the
 * level ladder is normalized, missions are clamped to real rungs, ids are
 * slug-scoped. Marked `status: 'draft'` and `admins: ['you']` (the local user is
 * the owner of what they author) until committed.
 */
export function draftHobby(
  name: string,
  category: HobbyCategory,
  opts: { emblem?: string } = {},
): DraftResult {
  const trimmed = name.trim()
  const slug = slugify(trimmed)
  const levels = normalizeLevels(draftLevels(trimmed, category))
  const topLevel = levels.length - 1
  const missions = draftMissions(trimmed, category).map((m) =>
    m.level > topLevel ? { ...m, level: topLevel } : m,
  )
  const draft: HobbyDraft = {
    slug,
    name: trimmed,
    category,
    emblem: opts.emblem?.trim() || CATEGORY_EMOJI[category],
    description: draftDescription(trimmed, category),
    levels,
    missions,
    quests: draftQuests(trimmed, category),
    badges: draftBadges(trimmed, category),
    resources: draftResources(trimmed, category),
    admins: ['you'],
    memberCount: 1,
    version: 1,
    status: 'draft',
  }
  return { draft, source: 'template' }
}

// ---- small util ------------------------------------------------------------

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

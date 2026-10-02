// Definition store — the admin-editable, persisted layer for HobbyDefinitions.
//
// COMMUNITY-MODEL §6 step 1: "lift the hardcoded catalogs into HobbyDefinition
// objects, still local — prove the app renders from a definition, not a const,
// and that a single user can edit their own hobby's levels/missions/badges."
//
// This mirrors profileStore.ts exactly: pure read/write/edit over an injected
// StorageBackend (unit-testable), plus a tiny observable browser store for
// useSyncExternalStore. It SEEDS from buildSeedDefinitions() on first run — so
// the hardcoded catalogs remain the source of truth and a cold visitor sees the
// full set — then every edit is persisted. No backend; "publish" just bumps the
// local version (the real admin/version/governance flow is step 3, see §5).

import {
  type HobbyDefinition,
  type MissionDef,
  type BadgeDef,
  type MilestoneClaim,
  type LevelDef,
  type ResourceLink,
  buildSeedDefinitions,
  normalizeLevels,
  slugify,
} from './hobbyDefinition'

const STORAGE_KEY = 'hobbyist.definitions.v1'

/** Minimal storage backend (localStorage in the app; a stub in tests). */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// ---- Pure read/write over an injected backend -----------------------------

/** Read definitions, seeding from the catalogs on empty/malformed storage. */
export function readDefinitions(backend: StorageBackend): HobbyDefinition[] {
  const raw = backend.getItem(STORAGE_KEY)
  if (!raw) return buildSeedDefinitions()
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((d) => d && typeof d.slug === 'string')) {
      return parsed as HobbyDefinition[]
    }
    return buildSeedDefinitions()
  } catch {
    return buildSeedDefinitions()
  }
}

/** Overwrite all definitions. */
export function writeDefinitions(
  backend: StorageBackend,
  defs: HobbyDefinition[],
): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(defs))
}

/** Look up one definition by slug (the stable id). */
export function findDefinition(
  defs: HobbyDefinition[],
  slug: string,
): HobbyDefinition | undefined {
  return defs.find((d) => d.slug === slug)
}

/**
 * Apply an edit to one definition by slug and persist. The editor is a pure
 * function of the old definition → the new one; this handles find + replace +
 * version bump + write, so every edit path is uniform and non-destructive to
 * the other definitions. Returns the full new array.
 *
 * `bumpVersion` (default true) increments `version` to model a "publish" —
 * COMMUNITY-MODEL §5.2: edits are append-forward, member progress references
 * the version it was earned under, so an admin can't retroactively revoke.
 */
export function editDefinition(
  backend: StorageBackend,
  slug: string,
  editor: (def: HobbyDefinition) => HobbyDefinition,
  bumpVersion = true,
): HobbyDefinition[] {
  const defs = readDefinitions(backend)
  const next = defs.map((d) => {
    if (d.slug !== slug) return d
    const edited = editor(d)
    return bumpVersion ? { ...edited, version: d.version + 1 } : edited
  })
  writeDefinitions(backend, next)
  return next
}

// ---- Authoring primitives (COMMUNITY-MODEL §3) -----------------------------

/**
 * Insert a brand-new definition (the AI-authoring commit path). Unlike the
 * per-facet editors, this adds a whole definition — the output of the draft
 * engine, after the admin has reviewed it in the create wizard. Dedup by slug is
 * a no-op (a hobby with that slug already has a definition, so we don't clobber
 * it). The committed definition is marked `published` with a bumped version so
 * it leaves draft state. Returns the full new array.
 */
export function addDefinition(
  backend: StorageBackend,
  def: HobbyDefinition,
): HobbyDefinition[] {
  const defs = readDefinitions(backend)
  if (defs.some((d) => d.slug === def.slug)) return defs // don't clobber existing
  const committed: HobbyDefinition = { ...def, status: 'published', version: def.version + 1 }
  const next = [...defs, committed]
  writeDefinitions(backend, next)
  return next
}

/** Edit the free-text description ("how to get started"). */
export function setDescription(
  backend: StorageBackend,
  slug: string,
  description: string,
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => ({ ...d, description }))
}

/** Add a suggested mission at a level (the "what do I do next" spine). */
export function addMission(
  backend: StorageBackend,
  slug: string,
  mission: MissionDef,
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => ({
    ...d,
    missions: [...d.missions, mission],
  }))
}

/** Remove a mission by its index within the definition's mission list. */
export function removeMission(
  backend: StorageBackend,
  slug: string,
  index: number,
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => ({
    ...d,
    missions: d.missions.filter((_, i) => i !== index),
  }))
}

/**
 * Author a hobby's level ladder — rename rungs, retune XP thresholds, add or
 * drop a rung. The ladder is run through `normalizeLevels` before it's stored,
 * so what persists is always engine-safe (rung 0 @ 0 XP, strictly ascending),
 * no matter what the editor UI hands in. Missions pinned above the new top rung
 * are clamped down to the last rung so no mission dangles at a level that no
 * longer exists.
 */
export function setLevels(
  backend: StorageBackend,
  slug: string,
  levels: LevelDef[],
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => {
    const normalized = normalizeLevels(levels)
    const topLevel = normalized.length - 1
    const missions = d.missions.map((m) =>
      m.level > topLevel ? { ...m, level: topLevel } : m,
    )
    return { ...d, levels: normalized, missions }
  })
}

/**
 * Add a MILESTONE badge — the step-2 unlock, built now as the core authoring
 * primitive. A human-authored achievement with no connector; defaults to
 * `claim: 'self'` per the ADHD-market guardrail (friction kills this market —
 * make earning easy and frequent). Id is derived from the name + slug, so a
 * duplicate name on the same hobby is a no-op rather than a dupe.
 */
export function addMilestoneBadge(
  backend: StorageBackend,
  slug: string,
  input: { name: string; how?: string; claim?: MilestoneClaim },
): HobbyDefinition[] {
  const name = input.name.trim()
  if (!name) return readDefinitions(backend)
  const badgeId = `${slug}-ms-${slugify(name)}`
  return editDefinition(backend, slug, (d) => {
    if (d.badges.some((b) => b.id === badgeId)) return d // no dupe
    const badge: BadgeDef = {
      kind: 'milestone',
      id: badgeId,
      name,
      how: input.how?.trim() || `Achieve: ${name}.`,
      claim: input.claim ?? 'self',
    }
    return { ...d, badges: [...d.badges, badge] }
  })
}

/** Remove a badge (metric or milestone) by id. */
export function removeBadge(
  backend: StorageBackend,
  slug: string,
  badgeId: string,
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => ({
    ...d,
    badges: d.badges.filter((b) => b.id !== badgeId),
  }))
}

/** Replace a hobby's curated resource links (the whole list, post-edit). */
export function setResources(
  backend: StorageBackend,
  slug: string,
  resources: ResourceLink[],
): HobbyDefinition[] {
  return editDefinition(backend, slug, (d) => ({ ...d, resources }))
}

// ---- Browser-facing store with subscribe (for React) ----------------------

function browserBackend(): StorageBackend {
  if (typeof localStorage !== 'undefined') return localStorage
  const mem = new Map<string, string>()
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
}

type Listener = () => void

/**
 * Observable definition store over the browser backend. Mirrors profileStore:
 * a cached snapshot keeps useSyncExternalStore from looping (localStorage
 * returns a fresh array each read).
 */
export const definitionStore = (() => {
  const backend = browserBackend()
  const listeners = new Set<Listener>()
  let cache: HobbyDefinition[] = readDefinitions(backend)
  const emit = () => {
    cache = readDefinitions(backend)
    listeners.forEach((l) => l())
  }

  return {
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot(): HobbyDefinition[] {
      return cache
    },
    find(slug: string): HobbyDefinition | undefined {
      return findDefinition(cache, slug)
    },
    setDescription(slug: string, description: string) {
      const r = setDescription(backend, slug, description)
      emit()
      return r
    },
    addMission(slug: string, mission: MissionDef) {
      const r = addMission(backend, slug, mission)
      emit()
      return r
    },
    removeMission(slug: string, index: number) {
      const r = removeMission(backend, slug, index)
      emit()
      return r
    },
    setLevels(slug: string, levels: LevelDef[]) {
      const r = setLevels(backend, slug, levels)
      emit()
      return r
    },
    addMilestoneBadge(
      slug: string,
      input: { name: string; how?: string; claim?: MilestoneClaim },
    ) {
      const r = addMilestoneBadge(backend, slug, input)
      emit()
      return r
    },
    removeBadge(slug: string, badgeId: string) {
      const r = removeBadge(backend, slug, badgeId)
      emit()
      return r
    },
    setResources(slug: string, resources: ResourceLink[]) {
      const r = setResources(backend, slug, resources)
      emit()
      return r
    },
    /** Commit a brand-new drafted definition (the AI-authoring path). */
    addDefinition(def: HobbyDefinition) {
      const r = addDefinition(backend, def)
      emit()
      return r
    },
    /** Reset to the seed definitions (clears local edits). */
    reset(): HobbyDefinition[] {
      backend.removeItem(STORAGE_KEY)
      emit()
      return cache
    },
  }
})()

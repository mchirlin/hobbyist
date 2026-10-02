// Mission progress store — the user's self-attested "I did this" over missions.
//
// Missions are DEFINITION data (admin-authored, see hobbyDefinition.ts /
// definitionStore.ts): what the next step IS. Whether YOU have DONE a mission is
// USER PROGRESS — it belongs to you, not to the shared definition, exactly like
// quest completions (App.tsx) and milestone claims (HobbyProgress.tsx). So it
// lives here, in its own persisted store, not folded into the definition.
//
// A mission has no stable id (it's authored as free text at a level), so the key
// is the pair `slug + '\u0000' + text`. That survives both seeded and authored
// missions and reloads, and an admin re-wording a mission simply starts a fresh
// (un-done) key — which is correct: a changed step is a new step.
//
// Mirrors profileStore / definitionStore exactly: pure read/write over an
// injected StorageBackend (unit-testable), plus a tiny observable browser store
// for useSyncExternalStore. No backend.

const STORAGE_KEY = 'hobbyist.missionProgress.v1'

/** Minimal storage backend (localStorage in the app; a stub in tests). */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Map of done keys → true. Absent/false both mean "not done". */
export type MissionDone = Record<string, boolean>

/** The composite key for one mission's done-state: hobby slug + its text. */
export function missionKey(slug: string, text: string): string {
  return `${slug}\u0000${text}`
}

// ---- Pure read/write over an injected backend -----------------------------

/** Read the done map, defaulting to empty on missing/malformed storage. */
export function readMissionDone(backend: StorageBackend): MissionDone {
  const raw = backend.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as MissionDone
    }
    return {}
  } catch {
    return {}
  }
}

/** Overwrite the whole done map. */
export function writeMissionDone(backend: StorageBackend, done: MissionDone): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(done))
}

/** Is a given mission (slug + text) marked done? */
export function isMissionDone(done: MissionDone, slug: string, text: string): boolean {
  return Boolean(done[missionKey(slug, text)])
}

/**
 * Toggle one mission's done-state and persist. A key that flips to false is
 * DELETED rather than stored as `false`, so the map stays compact (absent ===
 * not done). Returns the resulting map.
 */
export function toggleMissionDone(
  backend: StorageBackend,
  slug: string,
  text: string,
): MissionDone {
  const done = readMissionDone(backend)
  const key = missionKey(slug, text)
  const next: MissionDone = { ...done }
  if (next[key]) delete next[key]
  else next[key] = true
  writeMissionDone(backend, next)
  return next
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
 * Observable mission-progress store. Mirrors profileStore: a cached snapshot
 * keeps useSyncExternalStore from looping (a fresh object each read would).
 */
export const missionProgressStore = (() => {
  const backend = browserBackend()
  const listeners = new Set<Listener>()
  let cache: MissionDone = readMissionDone(backend)
  const emit = () => {
    cache = readMissionDone(backend)
    listeners.forEach((l) => l())
  }

  return {
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot(): MissionDone {
      return cache
    },
    isDone(slug: string, text: string): boolean {
      return isMissionDone(cache, slug, text)
    },
    toggle(slug: string, text: string): MissionDone {
      const r = toggleMissionDone(backend, slug, text)
      emit()
      return r
    },
    /** Reset all mission progress (clears local done-state). */
    reset(): MissionDone {
      backend.removeItem(STORAGE_KEY)
      emit()
      return cache
    },
  }
})()

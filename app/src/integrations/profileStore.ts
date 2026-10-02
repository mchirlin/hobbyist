// Saved-profile store — the "collection" layer.
//
// The product thesis (see ASSESSMENT.md) is declare-first, enrich-later: a hobby
// exists the moment you tap "add" (an empty patch, instant, zero friction), and
// LATER a connector sync fills it in with real data. For that loop to feel good,
// a declared hobby has to SURVIVE A RELOAD — otherwise the collection resets and
// the whole "I'm building a case of patches" feeling evaporates.
//
// This module is that persistence. It mirrors connections.ts exactly: pure
// read/write/merge over an injected StorageBackend (unit-testable), plus a tiny
// observable browser store for useSyncExternalStore. The profile seeds from
// sampleProfile on first run so a cold visitor sees a populated case, then every
// add/remove/enrich is persisted.
//
// A hobby lives in two states, distinguished only by the PRESENCE of real data:
//   • declared  — no metricCounts yet. Empty patch, "connect to level up".
//   • enriched  — metricCounts populated by a sync. Medals/level move.
// No separate flag: `isDeclared(hobby)` is derived. See data/types.ts.

import type { Profile, ProfileHobby, HobbyCategory } from '../data/types'
import { sampleProfile } from '../data/sampleProfile'
import type { HobbyActivity } from './activity'

const STORAGE_KEY = 'hobbyist.profile.v1'

/** A minimal storage backend (localStorage in the app; a stub in tests). */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A hobby is "declared" (an empty, unearned patch) when no connector has fed it
 * real data yet. The single source of truth both the patch visual and the
 * collection UI consult to decide the two-state treatment.
 */
export function isDeclared(hobby: ProfileHobby): boolean {
  const counts = hobby.metricCounts
  if (!counts) return true
  // An all-zero / empty counts object is still "no real data yet".
  return Object.values(counts).every((v) => !v)
}

// ---- Pure read/write over an injected backend -----------------------------

/** Read the profile, seeding from sampleProfile on empty/malformed storage. */
export function readProfile(backend: StorageBackend): Profile {
  const raw = backend.getItem(STORAGE_KEY)
  if (!raw) return sampleProfile
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.hobbies)) {
      return parsed as Profile
    }
    return sampleProfile
  } catch {
    return sampleProfile
  }
}

/** Overwrite the whole profile. */
export function writeProfile(backend: StorageBackend, profile: Profile): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export interface NewHobbyInput {
  name: string
  category: HobbyCategory
  icon?: string
  /** Starting importance (patch size), 1–10. Declared hobbies start modest. */
  importance?: number
}

/**
 * Add a declared hobby — the frictionless front door. Drops an empty patch
 * (no metricCounts, level 0) into the collection. A duplicate name (case-insensitive)
 * is a no-op so a double-tap can't create two "Pottery" patches. Returns the
 * resulting profile.
 */
export function addHobby(backend: StorageBackend, input: NewHobbyInput): Profile {
  const profile = readProfile(backend)
  const name = input.name.trim()
  if (!name) return profile
  const exists = profile.hobbies.some(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  )
  if (exists) return profile
  const hobby: ProfileHobby = {
    name,
    category: input.category,
    importance: Math.max(1, Math.min(10, input.importance ?? 4)),
    icon: input.icon,
    level: 0,
    // No metricCounts → isDeclared() is true → empty patch, "connect to level up".
  }
  const next: Profile = { ...profile, hobbies: [...profile.hobbies, hobby] }
  writeProfile(backend, next)
  return next
}

/** Remove a hobby by name. Returns the resulting profile. */
export function removeHobby(backend: StorageBackend, name: string): Profile {
  const profile = readProfile(backend)
  const next: Profile = {
    ...profile,
    hobbies: profile.hobbies.filter((h) => h.name !== name),
  }
  writeProfile(backend, next)
  return next
}

/** Set a hobby's importance (patch size) directly. Returns the profile. */
export function setImportance(
  backend: StorageBackend,
  name: string,
  importance: number,
): Profile {
  const profile = readProfile(backend)
  const clamped = Math.max(1, Math.min(10, importance))
  const next: Profile = {
    ...profile,
    hobbies: profile.hobbies.map((h) =>
      h.name === name ? { ...h, importance: clamped } : h,
    ),
  }
  writeProfile(backend, next)
  return next
}

/**
 * Enrich a hobby from a synced activity signal — the second half of the loop.
 * Sets level from the adapter, scales importance from the activity magnitude,
 * and (crucially) merges the activity's metric counts so the patch flips from
 * declared → enriched. Returns the profile.
 */
export function applyActivity(backend: StorageBackend, a: HobbyActivity): Profile {
  const profile = readProfile(backend)
  const next: Profile = {
    ...profile,
    hobbies: profile.hobbies.map((h) => {
      if (h.name !== a.hobby) return h
      return {
        ...h,
        level: a.level,
        importance: Math.max(1, Math.min(10, Math.round(a.activityCount / 25) + 2)),
        metricCounts: {
          ...(h.metricCounts ?? {}),
          ...(a.metricCounts ?? {}),
        },
      }
    }),
  }
  writeProfile(backend, next)
  return next
}

/**
 * Clear all PROGRESS from every hobby while KEEPING the hobbies themselves —
 * "just have the hobbies in the db". A hobby's identity (name, category, icon,
 * importance) is preserved; the earned progress (level, synced metricCounts,
 * per-hobby mission done-flags) is stripped, so each patch returns to its
 * declared "connect to level up" state. The hobby list length is unchanged, so
 * authored/added hobbies are not lost. Returns the resulting profile.
 */
export function clearProgress(backend: StorageBackend): Profile {
  const profile = readProfile(backend)
  const next: Profile = {
    ...profile,
    hobbies: profile.hobbies.map((h) => ({
      name: h.name,
      category: h.category,
      importance: h.importance,
      icon: h.icon,
      level: 0,
      // metricCounts and missions deliberately dropped → back to declared.
    })),
  }
  writeProfile(backend, next)
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
 * Observable profile store over the browser backend, so React components can
 * subscribe and re-render on add/remove/enrich. Mirrors connectionStore: a
 * cached snapshot keeps useSyncExternalStore from looping (localStorage returns
 * a fresh object each read).
 */
export const profileStore = (() => {
  const backend = browserBackend()
  const listeners = new Set<Listener>()
  let cache: Profile = readProfile(backend)
  const emit = () => {
    cache = readProfile(backend)
    listeners.forEach((l) => l())
  }

  return {
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot(): Profile {
      return cache
    },
    addHobby(input: NewHobbyInput): Profile {
      const p = addHobby(backend, input)
      emit()
      return p
    },
    removeHobby(name: string): Profile {
      const p = removeHobby(backend, name)
      emit()
      return p
    },
    setImportance(name: string, importance: number): Profile {
      const p = setImportance(backend, name, importance)
      emit()
      return p
    },
    applyActivity(a: HobbyActivity): Profile {
      const p = applyActivity(backend, a)
      emit()
      return p
    },
    /** Clear progress from every hobby, keeping the hobbies themselves. */
    clearProgress(): Profile {
      const p = clearProgress(backend)
      emit()
      return p
    },
    /** Reset to the seed profile (clears the saved collection). */
    reset(): Profile {
      backend.removeItem(STORAGE_KEY)
      emit()
      return cache
    },
  }
})()

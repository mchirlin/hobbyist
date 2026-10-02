import { describe, it, expect } from 'vitest'
import {
  missionKey,
  readMissionDone,
  writeMissionDone,
  isMissionDone,
  toggleMissionDone,
  type StorageBackend,
  type MissionDone,
} from './missionProgress'

/** In-memory backend for pure-function tests (mirrors the other store tests). */
function memBackend(seed?: string): StorageBackend {
  const mem = new Map<string, string>()
  if (seed !== undefined) mem.set('hobbyist.missionProgress.v1', seed)
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
}

describe('missionProgress — pure store', () => {
  it('builds a composite key from slug + text', () => {
    expect(missionKey('birding', 'Log 10 species')).toBe('birding\u0000Log 10 species')
    // Different hobbies with the same mission text do not collide.
    expect(missionKey('birding', 'Practice')).not.toBe(missionKey('ukulele', 'Practice'))
  })

  it('reads empty on missing or malformed storage', () => {
    expect(readMissionDone(memBackend())).toEqual({})
    expect(readMissionDone(memBackend('not json'))).toEqual({})
    expect(readMissionDone(memBackend('[1,2,3]'))).toEqual({}) // array, not a map
  })

  it('round-trips a done map', () => {
    const backend = memBackend()
    const map: MissionDone = { [missionKey('birding', 'Log 10 species')]: true }
    writeMissionDone(backend, map)
    expect(readMissionDone(backend)).toEqual(map)
  })

  it('toggle sets then deletes the key (compact map)', () => {
    const backend = memBackend()
    expect(isMissionDone(readMissionDone(backend), 'birding', 'Log 10 species')).toBe(false)

    const after1 = toggleMissionDone(backend, 'birding', 'Log 10 species')
    expect(isMissionDone(after1, 'birding', 'Log 10 species')).toBe(true)
    expect(after1).toEqual({ [missionKey('birding', 'Log 10 species')]: true })

    const after2 = toggleMissionDone(backend, 'birding', 'Log 10 species')
    expect(isMissionDone(after2, 'birding', 'Log 10 species')).toBe(false)
    // Flipping off DELETES the key rather than storing false.
    expect(Object.keys(after2)).toHaveLength(0)
  })

  it('toggles are independent across hobbies and missions', () => {
    const backend = memBackend()
    toggleMissionDone(backend, 'birding', 'A')
    toggleMissionDone(backend, 'ukulele', 'A')
    const done = readMissionDone(backend)
    expect(isMissionDone(done, 'birding', 'A')).toBe(true)
    expect(isMissionDone(done, 'ukulele', 'A')).toBe(true)
    expect(isMissionDone(done, 'birding', 'B')).toBe(false)
  })
})

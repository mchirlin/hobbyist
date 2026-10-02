import { describe, it, expect } from 'vitest'
import {
  hobbyXp,
  levelFromXp,
  xpToNextLevel,
  isCompleted,
  CADENCE_XP,
  onceXp,
  type Quest,
  type QuestCompletions,
} from './quests'

const quests: Quest[] = [
  { id: 'b-d', hobby: 'Birding', cadence: 'daily', text: 'x', xp: CADENCE_XP.daily },
  { id: 'b-w', hobby: 'Birding', cadence: 'weekly', text: 'x', xp: CADENCE_XP.weekly },
  { id: 'b-m', hobby: 'Birding', cadence: 'monthly', text: 'x', xp: CADENCE_XP.monthly },
  { id: 'b-o', hobby: 'Birding', cadence: 'once', text: 'x', level: 2, xp: onceXp(2) },
  { id: 'u-d', hobby: 'Ultimate', cadence: 'daily', text: 'x', xp: CADENCE_XP.daily },
]

describe('onceXp — one-time quests scale with level', () => {
  it('awards 30 + 30·level, so climbing the ladder is worth more', () => {
    expect(onceXp(0)).toBe(30)
    expect(onceXp(1)).toBe(60)
    expect(onceXp(4)).toBe(150)
    // Sits between a daily (10) and a monthly (120) at the low rungs.
    expect(onceXp(0)).toBeGreaterThan(CADENCE_XP.daily)
    expect(onceXp(2)).toBeLessThanOrEqual(CADENCE_XP.monthly)
  })

  it('floors junk input to level 0', () => {
    expect(onceXp(-5)).toBe(30)
    expect(onceXp(Number.NaN)).toBe(30)
  })
})

describe('hobbyXp', () => {
  it('sums only completed quests for the given hobby', () => {
    const done: QuestCompletions = { 'b-d': 'now', 'b-w': 'now', 'u-d': 'now' }
    expect(hobbyXp(quests, done, 'Birding')).toBe(10 + 40) // daily + weekly
    expect(hobbyXp(quests, done, 'Ultimate')).toBe(10)
  })

  it('is zero when nothing is completed', () => {
    expect(hobbyXp(quests, {}, 'Birding')).toBe(0)
  })
})

describe('levelFromXp', () => {
  it('maps XP totals onto level tiers', () => {
    expect(levelFromXp(0)).toBe(0)
    expect(levelFromXp(59)).toBe(0)
    expect(levelFromXp(60)).toBe(1)
    expect(levelFromXp(200)).toBe(2)
    expect(levelFromXp(500)).toBe(3)
    expect(levelFromXp(1000)).toBe(4)
    expect(levelFromXp(99999)).toBe(4) // caps at Master
  })
})

describe('xpToNextLevel', () => {
  it('reports XP remaining to the next tier', () => {
    expect(xpToNextLevel(0)).toEqual({ needed: 60, nextLevel: 1 })
    expect(xpToNextLevel(50)).toEqual({ needed: 10, nextLevel: 1 })
    expect(xpToNextLevel(200)).toEqual({ needed: 300, nextLevel: 3 })
  })

  it('returns null when already at the max level', () => {
    expect(xpToNextLevel(1000)).toBeNull()
    expect(xpToNextLevel(5000)).toBeNull()
  })
})

describe('isCompleted', () => {
  it('reflects the completion map', () => {
    expect(isCompleted({ 'b-d': 'now' }, 'b-d')).toBe(true)
    expect(isCompleted({}, 'b-d')).toBe(false)
  })
})

describe('end-to-end: completing quests levels a hobby', () => {
  it('a daily + weekly + monthly Birding sweep reaches Apprentice', () => {
    const done: QuestCompletions = { 'b-d': 'now', 'b-w': 'now', 'b-m': 'now' }
    const xp = hobbyXp(quests, done, 'Birding') // 10 + 40 + 120 = 170
    expect(xp).toBe(170)
    expect(levelFromXp(xp)).toBe(1) // Apprentice (>= 60, < 200)
  })
})

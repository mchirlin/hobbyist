import { describe, it, expect } from 'vitest'
import { levelFromThresholds } from './activity'

describe('levelFromThresholds', () => {
  const tiers = [1, 50, 150, 400, 700]

  it('returns level 0 below the first threshold', () => {
    expect(levelFromThresholds(0, tiers)).toBe(0)
  })

  it('crosses to level 1 at the first threshold', () => {
    expect(levelFromThresholds(1, tiers)).toBe(1)
    expect(levelFromThresholds(49, tiers)).toBe(1)
  })

  it('climbs through each tier boundary', () => {
    expect(levelFromThresholds(50, tiers)).toBe(2)
    expect(levelFromThresholds(150, tiers)).toBe(3)
    expect(levelFromThresholds(400, tiers)).toBe(4)
    expect(levelFromThresholds(700, tiers)).toBe(5)
  })

  it('caps at the top tier for very large counts', () => {
    expect(levelFromThresholds(99999, tiers)).toBe(5)
  })
})

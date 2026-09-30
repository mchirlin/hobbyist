import { describe, it, expect } from 'vitest'
import {
  radiusForImportance,
  makeBalls,
  ballsOverlap,
  clampToBox,
  ballAt,
  type Ball,
} from './physics'
import type { ProfileHobby } from '../data/types'

function hobby(name: string, importance: number): ProfileHobby {
  return { name, category: 'Sport', importance }
}

describe('radiusForImportance', () => {
  it('scales with sqrt of importance and clamps the input range', () => {
    expect(radiusForImportance(5)).toBe(26) // baseline (i/5 = 1)
    expect(radiusForImportance(10)).toBeGreaterThan(radiusForImportance(5))
    expect(radiusForImportance(1)).toBeLessThan(radiusForImportance(5))
    // out-of-range importance is clamped, not extrapolated
    expect(radiusForImportance(0)).toBe(radiusForImportance(1))
    expect(radiusForImportance(99)).toBe(radiusForImportance(10))
  })
})

describe('makeBalls', () => {
  it('creates one ball per hobby, inside the box, with zero initial velocity', () => {
    const balls = makeBalls([hobby('A', 8), hobby('B', 3), hobby('C', 5)], 400, 344)
    expect(balls.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    for (const b of balls) {
      expect(b.vx).toBe(0)
      expect(b.vy).toBe(0)
      expect(b.x).toBeGreaterThan(0)
      expect(b.x).toBeLessThan(400)
      expect(b.y).toBeGreaterThan(0)
      expect(b.y).toBeLessThan(344)
    }
  })

  it('is deterministic (no Math.random) so layout is stable across runs', () => {
    const a = makeBalls([hobby('A', 5), hobby('B', 5)], 400, 344)
    const b = makeBalls([hobby('A', 5), hobby('B', 5)], 400, 344)
    expect(a).toEqual(b)
  })

  it('sizes balls by importance (bigger importance → bigger radius)', () => {
    const [big, small] = makeBalls([hobby('Big', 10), hobby('Small', 2)], 400, 344)
    expect(big.r).toBeGreaterThan(small.r)
  })
})

describe('ballsOverlap', () => {
  const mk = (x: number, y: number, r: number): Ball =>
    ({ id: `${x},${y}`, hobby: hobby('x', 5), r, x, y, vx: 0, vy: 0 })

  it('detects overlapping and non-overlapping pairs', () => {
    expect(ballsOverlap(mk(0, 0, 10), mk(15, 0, 10))).toBe(true) // dist 15 < 20
    expect(ballsOverlap(mk(0, 0, 10), mk(25, 0, 10))).toBe(false) // dist 25 > 20
  })
})

describe('clampToBox', () => {
  it('pushes a ball fully back inside and dampens the wall-ward velocity', () => {
    const b: Ball = { id: 'a', hobby: hobby('x', 5), r: 20, x: -5, y: 10, vx: -8, vy: 0 }
    clampToBox(b, 400, 344)
    expect(b.x).toBe(20) // clamped to r
    expect(b.vx).toBeGreaterThanOrEqual(0) // bounced away from the wall
  })

  it('clamps against the far edges too', () => {
    const b: Ball = { id: 'a', hobby: hobby('x', 5), r: 20, x: 410, y: 400, vx: 5, vy: 5 }
    clampToBox(b, 400, 344)
    expect(b.x).toBe(380) // w - r
    expect(b.y).toBe(324) // h - r
  })
})

describe('ballAt', () => {
  const balls: Ball[] = [
    { id: 'under', hobby: hobby('u', 5), r: 30, x: 100, y: 100, vx: 0, vy: 0 },
    { id: 'over', hobby: hobby('o', 5), r: 30, x: 110, y: 100, vx: 0, vy: 0 },
  ]
  it('returns the topmost ball under the point (last drawn wins)', () => {
    expect(ballAt(balls, 105, 100)?.id).toBe('over')
  })
  it('returns null when the point misses every ball', () => {
    expect(ballAt(balls, 300, 300)).toBeNull()
  })
})

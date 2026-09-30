// Physics helpers for the interactive "play" sash — pure functions so the
// collision/geometry logic is unit-testable without a DOM or a running
// simulation. The React component (PlaySash) wires these into a d3-force loop.

import type { ProfileHobby } from '../data/types'

/** A hobby turned into a physics body (a draggable, colliding ball). */
export interface Ball {
  /** Stable key = hobby name. */
  id: string
  hobby: ProfileHobby
  /** Ball radius in px, derived from importance. */
  r: number
  /** Position + velocity are mutated by the simulation. */
  x: number
  y: number
  vx: number
  vy: number
  /** Fixed position while dragging (d3-force convention: fx/fy pin the node). */
  fx?: number | null
  fy?: number | null
}

/**
 * Map importance (1–10) to a ball radius. Uses sqrt so a 2× importance is ~1.4×
 * radius (area scales with importance), matching how the packed sash sizes
 * patches by area, and clamps so tiny/huge hobbies stay playable.
 */
export function radiusForImportance(importance: number, base = 26): number {
  const i = Math.max(1, Math.min(10, importance))
  return Math.round(base * Math.sqrt(i / 5))
}

/** Build the initial ball set, scattered around the center of a w×h box. */
export function makeBalls(hobbies: ProfileHobby[], w: number, h: number, base = 26): Ball[] {
  const cx = w / 2
  const cy = h / 2
  return hobbies.map((hobby, i) => {
    // deterministic scatter on a ring so tests are stable (no Math.random)
    const ang = (i / Math.max(1, hobbies.length)) * Math.PI * 2
    const spread = Math.min(w, h) * 0.28
    return {
      id: hobby.name,
      hobby,
      r: radiusForImportance(hobby.importance, base),
      x: cx + Math.cos(ang) * spread,
      y: cy + Math.sin(ang) * spread,
      vx: 0,
      vy: 0,
    }
  })
}

/** Whether two balls overlap (centers closer than the sum of radii). */
export function ballsOverlap(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dist = Math.hypot(dx, dy)
  return dist < a.r + b.r
}

/**
 * Clamp a ball's center so the whole ball stays inside the w×h box, and zero
 * the velocity component that pushed it into the wall (so it "bumps" the edge
 * instead of sticking off-screen). Mutates and returns the ball.
 */
export function clampToBox(ball: Ball, w: number, h: number): Ball {
  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.4 }
  else if (ball.x > w - ball.r) { ball.x = w - ball.r; ball.vx = -Math.abs(ball.vx) * 0.4 }
  if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) * 0.4 }
  else if (ball.y > h - ball.r) { ball.y = h - ball.r; ball.vy = -Math.abs(ball.vy) * 0.4 }
  return ball
}

/** The ball under a point (topmost/last wins), or null. For hit-testing drags. */
export function ballAt(balls: Ball[], px: number, py: number): Ball | null {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i]
    if (Math.hypot(b.x - px, b.y - py) <= b.r) return b
  }
  return null
}

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force'
import type { Profile } from '../data/types'
import { CATEGORY_ARCHETYPE } from '../data/sampleProfile'
import { PatchBody, PatchDefs } from './patchVisual'
import { makeBalls, ballAt, radiusForImportance, type Ball } from './physics'

interface Props {
  profile: Profile
  size?: number
}

/**
 * The Patch Sash — the signature shareable visual, and interactive: every hobby
 * is a merit patch you can grab, drag, and fling. They bump into each other
 * (forceCollide) and settle. Sized by importance. Uses the SAME patch visual as
 * the static layout (scalloped border, stitched ring, emblem, level pips) via
 * the shared PatchBody, so a patch looks identical whether it's resting or being
 * flung.
 */
export function PlaySash({ profile, size = 640 }: Props) {
  const w = size
  const h = Math.round(size * 0.86)
  const svgRef = useRef<SVGSVGElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const simRef = useRef<Simulation<Ball, undefined> | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const [, setTick] = useState(0)

  const dominant = (() => {
    const tally: Record<string, number> = {}
    for (const hh of profile.hobbies) tally[hh.category] = (tally[hh.category] ?? 0) + hh.importance
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Making'
  })()
  const archetype = CATEGORY_ARCHETYPE[dominant] ?? 'The Hobbyist'

  const ballBase = Math.round(size * 0.055)
  // A stable key for the SET of hobbies (names only). The simulation rebuilds
  // only when hobbies are ADDED/REMOVED or the box resizes — NOT when a hobby's
  // importance/level changes. That's what keeps dragging the importance slider
  // from re-scattering everything: importance updates radii in place instead.
  const rosterKey = profile.hobbies.map((hh) => hh.name).join('|')

  // Build the simulation once per roster/box. Positions persist across
  // importance edits because this effect does not depend on importance.
  useEffect(() => {
    const balls = makeBalls(profile.hobbies, w, h, ballBase)
    ballsRef.current = balls

    const sim = forceSimulation<Ball>(balls)
      .force('x', forceX<Ball>(w / 2).strength(0.045))
      .force('y', forceY<Ball>(h / 2).strength(0.045))
      .force('collide', forceCollide<Ball>((d) => d.r + 2).strength(0.9).iterations(3))
      .velocityDecay(0.28)
      .alphaDecay(0.015)
      .on('tick', () => {
        for (const b of ballsRef.current) {
          if (b.x < b.r) b.x = b.r
          else if (b.x > w - b.r) b.x = w - b.r
          if (b.y < b.r) b.y = b.r
          else if (b.y > h - b.r) b.y = h - b.r
        }
        setTick((n) => (n + 1) % 1_000_000)
      })

    simRef.current = sim
    return () => { sim.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, w, h, ballBase])

  // Live-update ball radii + hobby data when importance/level changes, WITHOUT
  // rebuilding the sim. Existing balls keep their positions; a resized ball just
  // grows/shrinks and gently nudges its neighbors via a re-warmed collide pass.
  useEffect(() => {
    const balls = ballsRef.current
    if (balls.length === 0) return
    let changed = false
    for (const hobby of profile.hobbies) {
      const ball = balls.find((b) => b.id === hobby.name)
      if (!ball) continue
      const r = radiusForImportance(hobby.importance, ballBase)
      if (ball.r !== r || ball.hobby !== hobby) {
        ball.r = r
        ball.hobby = hobby // pick up level/importance changes for the label + pips
        changed = true
      }
    }
    if (changed) simRef.current?.alphaTarget(0.15).restart()
    else simRef.current?.alphaTarget(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, ballBase])

  const toSvg = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current!
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * w,
      y: ((e.clientY - rect.top) / rect.height) * h,
    }
  }, [w, h])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = toSvg(e)
    const hit = ballAt(ballsRef.current, x, y)
    if (!hit) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragIdRef.current = hit.id
    hit.fx = x
    hit.fy = y
    simRef.current?.alphaTarget(0.5).restart()
  }, [toSvg])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragIdRef.current) return
    const { x, y } = toSvg(e)
    const ball = ballsRef.current.find((b) => b.id === dragIdRef.current)
    if (!ball) return
    ball.fx = x
    ball.fy = y
  }, [toSvg])

  const onPointerUp = useCallback(() => {
    const id = dragIdRef.current
    if (!id) return
    const ball = ballsRef.current.find((b) => b.id === id)
    if (ball) {
      ball.fx = null
      ball.fy = null
    }
    dragIdRef.current = null
    simRef.current?.alphaTarget(0)
  }, [])

  const bannerY = h + size * 0.02

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${size}`}
      role="img"
      aria-label={`${profile.displayName}'s hobby patch sash — drag the patches`}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <radialGradient id="felt" cx="50%" cy="35%" r="85%">
          <stop offset="0%" stopColor="#20242e" />
          <stop offset="100%" stopColor="#0d0f15" />
        </radialGradient>
        <PatchDefs />
      </defs>

      {/* felt backing */}
      <rect width={w} height={size} rx="26" fill="url(#felt)" />
      <rect x={w * 0.12} y="0" width={w * 0.76} height={size} fill="#ffffff" opacity="0.03" />

      {ballsRef.current.map((b) => {
        const dragging = dragIdRef.current === b.id
        return (
          <g
            key={b.id}
            transform={`translate(${b.x.toFixed(2)},${b.y.toFixed(2)})`}
            filter="url(#patchShadow)"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            opacity={dragging ? 0.96 : 1}
          >
            <PatchBody hobby={b.hobby} r={b.r} />
          </g>
        )
      })}

      {/* name + archetype banner */}
      <g transform={`translate(${w / 2},${bannerY})`}>
        <rect x={-w * 0.42} y={-2} width={w * 0.84} height="1.5" fill="#ffd43b" opacity="0.6" />
        <text textAnchor="middle" y={size * 0.05} fontSize={size * 0.055} fill="#fff" fontWeight={900}
          style={{ letterSpacing: '0.02em' }}>
          {profile.displayName.toUpperCase()}
        </text>
        <text textAnchor="middle" y={size * 0.095} fontSize={size * 0.03} fill="#ffd43b"
          fontWeight={700} style={{ letterSpacing: '0.16em' }}>
          {archetype.toUpperCase()}
        </text>
      </g>
    </svg>
  )
}

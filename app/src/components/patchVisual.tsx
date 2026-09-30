// Shared merit-patch visual — the scalloped border, stitched thread ring,
// centered emblem, name label, and level pips, drawn centered at (0,0) for a
// given radius. Both the packed PatchSash and the draggable physics sash render
// through this, so a patch looks IDENTICAL in both. (Previously the physics
// sash drew plain circles, which is why the images looked different.)

import type { ProfileHobby } from '../data/types'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { resolveArt } from './art'

/** Lighten (+) or darken (−) a hex color by a percentage. */
export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (pct / 100) * (pct < 0 ? c : 255 - c))))
  return `#${((adj(r) << 16) | (adj(g) << 8) | adj(b)).toString(16).padStart(6, '0')}`
}

/** Scalloped merit-badge outline at radius r with n bumps. */
export function scallop(r: number, n: number): string {
  const inner = r * 0.9
  let d = ''
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 0.5) / n) * Math.PI * 2
    const a2 = ((i + 1) / n) * Math.PI * 2
    if (i === 0) d += `M${(Math.cos(a0) * r).toFixed(1)},${(Math.sin(a0) * r).toFixed(1)}`
    d += `Q${(Math.cos(a1) * inner).toFixed(1)},${(Math.sin(a1) * inner).toFixed(1)} ${(Math.cos(a2) * r).toFixed(1)},${(Math.sin(a2) * r).toFixed(1)} `
  }
  return d + 'Z'
}

interface PatchBodyProps {
  hobby: ProfileHobby
  /** Patch radius in px. */
  r: number
}

/**
 * The patch itself, centered at (0,0). Caller positions it with a <g transform>
 * and supplies any entrance animation / drag wrapper around it. Requires a
 * `thread-<category>` linearGradient and a `patchShadow` filter to exist in the
 * enclosing <svg> <defs> (both sashes define them).
 */
export function PatchBody({ hobby, r }: PatchBodyProps) {
  const color = CATEGORY_COLOR[hobby.category] ?? '#868e96'
  const bumps = Math.max(10, Math.round(r / 4.5))
  const emblem = resolveArt(hobby.name, hobby.icon)
  const emblemScale = (r * 1.15) / 100
  const showLabel = r > 30
  const level = hobby.level ?? 0

  return (
    <>
      {/* outer embroidered border (twill) */}
      <path d={scallop(r, bumps)} fill={shade(color, -30)} pointerEvents="none" />
      {/* stitched dashed ring */}
      <circle
        r={r * 0.82}
        fill={`url(#thread-${hobby.category})`}
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth={Math.max(1.5, r * 0.03)}
        strokeDasharray={`${r * 0.16} ${r * 0.09}`}
        pointerEvents="none"
      />
      {/* emblem (illustration/image/emoji, centered, nudged up when labeled) */}
      {emblem.kind === 'image' ? (
        <image
          href={emblem.href}
          width={100 * emblemScale}
          height={100 * emblemScale}
          x={-50 * emblemScale}
          y={(showLabel ? -58 : -50) * emblemScale}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        >
          <title>{emblem.alt}</title>
        </image>
      ) : emblem.kind === 'emoji' ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          y={showLabel ? -8 : 0}
          fontSize={r * 0.6}
          style={{ userSelect: 'none' }}
          pointerEvents="none"
        >
          {emblem.glyph}
        </text>
      ) : (
        <g
          transform={`translate(${-50 * emblemScale},${(showLabel ? -58 : -50) * emblemScale}) scale(${emblemScale})`}
          color="#fff"
          opacity="0.96"
          pointerEvents="none"
          dangerouslySetInnerHTML={{ __html: emblem.svg }}
        />
      )}
      {/* hobby name */}
      {showLabel && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          y={r * 0.4}
          fontSize={Math.max(9, r * 0.15)}
          fill="#fff"
          fontWeight={800}
          style={{ userSelect: 'none', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}
          pointerEvents="none"
        >
          {hobby.name}
        </text>
      )}
      {/* level pips around the bottom rim */}
      {level > 0 &&
        Array.from({ length: Math.min(level, LEVELS.length - 1) }).map((_, k, arr) => {
          const spread = 0.5
          const t = arr.length === 1 ? 0 : (k / (arr.length - 1) - 0.5)
          const ang = Math.PI / 2 + t * spread
          const cx = Math.cos(ang) * r * 0.72
          const cy = Math.sin(ang) * r * 0.72
          return (
            <circle
              key={k}
              cx={cx}
              cy={cy}
              r={Math.max(2, r * 0.05)}
              fill="#ffd43b"
              stroke={shade(color, -40)}
              strokeWidth="1"
              pointerEvents="none"
            />
          )
        })}
    </>
  )
}

/** Shared <defs> both sashes need: per-category thread gradients + patch shadow. */
export function PatchDefs() {
  return (
    <>
      <filter id="patchShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
      </filter>
      {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
        <linearGradient key={cat} id={`thread-${cat}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(color, 26)} />
          <stop offset="100%" stopColor={shade(color, -22)} />
        </linearGradient>
      ))}
    </>
  )
}

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { pack, hierarchy } from 'd3-hierarchy'
import type { Profile } from '../data/types'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR, CATEGORY_ARCHETYPE } from '../data/sampleProfile'
import { resolveArt } from './art'

interface Props {
  profile: Profile
  size?: number
  /** Change this value to replay the entrance animation. */
  replayKey?: number
}

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (pct / 100) * (pct < 0 ? c : 255 - c))))
  return `#${((adj(r) << 16) | (adj(g) << 8) | adj(b)).toString(16).padStart(6, '0')}`
}

/** Scalloped merit-badge outline at radius r with n bumps. */
function scallop(r: number, n: number): string {
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

/**
 * The Patch Sash — the signature shareable visual.
 * Hobbies as embroidered merit patches on a sash, sized by importance,
 * with an illustrated emblem, stitched border, level chevrons, and a
 * framed name + archetype banner. One designed object, made to share.
 */
export function PatchSash({ profile, size = 640, replayKey = 0 }: Props) {
  const nodes = useMemo(() => {
    type Datum = { children?: Datum[]; importance?: number }
    const root = hierarchy<Datum>({ children: profile.hobbies as Datum[] })
      .sum((d) => (d.importance ? d.importance * d.importance : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    // pack into the upper region; the banner takes the bottom strip
    return pack<Datum>().size([size, size * 0.84]).padding(7)(root).leaves()
  }, [profile, size])

  const dominant = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const h of profile.hobbies) tally[h.category] = (tally[h.category] ?? 0) + h.importance
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Making'
  }, [profile])
  const archetype = CATEGORY_ARCHETYPE[dominant] ?? 'The Hobbyist'

  const bannerY = size * 0.86

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${profile.displayName}'s hobby patch sash`}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <radialGradient id="felt" cx="50%" cy="35%" r="85%">
          <stop offset="0%" stopColor="#20242e" />
          <stop offset="100%" stopColor="#0d0f15" />
        </radialGradient>
        <filter id="patchShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
        </filter>
        {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
          <linearGradient key={cat} id={`thread-${cat}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(color, 26)} />
            <stop offset="100%" stopColor={shade(color, -22)} />
          </linearGradient>
        ))}
      </defs>

      {/* felt backing */}
      <rect width={size} height={size} rx="26" fill="url(#felt)" />
      {/* faux stitched sash strap */}
      <rect x={size * 0.12} y="0" width={size * 0.76} height={size} fill="#ffffff" opacity="0.03" />

      {/* patches */}
      {nodes.map((node, i) => {
        const hobby = node.data as any
        const color = CATEGORY_COLOR[hobby.category] ?? '#868e96'
        const r = node.r
        const bumps = Math.max(10, Math.round(r / 4.5))
        const emblem = resolveArt(hobby.name, hobby.icon)
        const emblemScale = (r * 1.15) / 100
        const showLabel = r > 30
        const level = hobby.level ?? 0
        // biggest-first stagger: nodes are already sorted largest→smallest
        const delay = 0.12 + i * 0.11
        return (
          <g key={`${replayKey}-${i}`} transform={`translate(${node.x},${node.y})`}>
          <motion.g
            initial={{ opacity: 0, scale: 0.2, y: -46 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 520,
              damping: 17,
              delay,
              opacity: { duration: 0.18, delay },
            }}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
            filter="url(#patchShadow)"
          >
            {/* outer embroidered border (twill) */}
            <path d={scallop(r, bumps)} fill={shade(color, -30)} />
            {/* stitched dashed ring */}
            <circle
              r={r * 0.82}
              fill={`url(#thread-${hobby.category})`}
              stroke="#fff"
              strokeOpacity="0.85"
              strokeWidth={Math.max(1.5, r * 0.03)}
              strokeDasharray={`${r * 0.16} ${r * 0.09}`}
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
              >
                <title>{emblem.alt}</title>
              </image>
            ) : emblem.kind === 'emoji' ? (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                y={(showLabel ? -8 : 0)}
                fontSize={r * 0.6}
                style={{ userSelect: 'none' }}
              >
                {emblem.glyph}
              </text>
            ) : (
              <g
                transform={`translate(${-50 * emblemScale},${(showLabel ? -58 : -50) * emblemScale}) scale(${emblemScale})`}
                color="#fff"
                opacity="0.96"
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
              >
                {hobby.name}
              </text>
            )}
            {/* level chevrons around the bottom rim */}
            {level > 0 &&
              Array.from({ length: Math.min(level, LEVELS.length - 1) }).map((_, k, arr) => {
                const spread = 0.5
                const t = arr.length === 1 ? 0 : (k / (arr.length - 1) - 0.5)
                const ang = Math.PI / 2 + t * spread
                const cx = Math.cos(ang) * r * 0.72
                const cy = Math.sin(ang) * r * 0.72
                return (
                  <motion.circle
                    key={k}
                    cx={cx}
                    cy={cy}
                    r={Math.max(2, r * 0.05)}
                    fill="#ffd43b"
                    stroke={shade(color, -40)}
                    strokeWidth="1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: delay + 0.28 + k * 0.08, type: 'spring', stiffness: 600, damping: 12 }}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  />
                )
              })}
          </motion.g>
          </g>
        )
      })}

      {/* name + archetype banner */}
      <g transform={`translate(${size / 2},${bannerY})`}>
        <motion.g
          key={`banner-${replayKey}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + nodes.length * 0.11 + 0.1, duration: 0.4 }}
        >
          <rect x={-size * 0.42} y={-2} width={size * 0.84} height="1.5" fill="#ffd43b" opacity="0.6" />
          <text textAnchor="middle" y={size * 0.05} fontSize={size * 0.055} fill="#fff" fontWeight={900}
            style={{ letterSpacing: '0.02em' }}>
            {profile.displayName.toUpperCase()}
          </text>
          <text textAnchor="middle" y={size * 0.095} fontSize={size * 0.03} fill="#ffd43b"
            fontWeight={700} style={{ letterSpacing: '0.16em' }}>
            {archetype.toUpperCase()}
          </text>
        </motion.g>
      </g>
    </svg>
  )
}

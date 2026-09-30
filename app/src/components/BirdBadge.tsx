import { useMemo, useRef, useState } from 'react'
import { parseEbirdCsv, ebirdCsvToActivity, type EbirdCsvRow } from '../integrations/ebirdCsv'
import { medalProgress, medalsForHobby, type MedalProgress } from '../quests/medals'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { resolveArt } from './art'
import { shade, scallop } from './patchVisual'

// ── v1: the sharpest cut ──────────────────────────────────────────────────
// ONE hobby (Birding), ONE real data source (eBird "Download My Data" CSV),
// ONE shareable image. Drop your MyEBirdData.csv → get a badge of your life
// list you can post. The whole product's growth loop lives here: a birder
// posts their badge, another birder clicks "make mine". Everything else in the
// app (multi-hobby sash, connect flow, quests) is parked for v2.
//
// The card is drawn as a single self-contained <svg> so it exports to PNG
// cleanly (serialize → <img> → canvas → toBlob), with no server round-trip and
// nothing uploaded — the CSV is parsed entirely in the browser.

const CARD_W = 640
const CARD_H = 800

export interface BadgeData {
  name: string
  species: number
  topBirds: string[]
  lastActive?: string
  checklists: number
  medal: MedalProgress
}

/** Turn parsed eBird rows into everything the badge needs to render. */
export function toBadge(rows: EbirdCsvRow[], displayName: string): BadgeData {
  const activity = ebirdCsvToActivity(rows)

  // Top birds = most-frequently-logged distinct species (a fun "signature"
  // line). Count occurrences, drop the same non-species markers the life-list
  // count drops, take the top few by frequency.
  const isCountable = (n: string) =>
    n && !/\bsp\.(?!\w)/i.test(n) && !n.includes('/') && !/\bhybrid\b/i.test(n)
  const freq = new Map<string, number>()
  for (const r of rows) {
    if (!isCountable(r.commonName)) continue
    freq.set(r.commonName, (freq.get(r.commonName) ?? 0) + 1)
  }
  const topBirds = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name)

  const checklists = new Set(rows.map((r) => r.submissionId).filter(Boolean)).size

  const lifeList = medalsForHobby('Birding')[0]
  const medal = medalProgress(lifeList, activity.activityCount)

  return {
    name: displayName,
    species: activity.activityCount,
    topBirds,
    lastActive: activity.lastActive,
    checklists,
    medal,
  }
}

/** The badge card as pure SVG markup — reused for both display and PNG export. */
function BadgeCard({ data }: { data: BadgeData }) {
  const color = CATEGORY_COLOR['Outdoors'] ?? '#2f9e44'
  const emblem = resolveArt('Birding', '🐦')
  const tier = data.medal.earned?.name ?? null
  const tierWord = data.medal.maxed ? 'Platinum' : (tier ?? 'Getting started')
  const next = data.medal.next
  const r = 140 // big center patch radius
  const bumps = Math.max(10, Math.round(r / 4.5))
  const emblemScale = (r * 1.15) / 100

  return (
    <svg
      width={CARD_W}
      height={CARD_H}
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', borderRadius: 18 }}
    >
      <defs>
        <linearGradient id="badge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e1726" />
          <stop offset="100%" stopColor="#1a2b16" />
        </linearGradient>
        <linearGradient id="badge-thread" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(color, 26)} />
          <stop offset="100%" stopColor={shade(color, -22)} />
        </linearGradient>
        <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* backdrop */}
      <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="18" fill="url(#badge-bg)" />

      {/* header */}
      <text x={CARD_W / 2} y="66" textAnchor="middle" fill="#eef2f7" fontSize="30" fontWeight="800"
        fontFamily="system-ui, sans-serif">
        {data.name}'s Life List
      </text>
      <text x={CARD_W / 2} y="98" textAnchor="middle" fill="#9fb0c3" fontSize="16"
        fontFamily="system-ui, sans-serif">
        Birding · via eBird
      </text>

      {/* the merit patch, centered */}
      <g transform={`translate(${CARD_W / 2}, 290)`} filter="url(#badge-shadow)">
        <path d={scallop(r, bumps)} fill={shade(color, -30)} />
        <circle
          r={r * 0.82}
          fill="url(#badge-thread)"
          stroke="#fff"
          strokeOpacity="0.85"
          strokeWidth={Math.max(1.5, r * 0.03)}
          strokeDasharray={`${r * 0.16} ${r * 0.09}`}
        />
        {emblem.kind === 'image' ? (
          <image href={emblem.href} width={100 * emblemScale} height={100 * emblemScale}
            x={-50 * emblemScale} y={-64 * emblemScale} preserveAspectRatio="xMidYMid meet" />
        ) : emblem.kind === 'emoji' ? (
          <text textAnchor="middle" dominantBaseline="central" y={-14} fontSize={r * 0.55}>
            {emblem.glyph}
          </text>
        ) : (
          <g transform={`translate(${-50 * emblemScale},${-64 * emblemScale}) scale(${emblemScale})`}
            color="#fff" dangerouslySetInnerHTML={{ __html: emblem.svg }} />
        )}
        {/* big species number on the patch */}
        <text textAnchor="middle" dominantBaseline="central" y={r * 0.34} fill="#fff"
          fontSize={r * 0.42} fontWeight="900"
          fontFamily="system-ui, sans-serif"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,.6)' }}>
          {data.species}
        </text>
        <text textAnchor="middle" dominantBaseline="central" y={r * 0.62} fill="#fff"
          fontSize={r * 0.13} fontWeight="700" letterSpacing="1.5"
          fontFamily="system-ui, sans-serif" opacity="0.9">
          SPECIES
        </text>
      </g>

      {/* tier */}
      <text x={CARD_W / 2} y="480" textAnchor="middle" fill="#ffd43b" fontSize="24" fontWeight="800"
        fontFamily="system-ui, sans-serif">
        {tierWord} birder
      </text>
      {next && (
        <text x={CARD_W / 2} y="510" textAnchor="middle" fill="#9fb0c3" fontSize="15"
          fontFamily="system-ui, sans-serif">
          {next.threshold - data.species} more to {next.name}
        </text>
      )}

      {/* stat strip */}
      <g fontFamily="system-ui, sans-serif" textAnchor="middle">
        <text x={CARD_W * 0.28} y="580" fill="#eef2f7" fontSize="26" fontWeight="800">
          {data.checklists}
        </text>
        <text x={CARD_W * 0.28} y="602" fill="#9fb0c3" fontSize="13">checklists</text>
        <text x={CARD_W * 0.72} y="580" fill="#eef2f7" fontSize="20" fontWeight="800">
          {data.lastActive ?? '—'}
        </text>
        <text x={CARD_W * 0.72} y="602" fill="#9fb0c3" fontSize="13">last outing</text>
      </g>

      {/* signature birds */}
      {data.topBirds.length > 0 && (
        <>
          <text x={CARD_W / 2} y="656" textAnchor="middle" fill="#9fb0c3" fontSize="13"
            letterSpacing="1.5" fontFamily="system-ui, sans-serif">
            MOST LOGGED
          </text>
          {data.topBirds.map((b, i) => (
            <text key={b} x={CARD_W / 2} y={680 + i * 24} textAnchor="middle" fill="#dfe7ef"
              fontSize="16" fontFamily="system-ui, sans-serif">
              {b}
            </text>
          ))}
        </>
      )}

      {/* footer / make-your-own */}
      <text x={CARD_W / 2} y={CARD_H - 22} textAnchor="middle" fill="#6b7c90" fontSize="13"
        fontFamily="system-ui, sans-serif">
        the-hobbyist · make your own life-list badge
      </text>
    </svg>
  )
}

/**
 * Serialize an <svg> element to a PNG blob at 2× for crisp sharing.
 * Pure DOM/canvas — no dependency, no upload.
 */
async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg)
  const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('render failed'))
    img.src = svg64
  })
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W * scale
  canvas.height = CARD_H * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  )
}

/** The v1 page: drop a CSV, get a shareable badge, download it as PNG. */
export function BirdBadge() {
  const [data, setData] = useState<BadgeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const svgWrapRef = useRef<HTMLDivElement>(null)

  const displayName = name.trim() || 'My'

  // Rebuild the badge if the name changes after a file is loaded.
  const rowsRef = useRef<EbirdCsvRow[] | null>(null)
  const badge = useMemo(() => {
    if (!rowsRef.current) return data
    return toBadge(rowsRef.current, displayName)
  }, [data, displayName])

  function handleFile(file: File) {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseEbirdCsv(String(reader.result ?? ''))
        if (rows.length === 0) {
          setError('No rows found — is this a MyEBirdData.csv export?')
          return
        }
        rowsRef.current = rows
        setData(toBadge(rows, displayName))
      } catch {
        setError('Could not parse that file.')
      }
    }
    reader.readAsText(file)
  }

  async function download() {
    const svg = svgWrapRef.current?.querySelector('svg')
    if (!svg) return
    try {
      const blob = await svgToPng(svg)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `life-list-badge.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not export the image. Try a different browser.')
    }
  }

  return (
    <main className="page badge-page">
      <header>
        <h1>Your Life List, as a Badge</h1>
        <p className="tagline">
          Drop your eBird export — get a shareable badge of every species you've
          seen. Parsed in your browser. Nothing uploaded.
        </p>
      </header>

      {!badge && (
        <section className="cloud-card">
          <label className="badge-name-field">
            Your name (optional)
            <input
              type="text"
              value={name}
              placeholder="e.g. Michael"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="drop drop-big" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span className="drop-plus">＋</span>
            Choose your MyEBirdData.csv
          </label>

          <p className="hint" style={{ marginTop: 12 }}>
            Get it from <strong>eBird → Download My Data</strong> — you'll be
            emailed a ZIP; unzip it and drop <code>MyEBirdData.csv</code> here.
          </p>
          {error && <p className="score" style={{ color: '#ff8787' }}>{error}</p>}
        </section>
      )}

      {badge && (
        <section className="cloud-card badge-result">
          <div className="badge-svg-wrap" ref={svgWrapRef}>
            <BadgeCard data={badge} />
          </div>
          <div className="badge-actions">
            <button className="badge-primary" onClick={download}>⬇ Download PNG</button>
            <button
              className="replay"
              onClick={() => { rowsRef.current = null; setData(null) }}
            >
              ↺ Start over
            </button>
          </div>
          <p className="hint" style={{ textAlign: 'center' }}>
            Post it and tag a birder — then send them here to make theirs.
          </p>
          {error && <p className="score" style={{ color: '#ff8787' }}>{error}</p>}
        </section>
      )}
    </main>
  )
}

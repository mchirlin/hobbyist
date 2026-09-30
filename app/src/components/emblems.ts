// Hand-drawn SVG emblems for hobby patches — real illustration, not emoji.
// Each emblem is authored on a 100×100 viewBox, centered, single-color
// (currentColor via `fill`/`stroke`) so it reads as an embroidered patch icon.
// Keep them simple, bold, and iconic — like a scout merit-badge silhouette.

export const EMBLEMS: Record<string, string> = {
  // 3D Printing — a printer extruding a layered object
  '3D Printing': `
    <rect x="24" y="20" width="52" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="5"/>
    <rect x="34" y="30" width="32" height="8" rx="2" fill="currentColor"/>
    <line x1="50" y1="50" x2="50" y2="62" stroke="currentColor" stroke-width="5"/>
    <path d="M34 62 h32 v6 h-32 z M37 68 h26 v6 h-26 z M40 74 h20 v6 h-20 z" fill="currentColor"/>
  `,
  // Electronics — a resistor / circuit node
  'Electronics': `
    <line x1="14" y1="50" x2="34" y2="50" stroke="currentColor" stroke-width="5"/>
    <path d="M34 50 l6 -14 l10 28 l10 -28 l10 28 l6 -14" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <line x1="66" y1="50" x2="86" y2="50" stroke="currentColor" stroke-width="5"/>
    <circle cx="14" cy="50" r="6" fill="currentColor"/>
    <circle cx="86" cy="50" r="6" fill="currentColor"/>
  `,
  // Ultimate — a flying disc
  'Ultimate': `
    <ellipse cx="50" cy="52" rx="34" ry="14" fill="none" stroke="currentColor" stroke-width="5"/>
    <ellipse cx="50" cy="47" rx="34" ry="14" fill="none" stroke="currentColor" stroke-width="5"/>
    <ellipse cx="50" cy="49" rx="18" ry="7" fill="none" stroke="currentColor" stroke-width="4"/>
  `,
  // Ukulele — a small guitar body + neck
  'Ukulele': `
    <path d="M50 26 v30" stroke="currentColor" stroke-width="5"/>
    <rect x="45" y="14" width="10" height="16" rx="3" fill="currentColor"/>
    <circle cx="50" cy="66" r="20" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="50" cy="66" r="7" fill="currentColor"/>
  `,
  // Geocaching — a map pin
  'Geocaching': `
    <path d="M50 18 c-15 0 -26 11 -26 26 c0 20 26 40 26 40 c0 0 26 -20 26 -40 c0 -15 -11 -26 -26 -26 z" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="50" cy="44" r="10" fill="currentColor"/>
  `,
  // Birding — a simple bird
  'Birding': `
    <path d="M26 58 c0 -16 12 -26 26 -26 c8 0 14 3 18 8 l10 -4 l-6 10 c2 4 2 10 0 14 c-6 12 -22 16 -34 10" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="60" cy="44" r="3.5" fill="currentColor"/>
    <path d="M40 60 l-14 14" stroke="currentColor" stroke-width="5"/>
  `,
  // PCB — a chip with legs
  'PCB': `
    <rect x="32" y="32" width="36" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="50" cy="50" r="6" fill="currentColor"/>
    <g stroke="currentColor" stroke-width="5">
      <line x1="24" y1="40" x2="32" y2="40"/><line x1="24" y1="50" x2="32" y2="50"/><line x1="24" y1="60" x2="32" y2="60"/>
      <line x1="68" y1="40" x2="76" y2="40"/><line x1="68" y1="50" x2="76" y2="50"/><line x1="68" y1="60" x2="76" y2="60"/>
      <line x1="40" y1="24" x2="40" y2="32"/><line x1="50" y1="24" x2="50" y2="32"/><line x1="60" y1="24" x2="60" y2="32"/>
      <line x1="40" y1="68" x2="40" y2="76"/><line x1="50" y1="68" x2="50" y2="76"/><line x1="60" y1="68" x2="60" y2="76"/>
    </g>
  `,
  // Video Making — a clapperboard
  'Video Making': `
    <rect x="24" y="42" width="52" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="5"/>
    <path d="M24 42 l6 -12 l10 4 l6 -10 l10 4 l6 -10 l10 4 l-4 20 z" fill="currentColor"/>
  `,
  // Storytelling — an open book
  'Storytelling': `
    <path d="M50 30 c-10 -8 -22 -8 -30 -4 v42 c8 -4 20 -4 30 4 c10 -8 22 -8 30 -4 v-42 c-8 -4 -20 -4 -30 4 z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <line x1="50" y1="30" x2="50" y2="72" stroke="currentColor" stroke-width="4"/>
  `,
  // Knitting — a ball of yarn with needles
  'Knitting': `
    <circle cx="48" cy="56" r="22" fill="none" stroke="currentColor" stroke-width="5"/>
    <path d="M34 46 q14 8 28 0 M32 56 q16 10 32 0 M36 66 q12 6 24 0" fill="none" stroke="currentColor" stroke-width="3.5"/>
    <line x1="60" y1="30" x2="42" y2="66" stroke="currentColor" stroke-width="4"/>
    <line x1="72" y1="34" x2="54" y2="70" stroke="currentColor" stroke-width="4"/>
  `,
}

// Fallback emblem: a star.
export const STAR_EMBLEM = `
  <path d="M50 20 l9 20 l22 2 l-16 15 l5 22 l-20 -11 l-20 11 l5 -22 l-16 -15 l22 -2 z"
        fill="currentColor"/>
`

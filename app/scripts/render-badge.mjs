// Renders the Patch Sash to a standalone SVG — no browser needed.
// Mirrors src/components/PatchSash.tsx. Run: node scripts/render-badge.mjs
import { pack, hierarchy } from 'd3-hierarchy'
import { readFileSync, writeFileSync } from 'node:fs'

// pull emblems + colors from the source of truth to avoid drift
const emblemsSrc = readFileSync(new URL('../src/components/emblems.ts', import.meta.url), 'utf8')
function extractEmblems(src) {
  const out = {}
  const re = /'([^']+)':\s*`([\s\S]*?)`/g
  let m
  while ((m = re.exec(src))) out[m[1]] = m[2]
  const star = /STAR_EMBLEM\s*=\s*`([\s\S]*?)`/.exec(src)
  return { out, star: star ? star[1] : '' }
}
const { out: EMBLEMS, star: STAR } = extractEmblems(emblemsSrc)

const hobbies = [
  { name: '3D Printing',  category: 'Making',   importance: 9, level: 2 },
  { name: 'Electronics',  category: 'Making',   importance: 8, level: 1 },
  { name: 'Ultimate',     category: 'Sport',    importance: 8, level: 3 },
  { name: 'Ukulele',      category: 'Music',    importance: 6, level: 1 },
  { name: 'Geocaching',   category: 'Outdoors', importance: 6, level: 1 },
  { name: 'Birding',      category: 'Outdoors', importance: 5, level: 0 },
  { name: 'PCB',          category: 'Making',   importance: 5, level: 1 },
  { name: 'Video Making', category: 'Craft',    importance: 4, level: 1 },
  { name: 'Storytelling', category: 'Mind',     importance: 4, level: 1 },
  { name: 'Knitting',     category: 'Craft',    importance: 3, level: 0 },
]
const COLOR = { Outdoors:'#2f9e44', Making:'#e8590c', Music:'#9c36b5', Games:'#1971c2', Sport:'#e03131', Craft:'#d6336c', Mind:'#0c8599' }
const ARCH = { Outdoors:'The Explorer', Making:'The Maker', Music:'The Performer', Games:'The Strategist', Sport:'The Competitor', Craft:'The Creator', Mind:'The Thinker' }
const LEVELS = ['Novice','Apprentice','Skilled','Expert','Master']
const NAME = 'Michael'

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16)
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255
  const adj=(c)=>Math.max(0,Math.min(255,Math.round(c+(pct/100)*(pct<0?c:255-c))))
  return `#${((adj(r)<<16)|(adj(g)<<8)|adj(b)).toString(16).padStart(6,'0')}`
}
function scallop(r, n) {
  const inner = r*0.9; let d=''
  for (let i=0;i<n;i++){
    const a0=(i/n)*Math.PI*2, a1=((i+0.5)/n)*Math.PI*2, a2=((i+1)/n)*Math.PI*2
    if(i===0) d+=`M${(Math.cos(a0)*r).toFixed(1)},${(Math.sin(a0)*r).toFixed(1)}`
    d+=`Q${(Math.cos(a1)*inner).toFixed(1)},${(Math.sin(a1)*inner).toFixed(1)} ${(Math.cos(a2)*r).toFixed(1)},${(Math.sin(a2)*r).toFixed(1)} `
  }
  return d+'Z'
}

const size = 620
const root = hierarchy({ children: hobbies })
  .sum((d)=>(d.importance?d.importance*d.importance:0))
  .sort((a,b)=>(b.value??0)-(a.value??0))
const nodes = pack().size([size, size*0.84]).padding(7)(root).leaves()

const tally={}; for(const h of hobbies) tally[h.category]=(tally[h.category]??0)+h.importance
const dominant=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0][0]
const archetype=ARCH[dominant]

const threads = Object.entries(COLOR).map(([c,col])=>
  `<linearGradient id="thread-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${shade(col,26)}"/><stop offset="100%" stop-color="${shade(col,-22)}"/></linearGradient>`).join('')

let body=''
for (const node of nodes) {
  const h=node.data, color=COLOR[h.category], r=node.r
  const bumps=Math.max(10,Math.round(r/4.5))
  const emblem=EMBLEMS[h.name]??STAR
  const es=(r*1.15)/100
  const showLabel=r>30
  const level=h.level??0
  body+=`<g transform="translate(${node.x.toFixed(1)},${node.y.toFixed(1)})" filter="url(#patchShadow)">`
  body+=`<path d="${scallop(r,bumps)}" fill="${shade(color,-30)}"/>`
  body+=`<circle r="${(r*0.82).toFixed(1)}" fill="url(#thread-${h.category})" stroke="#fff" stroke-opacity="0.85" stroke-width="${Math.max(1.5,r*0.03).toFixed(1)}" stroke-dasharray="${(r*0.16).toFixed(1)} ${(r*0.09).toFixed(1)}"/>`
  body+=`<g transform="translate(${(-50*es).toFixed(1)},${((showLabel?-58:-50)*es).toFixed(1)}) scale(${es.toFixed(3)})" style="color:#fff" opacity="0.96">${emblem}</g>`
  if(showLabel) body+=`<text text-anchor="middle" dominant-baseline="central" y="${(r*0.4).toFixed(1)}" font-size="${Math.max(9,r*0.15).toFixed(1)}" fill="#fff" font-weight="800">${h.name}</text>`
  for(let k=0;k<Math.min(level,LEVELS.length-1);k++){
    const arr=Math.min(level,LEVELS.length-1)
    const t=arr===1?0:(k/(arr-1)-0.5)
    const ang=Math.PI/2+t*0.5
    body+=`<circle cx="${(Math.cos(ang)*r*0.72).toFixed(1)}" cy="${(Math.sin(ang)*r*0.72).toFixed(1)}" r="${Math.max(2,r*0.05).toFixed(1)}" fill="#ffd43b" stroke="${shade(color,-40)}" stroke-width="1"/>`
  }
  body+=`</g>`
}

const bannerY=size*0.86
const banner=`<g transform="translate(${size/2},${bannerY})"><rect x="${-size*0.42}" y="-2" width="${size*0.84}" height="1.5" fill="#ffd43b" opacity="0.6"/><text text-anchor="middle" y="${size*0.05}" font-size="${size*0.055}" fill="#fff" font-weight="900" letter-spacing="0.02em">${NAME.toUpperCase()}</text><text text-anchor="middle" y="${size*0.095}" font-size="${size*0.03}" fill="#ffd43b" font-weight="700" letter-spacing="0.16em">${archetype.toUpperCase()}</text></g>`

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><radialGradient id="felt" cx="50%" cy="35%" r="85%"><stop offset="0%" stop-color="#20242e"/><stop offset="100%" stop-color="#0d0f15"/></radialGradient><filter id="patchShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/></filter>${threads}</defs><rect width="${size}" height="${size}" rx="26" fill="url(#felt)"/><rect x="${size*0.12}" y="0" width="${size*0.76}" height="${size}" fill="#ffffff" opacity="0.03"/>${body}${banner}</svg>`
writeFileSync(new URL('../badge-preview.svg', import.meta.url), svg)
console.log('wrote badge-preview.svg')

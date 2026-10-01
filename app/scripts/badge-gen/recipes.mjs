// Badge generation recipes — the POC-settled spec (COMMUNITY-MODEL §7.1,
// badge-style-recipes.md) encoded as code so the local generator and any future
// server-side proxy share ONE source of truth instead of re-deriving prompts.
//
// This module is pure data + a prompt builder. No AWS, no fs — see generate.mjs
// for the invoke. Kept .mjs (not .ts) so it runs under plain `node` with no
// build step, matching the existing scripts/render-badge.mjs convention.

/** Shared Bedrock invoke config (POC). Prod swaps the profile for a role. */
export const INVOKE = {
  region: 'us-west-2',
  modelId: 'stability.stable-image-core-v1:1',
  profile: 'hobbyist',
  outputFormat: 'png',
  aspectRatio: '1:1',
}

// The six tiers across two media. Order is the progression ladder.
// `medium` picks the style suffix; `anchor` fills the medium's color/gem slot.
export const TIERS = [
  { key: 'copper', label: 'Copper', medium: 'patch', metal: 'polished copper', hex: '#B87333' },
  { key: 'silver', label: 'Silver', medium: 'patch', metal: 'bright silver', hex: '#C0C0C0' },
  { key: 'gold', label: 'Gold', medium: 'patch', metal: 'rich metallic gold', hex: '#D4AF37' },
  { key: 'emerald', label: 'Emerald', medium: 'jewel', gem: 'brilliant green emerald' },
  { key: 'ruby', label: 'Ruby', medium: 'jewel', gem: 'deep red ruby' },
  { key: 'diamond', label: 'Diamond', medium: 'jewel', gem: 'sparkling clear diamond' },
]

// ---- Style suffixes per medium (append after the subject phrase) -----------

function patchSuffix(subjectNoun, metal, hex) {
  return (
    `circular embroidered iron-on patch, single centered ${subjectNoun} emblem, ` +
    `flat limited color palette, satin-stitch texture, plain white background, no text, ` +
    `with a thick solid ${metal} satin-stitch merrowed border, ` +
    `the entire border thread is ${metal} (${hex}), uniform ${metal} metallic rim`
  )
}

function jewelSuffix(subjectNoun, gem) {
  return (
    `luxurious circular cloisonne enamel medallion, polished metal setting, ` +
    `glossy vitreous enamel artwork of the ${subjectNoun}, a large faceted ${gem} gemstone, ` +
    `${gem} jewels inlaid in the metal rim, ornate jewelry, high gloss, studio lighting, ` +
    `plain white background, no text, no fabric, no stitching`
  )
}

const PATCH_NEGATIVE =
  'green border, laurel leaves on border, multicolored border, rainbow rim, mismatched border color'
const JEWEL_NEGATIVE = 'fabric, cloth, embroidery, stitching, thread, patch texture, matte, muddy'

/**
 * Build the full Bedrock request body for one hobby + tier.
 * @param subject - the curated subject NOUN phrase, e.g. "a single bluebird perched on a leafy branch".
 * @param tier - one of TIERS.
 * @param seed - integer; FIX this per hobby so the emblem stays stable across tiers.
 */
export function buildRequest(subject, tier, seed) {
  const isPatch = tier.medium === 'patch'
  const prompt = isPatch
    ? patchSuffix(subject, tier.metal, tier.hex)
    : jewelSuffix(subject, tier.gem)
  return {
    prompt: `${subject}, ${prompt}`,
    negative_prompt: isPatch ? PATCH_NEGATIVE : JEWEL_NEGATIVE,
    output_format: INVOKE.outputFormat,
    aspect_ratio: INVOKE.aspectRatio,
    seed,
  }
}

/** Deterministic seed from a hobby slug so re-runs reproduce the same emblem. */
export function seedForSlug(slug) {
  let h = 0
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 4294967295 || 1 // Stability seed range; avoid 0 (= random)
}

// Curated subject phrases per hobby (POC examples). Key by hobby display name.
// Falls back to a generic literal phrase; raw hobby names cause gremlins.
export const SUBJECTS = {
  Birding: 'a single bluebird perched on a leafy branch',
  Climbing: 'a snow-capped mountain peak',
  '3D Printing': 'a small 3D printer with a plain cube sitting on its print bed',
  'Board Games': 'three wooden game pawns beside two dice',
  Reading: 'a single open book with a ribbon bookmark',
}

export function subjectFor(hobbyName) {
  return SUBJECTS[hobbyName] ?? `a single clean iconic symbol representing ${hobbyName}`
}

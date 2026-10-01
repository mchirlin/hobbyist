// Generated badge registry — wires the LOCALLY generated tier PNGs
// (scripts/badge-gen/generate.mjs → src/badges/generated/<slug>/<tier>.png)
// into the art pipeline with ZERO per-badge code edits.
//
// Vite's import.meta.glob eagerly imports every PNG under generated/ at build
// time as a URL, so dropping a new hobby's folder in is enough — no import line
// to add. The files themselves are gitignored (large binaries, reproducible
// from recipes.mjs), so this registry is simply empty when none have been
// generated, and the art pipeline falls back to the hand-drawn emblems.
//
// Tier keys match recipes.mjs TIERS: copper, silver, gold, emerald, ruby, diamond.
// The app's live MedalTier ladder (Bronze/Silver/Gold/Platinum) is a SEPARATE
// concern; mapping the earned medal tier onto a generated-art tier and threading
// it through resolveArt is the next step (see scripts/badge-gen/README.md).

import { registerArt } from './art'

export type GeneratedTier = 'copper' | 'silver' | 'gold' | 'emerald' | 'ruby' | 'diamond'

// eager:true + import:'default' → each value is the asset URL string.
const modules = import.meta.glob('../badges/generated/*/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

// slug → { tier → url }
const bySlug = new Map<string, Partial<Record<GeneratedTier, string>>>()
for (const [path, url] of Object.entries(modules)) {
  const m = path.match(/generated\/([^/]+)\/([^/]+)\.png$/)
  if (!m) continue
  const [, slug, tier] = m
  const bucket = bySlug.get(slug) ?? {}
  bucket[tier as GeneratedTier] = url
  bySlug.set(slug, bucket)
}

/** The generated art URL for a hobby slug + tier, or undefined if not generated. */
export function generatedBadge(slug: string, tier: GeneratedTier): string | undefined {
  return bySlug.get(slug)?.[tier]
}

/** Slugs that have at least one generated tier badge. */
export function slugsWithGeneratedBadges(): string[] {
  return [...bySlug.keys()]
}

/** Highest generated tier present for a slug, in ladder order. */
const LADDER: GeneratedTier[] = ['copper', 'silver', 'gold', 'emerald', 'ruby', 'diamond']
export function topGeneratedTier(slug: string): GeneratedTier | undefined {
  const bucket = bySlug.get(slug)
  if (!bucket) return undefined
  for (let i = LADDER.length - 1; i >= 0; i--) {
    if (bucket[LADDER[i]]) return LADDER[i]
  }
  return undefined
}

/**
 * Register generated art into the existing (tier-agnostic) art pipeline, keyed
 * by hobby NAME, using the highest available tier as the representative image.
 * This lights up the current sash/badge renderers immediately. A later renderer
 * change can select the per-earned-tier image via generatedBadge() directly.
 */
export function registerGeneratedBadges(nameBySlug: Record<string, string>): void {
  for (const slug of bySlug.keys()) {
    const tier = topGeneratedTier(slug)
    if (!tier) continue
    const url = generatedBadge(slug, tier)!
    const name = nameBySlug[slug]
    if (name) registerArt(name, url, `${name} ${tier} badge`)
  }
}

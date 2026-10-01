// Registers the real badge-image assets as INLINE SVG. Importing this once
// (from the app entry) wires finished art into the pipeline; hobbies without an
// entry fall back to the hand-drawn inline emblem automatically.
//
// Inline (not an external <image href>) on purpose: it renders live AND
// serializes into the PNG export, and it does not depend on the deployed base
// path — an external /badges/*.svg 404s under GitHub Pages' /hobbyist/ base and
// also fails to load inside the detached image used for PNG rasterization.
//
// To add finished art for a hobby: drop the file in src/badges/ and add one
// import + registerInlineArt line here — nothing in PatchSash changes.

import { registerInlineArt, hobbiesWithArt, unregisterArt } from './art'
import { registerGeneratedBadges, slugsWithGeneratedBadges } from './generatedBadges'
import { buildSeedDefinitions } from '../data/hobbyDefinition'
import birdingSvg from '../badges/birding.svg?raw'
import ultimateSvg from '../badges/ultimate.svg?raw'

export function registerBadgeArt(): void {
  if (hobbiesWithArt().length > 0) return // idempotent

  // Hand-drawn fallbacks first.
  registerInlineArt('Birding', birdingSvg)
  registerInlineArt('Ultimate', ultimateSvg)

  // Generated tier badges (local author-time output) are real art and WIN over
  // a hand-drawn emblem for the same hobby. Keyed by hobby NAME via the seed
  // definitions' slug→name map. When none are generated this is a no-op and the
  // hand-drawn emblems stand.
  if (slugsWithGeneratedBadges().length > 0) {
    const nameBySlug: Record<string, string> = {}
    for (const def of buildSeedDefinitions()) nameBySlug[def.slug] = def.name
    // registerArt (external image) + registerInlineArt both resolve, but inline
    // is preferred by resolveArt — so clear any hand-drawn inline for a hobby
    // that now has generated art, then register the generated image.
    for (const slug of slugsWithGeneratedBadges()) {
      const name = nameBySlug[slug]
      if (name) unregisterArt(name)
    }
    registerGeneratedBadges(nameBySlug)
  }
}

// Badge-art pipeline — makes the sash "art-agnostic" (the stated vision goal):
// real illustrated badge images can drop in per hobby WITHOUT touching the sash
// renderer. Each hobby resolves to an ArtDescriptor via a fallback chain:
//
//   1. a registered image (raster/SVG file, e.g. /badges/birding.svg)  ← best
//   2. a hand-drawn inline SVG emblem (EMBLEMS)                         ← current
//   3. the profile hobby's emoji icon                                  ← cheap
//   4. a generic star                                                  ← last resort
//
// The renderer asks resolveArt(name, icon) and gets back a tagged union it
// knows how to paint. Adding real art later is a one-line registerArt() call
// (or dropping a file and mapping it) — no component changes.

import { EMBLEMS, STAR_EMBLEM } from './emblems'
import { earnedBadge, type GeneratedTier } from './generatedBadges'

export type ArtDescriptor =
  | { kind: 'image'; href: string; alt: string } // external raster/SVG asset
  | { kind: 'inline-svg'; svg: string } // hand-drawn emblem markup
  | { kind: 'emoji'; glyph: string } // the hobby's emoji icon

// Registry of real badge-image assets by hobby name. Empty by default — the
// prototype ships with hand-drawn SVGs; this is where finished art plugs in,
// e.g. registerArt('Birding', '/badges/birding.svg', 'Embroidered bird patch').
const ART_IMAGES = new Map<string, { href: string; alt: string }>()
// Inline SVG markup registered per hobby. Preferred over an external image for
// the share badge: inline markup renders live AND survives SVG→canvas→PNG
// serialization, whereas an external <image href> fails to load inside the
// detached data-URL image used for PNG export (and 404s under a deployed base
// path). resolveArt prefers an inline registration over an external image.
const ART_INLINE = new Map<string, string>()

/** Register (or override) a real badge image for a hobby. */
export function registerArt(hobby: string, href: string, alt?: string): void {
  ART_IMAGES.set(hobby, { href, alt: alt ?? `${hobby} badge` })
}

/** Register (or override) inline SVG markup for a hobby (export-safe). */
export function registerInlineArt(hobby: string, svg: string): void {
  ART_INLINE.set(hobby, svg)
}

/** Remove a registered image (test helper / revert to fallback). */
export function unregisterArt(hobby: string): void {
  ART_IMAGES.delete(hobby)
  ART_INLINE.delete(hobby)
}

/** Which hobbies currently have real art registered. */
export function hobbiesWithArt(): string[] {
  return [...new Set([...ART_IMAGES.keys(), ...ART_INLINE.keys()])]
}

/**
 * Resolve the best available art for a hobby, walking the fallback chain.
 * `icon` is the profile hobby's emoji (used only if there's no image/emblem).
 *
 * `opts.slug` + `opts.earnedTier` thread the hobby's EARNED RANK through: when
 * generated tier art exists for that slug at (or below) the earned tier, that
 * tier-specific image wins — so the sash shows copper→ruby as the hobby climbs.
 * Without opts (or with no matching generated art) it falls back to the
 * name-keyed registration chain exactly as before.
 */
export function resolveArt(
  hobby: string,
  icon?: string,
  opts?: { slug?: string; earnedTier?: GeneratedTier },
): ArtDescriptor {
  if (opts?.slug && opts.earnedTier) {
    const href = earnedBadge(opts.slug, opts.earnedTier)
    if (href) return { kind: 'image', href, alt: `${hobby} ${opts.earnedTier} badge` }
  }

  const inline = ART_INLINE.get(hobby)
  if (inline) return { kind: 'inline-svg', svg: inline }

  const image = ART_IMAGES.get(hobby)
  if (image) return { kind: 'image', href: image.href, alt: image.alt }

  const emblem = EMBLEMS[hobby]
  if (emblem) return { kind: 'inline-svg', svg: emblem }

  if (icon) return { kind: 'emoji', glyph: icon }

  return { kind: 'inline-svg', svg: STAR_EMBLEM }
}

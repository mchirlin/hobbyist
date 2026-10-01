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

import { registerInlineArt, hobbiesWithArt } from './art'
import birdingSvg from '../badges/birding.svg?raw'
import ultimateSvg from '../badges/ultimate.svg?raw'

export function registerBadgeArt(): void {
  if (hobbiesWithArt().length > 0) return // idempotent
  registerInlineArt('Birding', birdingSvg)
  registerInlineArt('Ultimate', ultimateSvg)
}

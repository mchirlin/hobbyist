// Registers the real badge-image assets that ship in public/badges/. Importing
// this once (from the app entry) wires finished art into the pipeline; hobbies
// without an entry fall back to the hand-drawn inline emblem automatically.
//
// To add finished art for a hobby: drop the file in public/badges/ and add one
// registerArt line here — nothing in PatchSash changes.

import { registerArt, hobbiesWithArt } from './art'

export function registerBadgeArt(): void {
  if (hobbiesWithArt().length > 0) return // idempotent
  registerArt('Birding', '/badges/birding.svg', 'Embroidered bird patch')
  registerArt('Ultimate', '/badges/ultimate.svg', 'Flying disc patch')
}

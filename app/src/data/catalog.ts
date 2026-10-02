// The UNIVERSAL hobby catalog — committed, versioned, git-tracked ref-data.
//
// COMMUNITY-MODEL §6: hobby definitions are UNIVERSAL (the same ladder/missions/
// badges every user reads), distinct from PER-USER state (enrollments, progress)
// which lives in localStorage. This module is the single read point for that
// universal catalog. It ships as a committed artifact — src/data/definitions.json
// — rather than being reconstructed at runtime from scattered TS consts, so the
// catalog is diffable in git, carries a schema version, and is the honest
// source of truth that a backend would later serve verbatim.
//
// The JSON is GENERATED from buildSeedDefinitions() (the lossless lift from the
// hardcoded catalogs) via `npm run gen:definitions`. A drift-guard test
// (definitions.catalog.test.ts) fails if the committed file ever diverges from
// the generator, so editing a seed const + regenerating keeps them in lockstep.
//
// Importing JSON directly (resolveJsonModule) rather than fetch()ing it means
// the catalog is bundled and base-path-independent — no /hobbyist/ 404 under
// GitHub Pages, no async load race. A real backend swap later changes only this
// module (import → fetch), not its callers.

import type { HobbyDefinition } from './hobbyDefinition'
import catalog from './definitions.json'

/** The committed catalog file's shape: a schema version + the definitions. */
interface CatalogFile {
  schema: number
  definitions: HobbyDefinition[]
}

const file = catalog as unknown as CatalogFile

/** The catalog format version (bumped only when the definition SHAPE changes). */
export const CATALOG_SCHEMA = file.schema

/**
 * The universal hobby catalog — a fresh array each call so callers can't mutate
 * the shared import. This is what the per-user store seeds from on first run,
 * and what a cold visitor (empty localStorage) sees.
 */
export function universalCatalog(): HobbyDefinition[] {
  return file.definitions.map((d) => ({ ...d }))
}

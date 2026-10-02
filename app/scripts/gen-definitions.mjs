// Generate src/data/definitions.json — the committed, versioned UNIVERSAL
// hobby catalog.
//
// WHY THIS EXISTS (COMMUNITY-MODEL §6, the universal/personal split):
//   Hobby definitions are UNIVERSAL ref-data — the same ladder/missions/badges
//   every user reads. Reconstructing that catalog at runtime from scattered TS
//   consts (buildSeedDefinitions) made it an implementation detail, not an
//   artifact: nothing was shippable, versioned, or diffable, and localStorage
//   became the de-facto source of truth. This script LIFTS the generated seed
//   into a committed JSON file so the catalog is a real git-tracked artifact,
//   leaving localStorage to hold ONLY per-user state (enrollments + progress).
//
//   buildSeedDefinitions() remains the GENERATOR (the lossless lift from the
//   hardcoded catalogs stays authoritative and tested). This script runs it and
//   writes the result; a drift-guard test (definitions.catalog.test.ts) fails if
//   the committed JSON ever diverges from the generator, so you regenerate with
//   `npm run gen:definitions` after editing any seed const.
//
// Node runs TS via a tiny on-the-fly transpile through Vite's esbuild (already a
// dependency), so no new tooling: we import the seed builder through a Vite SSR
// load, serialize, and write.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const outPath = resolve(appRoot, 'src/data/definitions.json')

const server = await createServer({
  root: appRoot,
  logLevel: 'error',
  server: { middlewareMode: true },
})
try {
  const mod = await server.ssrLoadModule('/src/data/hobbyDefinition.ts')
  const defs = mod.buildSeedDefinitions()
  const payload = {
    // The catalog format version — bump when the HobbyDefinition SHAPE changes
    // (not when content changes). Lets a future loader migrate old shapes.
    schema: 1,
    definitions: defs,
  }
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')
  console.log(`Wrote ${defs.length} definitions → ${outPath}`)
} finally {
  await server.close()
}

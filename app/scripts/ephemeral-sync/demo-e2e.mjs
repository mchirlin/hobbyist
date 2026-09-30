// End-to-end demo: ephemeral automated login → export → the SAME adapter the
// CSV-import UI uses (parseEbirdCsv + ebirdCsvToActivity) → HobbyActivity.
//
// Proves the automation is just another SOURCE feeding the one activity model:
// whether the CSV arrives by manual drop, email-ingest, or this ephemeral
// browser run, the downstream (parse → normalize → sash) is identical. There is
// NO copy of the parsing logic here — it imports the real adapter.
//
// Run:  node scripts/ephemeral-sync/demo-e2e.mjs
// (uses the demo credentials; a real run would prompt the user for theirs)

import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { build } from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..', '..')

// 1. Run the ephemeral automation (credentials only for this one invocation).
const res = spawnSync(process.execPath, [path.join(__dirname, 'run.mjs')], {
  encoding: 'utf8',
  env: {
    ...process.env,
    MOCKBIRD_USER: process.env.MOCKBIRD_USER ?? 'demo-birder',
    MOCKBIRD_PASS: process.env.MOCKBIRD_PASS ?? 'hunter2-demo',
  },
})
if (res.status !== 0) {
  console.error('automation failed:\n' + res.stderr)
  process.exit(1)
}
process.stderr.write(res.stderr) // runner's progress logs
const csv = res.stdout

// 2. Transpile the REAL adapter (TS) and import it — one source of truth.
// Note: write NEXT TO this script (inside the project tree). $KIROCREW_SCRATCH
// / TMPDIR point at a dir that denies lstat/realpath, which Node's ESM loader
// needs when importing a module — so the OS temp dir can't hold the module.
const outfile = path.join(__dirname, `.adapter.${process.pid}.mjs`)
await build({
  entryPoints: [path.join(APP_ROOT, 'src', 'integrations', 'ebirdCsv.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
})
const { parseEbirdCsv, ebirdCsvToActivity } = await import(pathToFileURL(outfile).href)
try { (await import('node:fs')).rmSync(outfile) } catch { /* best-effort cleanup */ }

const activity = ebirdCsvToActivity(parseEbirdCsv(csv))

console.log('\n=== normalized HobbyActivity (via the REAL ebirdCsv adapter) ===')
console.log(JSON.stringify(activity, null, 2))

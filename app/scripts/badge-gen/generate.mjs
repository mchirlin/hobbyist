// Author-time badge generator — LOCAL ONLY (COMMUNITY-MODEL §7.1 "Option B").
//
// Runs the Bedrock Stable-Image-Core invoke on YOUR machine with the `hobbyist`
// AWS profile and writes the six tier PNGs for one hobby into
// src/badges/generated/<slug>/<tier>.png. This is deliberately NOT an in-app
// button: the app is a static GitHub Pages site with no server to hold AWS
// creds, and badges are authored once per hobby, so a local build step is the
// right shape. The generated PNGs are gitignored (large binaries); the recipes
// that reproduce them live in recipes.mjs + badge-style-recipes.md.
//
// Usage:
//   node scripts/badge-gen/generate.mjs "Birding"
//   node scripts/badge-gen/generate.mjs "Birding" --subject "a tiny owl on a post"
//   node scripts/badge-gen/generate.mjs "Birding" --tiers copper,gold   (subset)
//   node scripts/badge-gen/generate.mjs "Birding" --profile myprofile
//
// Requires: AWS CLI on PATH, the named profile with Bedrock invoke access, and
// the Stability models subscribed in Marketplace (one-time, already done).

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { INVOKE, TIERS, buildRequest, seedForSlug, subjectFor } from './recipes.mjs'
import { slugify } from './slug.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const badgesRoot = join(here, '..', '..', 'src', 'badges', 'generated')

function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) flags[a.slice(2)] = argv[++i]
    else positional.push(a)
  }
  return { positional, flags }
}

function invoke(body, profile) {
  // Write the body to a temp file and shell out to the AWS CLI (no SDK dep),
  // mirroring the POC. --cli-binary-format raw-in-base64-out lets us pass JSON.
  const scratch = process.env.KIROCREW_SCRATCH || process.env.TMPDIR || '/tmp'
  const reqPath = join(scratch, `badge-req-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  const outPath = join(scratch, `badge-out-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(reqPath, JSON.stringify(body))
  try {
    execFileSync(
      'aws',
      [
        'bedrock-runtime', 'invoke-model',
        '--profile', profile,
        '--region', INVOKE.region,
        '--model-id', INVOKE.modelId,
        '--body', `fileb://${reqPath}`,
        '--cli-binary-format', 'raw-in-base64-out',
        outPath,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    const resp = JSON.parse(readFileSync(outPath, 'utf8'))
    const finish = resp.finish_reasons?.[0]
    if (finish != null) throw new Error(`content filtered: ${finish}`)
    const b64 = resp.images?.[0]
    if (!b64) throw new Error('no image in response')
    return Buffer.from(b64, 'base64')
  } finally {
    try { rmSync(reqPath) } catch {}
    try { rmSync(outPath) } catch {}
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const hobby = positional[0]
  if (!hobby) {
    console.error('Usage: node scripts/badge-gen/generate.mjs "<Hobby Name>" [--subject "..."] [--tiers copper,gold] [--profile name]')
    process.exit(1)
  }
  const slug = slugify(hobby)
  const subject = flags.subject || subjectFor(hobby)
  const profile = flags.profile || INVOKE.profile
  const seed = seedForSlug(slug)
  const wanted = flags.tiers ? flags.tiers.split(',').map((t) => t.trim().toLowerCase()) : null
  const tiers = wanted ? TIERS.filter((t) => wanted.includes(t.key)) : TIERS

  const outDir = join(badgesRoot, slug)
  mkdirSync(outDir, { recursive: true })

  console.log(`Generating ${tiers.length} tier badge(s) for "${hobby}" (slug: ${slug}, seed: ${seed})`)
  console.log(`  subject: ${subject}`)
  for (const tier of tiers) {
    process.stdout.write(`  ${tier.label.padEnd(8)} … `)
    try {
      const png = invoke(buildRequest(subject, tier, seed), profile)
      const file = join(outDir, `${tier.key}.png`)
      writeFileSync(file, png)
      console.log(`ok (${(png.length / 1024).toFixed(0)} KB) → ${file}`)
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
    }
  }

  console.log(`\nDone. PNGs in: ${outDir}`)
  console.log('These are gitignored. To wire into the app, see scripts/badge-gen/README.md.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

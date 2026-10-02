// Author-time hobby drafter — the OPTIONAL LLM upgrade. LOCAL ONLY.
//
// The in-app drafter (src/data/draftHobby.ts) is the default: it is pure,
// deterministic, runs in the browser, costs nothing, and produces a complete
// engine-safe draft of every facet (description, levels, missions, quests,
// milestone badges, and resource links). It is what the "✨ Create with AI"
// wizard calls today.
//
// This script is the OPTIONAL richer-copy path, for an author who wants prose
// that reads like a person wrote it (custom rung names, hobby-specific missions,
// a real subreddit the model actually knows). It runs a Bedrock Claude invoke on
// YOUR machine with the `hobbyist` AWS profile — exactly like scripts/badge-gen
// does for art — because the app is a static site with no server to hold AWS
// creds. It prints a HobbyDraft JSON object to stdout in the SAME SHAPE the
// in-app engine emits, so the wizard/store consume it unchanged; the UI never
// knows which drafter produced the content.
//
// WHY A SCRIPT, NOT AN IN-APP CALL: identical reasoning to badge-gen Option B —
// no backend, authored once per hobby, keeps all model/credential handling local.
// When the social backend lands (COMMUNITY-MODEL §6 step 3), a Lambda proxy can
// run this same prompt and the wizard gains an in-app "draft with AI" button
// with no change to the shape it consumes.
//
// Usage:
//   node scripts/draft-gen/draft.mjs "Pottery" --category Craft
//   node scripts/draft-gen/draft.mjs "Pottery" --category Craft > /tmp/pottery.json
//   node scripts/draft-gen/draft.mjs "Pottery" --category Craft --profile myprofile
//
// Then: open the draft JSON, paste its facets into the wizard's review step, or
// (future) load it directly. The in-app template draft remains the zero-setup
// default — this is purely an enrichment.
//
// Requires: AWS CLI on PATH, the named profile with Bedrock invoke access to an
// Anthropic Claude model in the region below.

import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const REGION = 'us-west-2'
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
const PROFILE = 'hobbyist'

const CATEGORIES = ['Outdoors', 'Making', 'Music', 'Games', 'Sport', 'Craft', 'Mind']

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

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** The instruction that makes Claude return exactly our HobbyDraft JSON. */
function buildPrompt(name, category) {
  const slug = slugify(name)
  return (
    `You are drafting a gamified hobby definition for a collection app. Return ONLY a JSON object, no prose.\n\n` +
    `Hobby: "${name}"  Category: ${category}  Slug: ${slug}\n\n` +
    `Produce this exact shape:\n` +
    `{\n` +
    `  "slug": "${slug}",\n` +
    `  "name": "${name}",\n` +
    `  "category": "${category}",\n` +
    `  "emblem": "<one emoji>",\n` +
    `  "description": "<2 sentences: what it is + how to start>",\n` +
    `  "levels": [ {"name":"<rung name in the hobby's voice>","xpThreshold":0}, ... exactly 5 rungs, thresholds 0,60,200,500,1000 ],\n` +
    `  "missions": [ {"text":"<concrete next step>","level":<0-4>}, ... one per level ],\n` +
    `  "quests": [ {"id":"${slug}-daily","cadence":"daily","text":"..."}, {"id":"${slug}-weekly","cadence":"weekly","text":"..."}, {"id":"${slug}-monthly","cadence":"monthly","text":"..."} ],\n` +
    `  "badges": [ {"kind":"milestone","id":"${slug}-ms-<slug>","name":"<achievement>","how":"<how to earn>","claim":"self"}, ... 3 escalating ],\n` +
    `  "resources": [ {"kind":"community","label":"r/<real subreddit>","url":"https://www.reddit.com/r/<real subreddit>/"}, {"kind":"app"|"website","label":"...","url":"https://..."}, ... 2-4 real, well-known links ],\n` +
    `  "admins": ["you"], "memberCount": 1, "version": 1, "status": "draft"\n` +
    `}\n\n` +
    `Rules: use a REAL subreddit you are confident exists. Keep text short and imperative. Thresholds MUST be 0,60,200,500,1000. Return only the JSON.`
  )
}

function invoke(prompt, profile) {
  const scratch = process.env.KIROCREW_SCRATCH || process.env.TMPDIR || '/tmp'
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const reqPath = join(scratch, `draft-req-${stamp}.json`)
  const outPath = join(scratch, `draft-out-${stamp}.json`)
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }],
  }
  writeFileSync(reqPath, JSON.stringify(body))
  try {
    execFileSync(
      'aws',
      [
        'bedrock-runtime', 'invoke-model',
        '--profile', profile,
        '--region', REGION,
        '--model-id', MODEL_ID,
        '--body', `fileb://${reqPath}`,
        '--cli-binary-format', 'raw-in-base64-out',
        outPath,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    const resp = JSON.parse(readFileSync(outPath, 'utf8'))
    const text = resp.content?.[0]?.text
    if (!text) throw new Error('no text in Claude response')
    return text
  } finally {
    try { rmSync(reqPath) } catch {}
    try { rmSync(outPath) } catch {}
  }
}

/** Pull the JSON object out of the model's reply (strips any stray prose/fences). */
function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('no JSON object found in response')
  return JSON.parse(text.slice(start, end + 1))
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const name = positional[0]
  const category = flags.category || 'Making'
  const profile = flags.profile || PROFILE
  if (!name) {
    console.error('Usage: node scripts/draft-gen/draft.mjs "<Hobby Name>" --category <Category> [--profile name]')
    console.error(`Categories: ${CATEGORIES.join(', ')}`)
    process.exit(1)
  }
  if (!CATEGORIES.includes(category)) {
    console.error(`Unknown category "${category}". One of: ${CATEGORIES.join(', ')}`)
    process.exit(1)
  }
  const text = invoke(buildPrompt(name, category), profile)
  const draft = extractJson(text)
  // Pretty-print the draft to stdout; the author pastes/loads it into the wizard.
  process.stdout.write(JSON.stringify(draft, null, 2) + '\n')
}

try {
  main()
} catch (err) {
  console.error(`draft-gen failed: ${err.message}`)
  console.error('The in-app template drafter (the "✨ Create with AI" wizard) needs none of this and always works.')
  process.exit(1)
}

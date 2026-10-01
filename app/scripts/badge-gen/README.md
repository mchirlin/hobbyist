# Local badge generator (author-time, no backend)

Generates the six tier badge images for a hobby by invoking AWS Bedrock
(Stable Image Core, `us-west-2`) **on your machine** with the `hobbyist` AWS
profile, and wires the results into the app with zero per-badge code edits.

This is the local-only "Option B" from `COMMUNITY-MODEL.md` §7.1: the app is a
static GitHub Pages site with no server to hold AWS creds, and a hobby's badges
are authored once, so a local build step is the right shape — not an in-app
button. The exact prompts/params are in `recipes.mjs` (the code form of
`../../../badge-style-recipes.md`).

## Prerequisites

- AWS CLI on PATH.
- The `hobbyist` profile configured with Bedrock invoke access.
- The Stability models subscribed in AWS Marketplace (one-time; already done).

## Generate

```bash
cd app
node scripts/badge-gen/generate.mjs "Birding"
```

Options:

```bash
# override the subject phrase (the quality lever — keep it concrete & singular)
node scripts/badge-gen/generate.mjs "Birding" --subject "a tiny owl perched on a post"

# only some tiers (copper silver gold emerald ruby diamond)
node scripts/badge-gen/generate.mjs "Birding" --tiers gold,ruby

# different AWS profile
node scripts/badge-gen/generate.mjs "Birding" --profile myadmin
```

Output lands in `src/badges/generated/<slug>/<tier>.png` (gitignored — large
binaries, reproducible from `recipes.mjs`). The seed is derived from the slug so
re-runs reproduce the same emblem; only the tier border/medium changes.

## How it wires into the app

`src/components/generatedBadges.ts` discovers every
`src/badges/generated/*/*.png` via Vite's `import.meta.glob` at build time, so
**no import line to add** — generate the folder and it's picked up.
`registerBadgeArt()` (called once from `main.tsx`) registers the highest
available tier per hobby through the existing `art.ts` seam, so the sash/badge
renderers light up immediately.

## Not done yet (follow-ups)

- **Per-earned-tier selection in the renderer.** Today `resolveArt(name, icon)`
  is tier-agnostic, so the registry registers the *top* generated tier as the
  representative image. Threading the member's earned `MedalTier` through
  `resolveArt` → `generatedBadge(slug, tier)` is a renderer change for later.
- **Tier-ladder reconciliation.** The generated art uses the POC ladder
  (copper/silver/gold + emerald/ruby/diamond). The live `MedalTier` is
  Bronze/Silver/Gold/Platinum. Mapping one onto the other is a design decision
  deferred with the renderer change above.
- **AI-assisted authoring.** The broader vision (AI drafts description, levels,
  missions, AND badges on hobby creation) is recorded in
  `.kiro/steering/` — this generator is the badge-image piece of it.

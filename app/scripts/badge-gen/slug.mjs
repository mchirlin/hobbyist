// Node-side slugify — byte-identical to data/hobbyDefinition.ts `slugify`, so a
// generated badge directory name matches the HobbyDefinition slug the app reads.
// Kept as a tiny .mjs twin because the TS version can't be imported under plain
// `node` without a build step. If one changes, change both.
export function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

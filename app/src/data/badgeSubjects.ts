// Badge subject phrases — a TS twin of scripts/badge-gen/recipes.mjs `SUBJECTS`
// / `subjectFor`. The GENERATOR (node) owns the authoritative copy because it
// runs the Bedrock invoke; this twin exists so the wizard can SHOW the admin the
// exact `--subject` phrase the generator will use, and offer a sensible editable
// default. Byte-identical to recipes.mjs — if one changes, change both (same
// drift-twin discipline as scripts/badge-gen/slug.mjs).
//
// The subject phrase is the quality lever: a concrete, singular noun phrase
// avoids the "gremlin" renders (binocular-beaked birds, blob emblems) that a raw
// hobby name produces. Known hobbies get a curated phrase; unknown ones get a
// literal fallback the admin should sharpen before generating.

/** Curated subject phrases per hobby (keyed by display name). */
export const BADGE_SUBJECTS: Record<string, string> = {
  Birding: 'a single bluebird perched on a leafy branch',
  Climbing: 'a snow-capped mountain peak',
  '3D Printing': 'a small 3D printer with a plain cube sitting on its print bed',
  'Board Games': 'three wooden game pawns beside two dice',
  Reading: 'a single open book with a ribbon bookmark',
}

/**
 * The subject phrase the generator will use for a hobby — a curated one when we
 * know it, else the same literal fallback recipes.mjs uses. `isCurated` lets the
 * wizard flag a fallback as "sharpen me before generating".
 */
export function badgeSubjectFor(hobbyName: string): { subject: string; isCurated: boolean } {
  const curated = BADGE_SUBJECTS[hobbyName]
  if (curated) return { subject: curated, isCurated: true }
  return { subject: `a single clean iconic symbol representing ${hobbyName}`, isCurated: false }
}

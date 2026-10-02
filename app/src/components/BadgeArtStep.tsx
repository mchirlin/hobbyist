import { useState } from 'react'
import { badgeSubjectFor } from '../data/badgeSubjects'
import { slugify } from '../data/hobbyDefinition'
import { slugsWithGeneratedBadges, topGeneratedTier } from './generatedBadges'

interface Props {
  /** The hobby being authored. */
  name: string
  /**
   * The subject phrase to pre-fill `--subject`. When omitted, derived from the
   * name (curated when known, else a literal fallback the admin should sharpen).
   */
  subject?: string
  /** Called when the admin edits the subject, so the wizard can carry it. */
  onSubjectChange?: (subject: string) => void
}

/** Shell-quote a phrase for the copy-pasteable command (double quotes + escape). */
function shq(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * The wizard's badge-art step — the bridge from "I just authored a hobby" to the
 * LOCAL badge generator.
 *
 * WHY THIS IS A COMMAND, NOT A BUTTON: the app is a static GitHub Pages site
 * with no backend, and the Bedrock invoke needs an AWS credential that can never
 * ship to the browser (the same local-only constraint behind scripts/badge-gen/
 * — see COMMUNITY-MODEL §7.1 "Option B"). So the honest in-app affordance is to
 * hand the admin the exact, ready-to-run command for THIS hobby — pre-filled
 * name + curated subject phrase — and explain that the six tier PNGs auto-wire
 * via Vite's import.meta.glob on the next build with zero further edits. When a
 * real backend lands later, this same step becomes a live "Generate" button
 * against the proxy with no UX change.
 */
export function BadgeArtStep({ name, subject, onSubjectChange }: Props) {
  const derived = badgeSubjectFor(name)
  const [subj, setSubj] = useState(subject ?? derived.subject)
  const [copied, setCopied] = useState(false)

  const slug = slugify(name)
  const alreadyGenerated = slugsWithGeneratedBadges().includes(slug)
  const tier = alreadyGenerated ? topGeneratedTier(slug) : undefined

  const command = `node scripts/badge-gen/generate.mjs ${shq(name)} --subject ${shq(subj)}`

  function copy() {
    void navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => setCopied(false),
    )
  }

  return (
    <div className="wizard-facet badge-art-step">
      <span className="wizard-facet-label">Badge art</span>

      {alreadyGenerated ? (
        <p className="badge-art-done">
          ✓ Badge art already generated for <strong>{name}</strong>
          {tier ? ` (through ${tier})` : ''}. It’s wired into the sash.
        </p>
      ) : (
        <p className="hint badge-art-hint">
          Badge images are generated locally (no server holds the AWS key). Run
          this once from <code>app/</code> and the six tier badges auto-wire on
          the next build:
        </p>
      )}

      {!derived.isCurated && (
        <p className="badge-art-warn">
          ⚠ No curated art subject for “{name}”. Sharpen the phrase to a single
          concrete object before generating — a vague phrase makes muddy badges.
        </p>
      )}

      <label className="badge-art-subject">
        <span>Art subject (the emblem the AI draws)</span>
        <input
          value={subj}
          onChange={(e) => {
            setSubj(e.target.value)
            onSubjectChange?.(e.target.value)
          }}
          aria-label="Badge art subject"
          placeholder="a single concrete object, e.g. a tiny owl on a post"
        />
      </label>

      <div className="badge-art-cmd">
        <code>{command}</code>
        <button type="button" className="badge-art-copy" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <p className="wizard-foot">
        Needs the AWS CLI + the <code>hobbyist</code> profile. Output lands in{' '}
        <code>src/badges/generated/{slug}/</code> (gitignored) and the sash picks
        it up automatically — refresh after the build.
      </p>
    </div>
  )
}

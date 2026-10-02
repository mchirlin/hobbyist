import { useState } from 'react'
import type { HobbyCategory } from '../data/types'
import { draftHobby, type HobbyDraft } from '../data/draftHobby'
import type { ResourceKind } from '../data/hobbyDefinition'
import { BadgeArtStep } from './BadgeArtStep'
import { badgeSubjectFor } from '../data/badgeSubjects'

const CATEGORIES: HobbyCategory[] = [
  'Outdoors',
  'Making',
  'Music',
  'Games',
  'Sport',
  'Craft',
  'Mind',
]

const RESOURCE_ICON: Record<ResourceKind, string> = {
  community: '💬',
  app: '📱',
  website: '🌐',
  video: '🎬',
}

interface Props {
  /** Commit the reviewed draft: parent writes the definition + drops the patch. */
  onCommit: (draft: HobbyDraft) => void
  onCancel: () => void
  /** Lowercased names already in the collection, to block duplicates. */
  existing: string[]
}

type Step = 'name' | 'review'

/**
 * The AI-assisted create flow (the authoring vision: "name a hobby and the
 * system drafts the description, levels, missions, quests, badges, and links;
 * the admin reviews and tweaks"). This is the CREATE half of the create/edit
 * split — a multi-step wizard, distinct from the single tabbed EDIT screen.
 *
 * Step 1 (name): the admin gives a name + category. Step 2 (review): we call the
 * pure draft engine to pre-fill EVERY facet, and the admin edits any of them
 * inline before committing. Nothing hits the store until "Create this hobby".
 *
 * The drafter is in-browser + deterministic today (no backend; see draftHobby.ts
 * for why). The "✨ Draft" button is the seam a richer author-time LLM draft
 * plugs into later with zero UI change.
 */
export function CreateHobbyWizard({ onCommit, onCancel, existing }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<HobbyCategory>('Making')
  const [emoji, setEmoji] = useState('')
  const [draft, setDraft] = useState<HobbyDraft | null>(null)
  // The badge-art subject phrase, pre-filled from the curated map on draft and
  // editable in the badge-art step. Carried here so a tweak survives re-renders.
  const [artSubject, setArtSubject] = useState('')

  const trimmed = name.trim()
  const isDup = trimmed.length > 0 && existing.includes(trimmed.toLowerCase())
  const canDraft = trimmed.length > 0 && !isDup

  function generate() {
    if (!canDraft) return
    const { draft } = draftHobby(trimmed, category, { emblem: emoji.trim() || undefined })
    setDraft(draft)
    setArtSubject(badgeSubjectFor(trimmed).subject)
    setStep('review')
  }

  // ---- editing helpers on the draft (immutable updates) --------------------
  function patch(partial: Partial<HobbyDraft>) {
    setDraft((d) => (d ? { ...d, ...partial } : d))
  }

  if (step === 'name') {
    return (
      <div className="wizard" role="group" aria-label="Create a hobby">
        <div className="wizard-head">
          <h3>✨ Create a hobby</h3>
          <p className="hint">
            Name it and pick a category — then I’ll draft the whole thing
            (description, levels, missions, quests, badges, and links) for you to
            review.
          </p>
        </div>

        <input
          className="wizard-name"
          autoFocus
          placeholder="What are you into? (e.g. Pottery)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') generate()
            if (e.key === 'Escape') onCancel()
          }}
          aria-label="Hobby name"
        />

        <div className="wizard-row">
          <input
            className="wizard-emoji"
            placeholder="🏺"
            maxLength={3}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="Optional emoji"
          />
          <div className="wizard-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`add-hobby-cat cat-${c}${c === category ? ' selected' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isDup && <p className="add-hobby-dup">You already have “{trimmed}”.</p>}

        <div className="wizard-actions">
          <button className="wizard-draft" onClick={generate} disabled={!canDraft}>
            ✨ Draft it for me
          </button>
          <button className="add-hobby-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ---- review step ---------------------------------------------------------
  if (!draft) return null
  return (
    <div className="wizard wizard-review" role="group" aria-label="Review drafted hobby">
      <div className="wizard-head">
        <h3>
          Review your <span className="wizard-emoji-badge">{draft.emblem}</span> {draft.name}
        </h3>
        <p className="hint">
          Everything below was auto-drafted. Tweak anything, then create — or
          regenerate to start over.
        </p>
      </div>

      {/* Description */}
      <label className="wizard-facet">
        <span className="wizard-facet-label">Description</span>
        <textarea
          className="wizard-textarea"
          rows={2}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </label>

      {/* Levels */}
      <div className="wizard-facet">
        <span className="wizard-facet-label">Level ladder</span>
        {draft.levels.map((lvl, i) => (
          <div className="wizard-level" key={i}>
            <input
              className="wizard-level-name"
              value={lvl.name}
              onChange={(e) => {
                const levels = draft.levels.map((l, j) =>
                  j === i ? { ...l, name: e.target.value } : l,
                )
                patch({ levels })
              }}
              aria-label={`Level ${i + 1} name`}
            />
            <span className="wizard-level-xp">{lvl.xpThreshold} XP</span>
          </div>
        ))}
      </div>

      {/* Missions */}
      <div className="wizard-facet">
        <span className="wizard-facet-label">Missions (next steps)</span>
        {draft.missions.map((m, i) => (
          <div className="wizard-mission" key={i}>
            <span className="wizard-mission-lvl">L{m.level}</span>
            <input
              className="wizard-mission-text"
              value={m.text}
              onChange={(e) => {
                const missions = draft.missions.map((mm, j) =>
                  j === i ? { ...mm, text: e.target.value } : mm,
                )
                patch({ missions })
              }}
              aria-label={`Mission ${i + 1}`}
            />
            <button
              className="wizard-del"
              onClick={() => patch({ missions: draft.missions.filter((_, j) => j !== i) })}
              aria-label="Remove mission"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Quests */}
      <div className="wizard-facet">
        <span className="wizard-facet-label">Quests</span>
        {draft.quests.map((q, i) => (
          <div className="wizard-quest" key={q.id}>
            <span className={`wizard-cadence cadence-${q.cadence}`}>{q.cadence}</span>
            <input
              className="wizard-quest-text"
              value={q.text}
              onChange={(e) => {
                const quests = draft.quests.map((qq, j) =>
                  j === i ? { ...qq, text: e.target.value } : qq,
                )
                patch({ quests })
              }}
              aria-label={`${q.cadence} quest`}
            />
          </div>
        ))}
      </div>

      {/* Milestone badges */}
      <div className="wizard-facet">
        <span className="wizard-facet-label">Milestone badges</span>
        {draft.badges.map((b, i) => (
          <div className="wizard-badge" key={b.id}>
            <input
              className="wizard-badge-name"
              value={b.name}
              onChange={(e) => {
                const badges = draft.badges.map((bb, j) =>
                  j === i ? { ...bb, name: e.target.value } : bb,
                )
                patch({ badges })
              }}
              aria-label={`Badge ${i + 1} name`}
            />
            <button
              className="wizard-del"
              onClick={() => patch({ badges: draft.badges.filter((_, j) => j !== i) })}
              aria-label="Remove badge"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Badge art — the bridge to the local generator (no backend; see
          BadgeArtStep for why it's a command, not an in-app invoke). */}
      <BadgeArtStep name={draft.name} subject={artSubject} onSubjectChange={setArtSubject} />

      {/* Resources / links */}
      <div className="wizard-facet">
        <span className="wizard-facet-label">Links &amp; communities</span>
        {draft.resources?.map((r, i) => (
          <div className="wizard-resource" key={i}>
            <span className="wizard-res-icon" title={r.kind}>
              {RESOURCE_ICON[r.kind]}
            </span>
            <input
              className="wizard-res-label"
              value={r.label}
              onChange={(e) => {
                const resources = draft.resources!.map((rr, j) =>
                  j === i ? { ...rr, label: e.target.value } : rr,
                )
                patch({ resources })
              }}
              aria-label={`Resource ${i + 1} label`}
            />
            <input
              className="wizard-res-url"
              value={r.url}
              onChange={(e) => {
                const resources = draft.resources!.map((rr, j) =>
                  j === i ? { ...rr, url: e.target.value } : rr,
                )
                patch({ resources })
              }}
              aria-label={`Resource ${i + 1} URL`}
            />
            <button
              className="wizard-del"
              onClick={() =>
                patch({ resources: draft.resources!.filter((_, j) => j !== i) })
              }
              aria-label="Remove link"
            >
              ✕
            </button>
          </div>
        ))}
        <p className="wizard-foot">
          💬 is the main community board (usually a subreddit). Confirm a guessed
          one actually exists before relying on it.
        </p>
      </div>

      <div className="wizard-actions">
        <button className="wizard-commit" onClick={() => onCommit(draft)}>
          Create this hobby
        </button>
        <button className="add-hobby-cancel" onClick={() => setStep('name')}>
          ← Back
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { definitionStore } from '../data/definitionStore'
import { slugify } from '../data/hobbyDefinition'
import { LevelLadderEditor } from './LevelLadderEditor'
import { MissionEditor } from './MissionEditor'
import { HobbyEditor } from './HobbyEditor'

interface Props {
  hobby: string
}

/**
 * The EDIT flow for a hobby (COMMUNITY-MODEL §3 authoring, and the create-vs-edit
 * split: CREATE is the frictionless declare-first AddHobbyButton; EDIT is this —
 * a single screen with TABS). It replaces the old row of three independent
 * toggle-buttons (ladder / missions / badge) stacked on every card with one
 * "✎ Edit" entry that opens a focused panel: pick a facet (Levels, Missions,
 * Badges, About) and author it. Each tab reuses its existing editor in
 * `embedded` mode, so the authoring logic lives in one place per facet.
 */

type EditTab = 'levels' | 'missions' | 'badges' | 'about'

const TABS: { id: EditTab; label: string }[] = [
  { id: 'levels', label: 'Levels' },
  { id: 'missions', label: 'Missions' },
  { id: 'badges', label: 'Badges' },
  { id: 'about', label: 'About' },
]

export function HobbyEditPanel({ hobby }: Props) {
  const slug = slugify(hobby)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<EditTab>('levels')

  if (!open) {
    return (
      <button className="edit-hobby-toggle" onClick={() => setOpen(true)} type="button">
        ✎ Edit {hobby}
      </button>
    )
  }

  return (
    <div className="edit-panel" aria-label={`Edit ${hobby}`}>
      <div className="edit-panel-head">
        <span className="edit-panel-title">Editing {hobby}</span>
        <button
          className="edit-panel-close"
          onClick={() => setOpen(false)}
          aria-label={`Close editing ${hobby}`}
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="edit-tabs" role="tablist" aria-label={`${hobby} edit facets`}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={'edit-tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="edit-tab-body" role="tabpanel">
        {tab === 'levels' && <LevelLadderEditor hobby={hobby} embedded />}
        {tab === 'missions' && <MissionEditor hobby={hobby} embedded />}
        {tab === 'badges' && <HobbyEditor hobby={hobby} embedded />}
        {tab === 'about' && <DescriptionEditor slug={slug} />}
      </div>
    </div>
  )
}

/**
 * The About tab — edit the hobby's free-text description ("how to get started").
 * Commits through definitionStore.setDescription. Local draft so typing is
 * smooth; Save persists, and the field re-seeds from the live definition each
 * time the panel is used.
 */
function DescriptionEditor({ slug }: { slug: string }) {
  const current = definitionStore.find(slug)?.description ?? ''
  const [draft, setDraft] = useState(current)
  const [saved, setSaved] = useState(false)

  function save() {
    definitionStore.setDescription(slug, draft.trim())
    setSaved(true)
  }

  return (
    <div className="desc-editor">
      <label className="desc-label" htmlFor={`desc-${slug}`}>
        Description
      </label>
      <textarea
        id={`desc-${slug}`}
        className="desc-input"
        rows={4}
        value={draft}
        placeholder="A short description — what this hobby is and how to get started."
        onChange={(e) => {
          setDraft(e.target.value)
          setSaved(false)
        }}
        aria-label="Hobby description"
      />
      <div className="desc-actions">
        <button className="desc-save" onClick={save} type="button">
          Save description
        </button>
        {saved && <span className="desc-saved">Saved ✓</span>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { definitionStore } from '../data/definitionStore'
import {
  slugify,
  levelNamesFromDefinition,
  missionsFromDefinition,
} from '../data/hobbyDefinition'

interface Props {
  hobby: string
  /** When true, render the form directly (no toggle button) — for the edit panel. */
  embedded?: boolean
}

/**
 * Mission authoring surface (COMMUNITY-MODEL §3): let an admin write the
 * per-rung "what do I do next" steps instead of them being baked into the seed
 * profile. A mission is text + the level (rung) it belongs to — the rung picker
 * uses the hobby's OWN author-named ladder (via LevelLadderEditor), so missions
 * and rungs stay in sync. Edits commit through definitionStore.addMission /
 * removeMission and surface live as the card's "🎯 Next mission".
 */
export function MissionEditor({ hobby, embedded = false }: Props) {
  const slug = slugify(hobby)
  const def = definitionStore.find(slug)
  const rungNames = def ? levelNamesFromDefinition(def) : ['Novice']
  const missions = def ? missionsFromDefinition(def) : []

  const [open, setOpen] = useState(embedded)
  const [text, setText] = useState('')
  const [level, setLevel] = useState(0)

  function add() {
    const trimmed = text.trim()
    if (!trimmed) return
    definitionStore.addMission(slug, { text: trimmed, level })
    setText('')
    setLevel(0)
  }

  if (!open && !embedded) {
    return (
      <button className="mission-toggle" onClick={() => setOpen(true)}>
        🎯 Author missions
      </button>
    )
  }

  return (
    <div className="mission-editor" aria-label={`Edit missions for ${hobby}`}>
      <div className="mission-editor-head">Missions by rung</div>

      {/* existing authored missions, grouped by rung for scannability */}
      {missions.length > 0 ? (
        <ul className="mission-editor-list">
          {missions.map((m, i) => (
            <li className="mission-editor-item" key={`${m.text}-${i}`}>
              <span className="mission-editor-rung">
                {rungNames[Math.min(m.level, rungNames.length - 1)]}
              </span>
              <span className="mission-editor-text">{m.text}</span>
              <button
                className="mission-editor-remove"
                onClick={() => definitionStore.removeMission(slug, i)}
                aria-label={`Remove mission: ${m.text}`}
                type="button"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mission-editor-empty">No missions yet — add the first step.</p>
      )}

      <div className="mission-editor-add">
        <select
          className="mission-editor-level"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          aria-label="Mission rung"
        >
          {rungNames.map((name, i) => (
            <option value={i} key={`${name}-${i}`}>
              {name}
            </option>
          ))}
        </select>
        <input
          className="mission-editor-input"
          placeholder="e.g. “Log a bird you've never seen before.”"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
            if (e.key === 'Escape') setOpen(false)
          }}
          aria-label="New mission text"
          autoFocus
        />
      </div>

      <div className="mission-editor-actions">
        <button className="mission-editor-save" onClick={add} disabled={!text.trim()} type="button">
          Add mission
        </button>
        {!embedded && (
          <button className="mission-editor-cancel" onClick={() => setOpen(false)} type="button">
            Done
          </button>
        )}
      </div>
    </div>
  )
}

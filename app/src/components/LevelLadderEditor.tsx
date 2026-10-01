import { useState } from 'react'
import { definitionStore } from '../data/definitionStore'
import { slugify, normalizeLevels, type LevelDef } from '../data/hobbyDefinition'

interface Props {
  hobby: string
}

/**
 * Level-ladder authoring surface (COMMUNITY-MODEL §3): let a hobby NAME ITS OWN
 * RUNGS instead of sharing the hardcoded Novice→Master ladder. Rename a rung,
 * retune its XP threshold, add or drop a rung — then "Save ladder" commits the
 * whole thing through definitionStore.setLevels, which runs normalizeLevels so
 * what's stored is always engine-safe (rung 0 @ 0 XP, strictly ascending).
 *
 * The form edits a local draft; a live-normalized preview shows exactly what
 * will be stored, so an author sees a non-ascending threshold corrected before
 * they commit. Rung 0's threshold is fixed at 0 and shown read-only.
 */
export function LevelLadderEditor({ hobby }: Props) {
  const slug = slugify(hobby)
  const [open, setOpen] = useState(false)
  const current = definitionStore.find(slug)?.levels ?? []
  const [draft, setDraft] = useState<LevelDef[]>(current)

  // Re-seed the draft from the live definition whenever the editor opens, so a
  // prior cancel doesn't leave a stale draft.
  function openEditor() {
    setDraft(definitionStore.find(slug)?.levels ?? [{ name: 'Novice', xpThreshold: 0 }])
    setOpen(true)
  }

  function setRungName(i: number, name: string) {
    setDraft((d) => d.map((l, idx) => (idx === i ? { ...l, name } : l)))
  }
  function setRungXp(i: number, xp: string) {
    const n = Math.max(0, Math.floor(Number(xp) || 0))
    setDraft((d) => d.map((l, idx) => (idx === i ? { ...l, xpThreshold: n } : l)))
  }
  function addRung() {
    setDraft((d) => {
      const last = d[d.length - 1]
      const nextXp = (last?.xpThreshold ?? 0) + 100
      return [...d, { name: `Level ${d.length + 1}`, xpThreshold: nextXp }]
    })
  }
  function removeRung(i: number) {
    setDraft((d) => (d.length <= 1 ? d : d.filter((_, idx) => idx !== i)))
  }
  function save() {
    definitionStore.setLevels(slug, draft)
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="ladder-toggle" onClick={openEditor}>
        🪜 Name your own rungs
      </button>
    )
  }

  const preview = normalizeLevels(draft)

  return (
    <div className="ladder-editor" aria-label={`Edit level ladder for ${hobby}`}>
      <div className="ladder-editor-head">Level ladder</div>
      {draft.map((rung, i) => (
        <div className="ladder-row" key={i}>
          <span className="ladder-index">{i}</span>
          <input
            className="ladder-rung-name"
            value={rung.name}
            placeholder={`Level ${i + 1}`}
            onChange={(e) => setRungName(i, e.target.value)}
            aria-label={`Rung ${i} name`}
          />
          <input
            className="ladder-rung-xp"
            type="number"
            min={0}
            value={i === 0 ? 0 : rung.xpThreshold}
            disabled={i === 0}
            onChange={(e) => setRungXp(i, e.target.value)}
            aria-label={`Rung ${i} XP threshold`}
            title={i === 0 ? 'Rung 0 is always reached at 0 XP' : 'XP to reach this rung'}
          />
          <span className="ladder-xp-unit">XP</span>
          <button
            className="ladder-remove"
            onClick={() => removeRung(i)}
            disabled={draft.length <= 1}
            aria-label={`Remove rung ${i}`}
            type="button"
          >
            ✕
          </button>
        </div>
      ))}

      {/* live preview of what will actually be stored (post-normalize) */}
      <div className="ladder-preview" aria-label="Normalized ladder preview">
        {preview.map((l, i) => (
          <span className="ladder-preview-rung" key={i}>
            {l.name} <em>{l.xpThreshold}</em>
          </span>
        ))}
      </div>

      <div className="ladder-editor-actions">
        <button className="ladder-add" onClick={addRung} type="button">
          + Add rung
        </button>
        <button className="ladder-save" onClick={save} type="button">
          Save ladder
        </button>
        <button className="ladder-cancel" onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </div>
    </div>
  )
}

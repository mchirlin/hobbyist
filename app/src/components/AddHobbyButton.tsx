import { useState } from 'react'
import type { HobbyCategory } from '../data/types'

const CATEGORIES: HobbyCategory[] = [
  'Outdoors',
  'Making',
  'Music',
  'Games',
  'Sport',
  'Craft',
  'Mind',
]

interface Props {
  /** Called with the new hobby. The parent persists via profileStore.addHobby. */
  onAdd: (input: { name: string; category: HobbyCategory; icon?: string }) => void
  /** Names already in the collection (lowercased), to warn on duplicates. */
  existing: string[]
}

/**
 * The frictionless front door — declare-first. Tapping "+ Add a hobby" opens a
 * compact inline form; typing a name + picking a category drops an EMPTY patch
 * into the collection instantly (no data required). This is the collector
 * dopamine hit the whole product is built around: a new slot appears the moment
 * you want it, and connecting real data to level it up comes later.
 */
export function AddHobbyButton({ onAdd, existing }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<HobbyCategory>('Making')
  const [icon, setIcon] = useState('')

  const trimmed = name.trim()
  const isDup = trimmed.length > 0 && existing.includes(trimmed.toLowerCase())
  const canAdd = trimmed.length > 0 && !isDup

  function commit() {
    if (!canAdd) return
    onAdd({ name: trimmed, category, icon: icon.trim() || undefined })
    // Reset for the next add — keep it open so adding several in a row is fast.
    setName('')
    setIcon('')
  }

  if (!open) {
    return (
      <button className="add-hobby-tile" onClick={() => setOpen(true)}>
        <span className="add-hobby-plus">+</span>
        <span className="add-hobby-label">Add a hobby</span>
        <span className="add-hobby-hint">Drops an empty patch instantly</span>
      </button>
    )
  }

  return (
    <div className="add-hobby-form" role="group" aria-label="Add a hobby">
      <div className="add-hobby-row">
        <input
          className="add-hobby-input"
          autoFocus
          placeholder="What are you into? (e.g. Pottery)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setOpen(false)
          }}
          aria-label="Hobby name"
        />
        <input
          className="add-hobby-emoji"
          placeholder="🏺"
          maxLength={3}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          aria-label="Optional emoji"
        />
      </div>

      <div className="add-hobby-cats">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`add-hobby-cat cat-${c}${c === category ? ' selected' : ''}`}
            onClick={() => setCategory(c)}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {isDup && (
        <p className="add-hobby-dup">You already have “{trimmed}”.</p>
      )}

      <div className="add-hobby-actions">
        <button className="add-hobby-commit" onClick={commit} disabled={!canAdd}>
          Add patch
        </button>
        <button className="add-hobby-cancel" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
      <p className="add-hobby-foot">
        Just the name is enough — connect real data later to level it up.
      </p>
    </div>
  )
}

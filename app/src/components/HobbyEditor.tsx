import { useState } from 'react'
import { definitionStore } from '../data/definitionStore'
import { slugify, type MilestoneClaim } from '../data/hobbyDefinition'

interface Props {
  hobby: string
}

const CLAIM_LABEL: Record<MilestoneClaim, string> = {
  self: 'Self — tap to claim',
  peer: 'Peer — a friend vouches',
  admin: 'Admin — a mod awards it',
}

/**
 * The admin authoring surface (step 1, single-user/local): add a MILESTONE
 * badge to a hobby's definition. This is what makes the ~40 connector-less
 * hobbies rich — a human-authored achievement with no data source, defaulting
 * to self-claim per the ADHD-market guardrail (COMMUNITY-MODEL §3/§4). The edit
 * persists to definitionStore and the MedalCase re-renders with the new badge.
 */
export function HobbyEditor({ hobby }: Props) {
  const slug = slugify(hobby)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [how, setHow] = useState('')
  const [claim, setClaim] = useState<MilestoneClaim>('self')

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    definitionStore.addMilestoneBadge(slug, { name: trimmed, how: how.trim() || undefined, claim })
    setName('')
    setHow('')
    setClaim('self')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="author-toggle" onClick={() => setOpen(true)}>
        + Author a milestone badge
      </button>
    )
  }

  return (
    <div className="author-form">
      <input
        className="author-name"
        placeholder="Milestone name (e.g. “Led my first trad climb”)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
          if (e.key === 'Escape') setOpen(false)
        }}
        aria-label="Milestone badge name"
        autoFocus
      />
      <input
        className="author-how"
        placeholder="How you earn it (optional)"
        value={how}
        onChange={(e) => setHow(e.target.value)}
        aria-label="How to earn this milestone"
      />
      <div className="author-claim">
        {(['self', 'peer', 'admin'] as MilestoneClaim[]).map((c) => (
          <button
            key={c}
            className={'claim-chip' + (claim === c ? ' active' : '')}
            onClick={() => setClaim(c)}
            title={CLAIM_LABEL[c]}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="author-actions">
        <button className="author-add" onClick={add} disabled={!name.trim()}>
          Add badge
        </button>
        <button className="author-cancel" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

import type { Profile } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'

interface Props {
  profile: Profile
  /** Set a hobby's importance (1–10). */
  onChange: (hobby: string, importance: number) => void
}

/**
 * The explicit importance editor — the cold-start + override path.
 *
 * Auto-sync is the intended primary source for patch size, but a brand-new
 * user has nothing connected yet, and any user may want to override what a
 * connector inferred. Drag a slider and the sash rebalances instantly, so
 * "how big a part of my life this is" is directly, honestly editable.
 */
export function ImportanceEditor({ profile, onChange }: Props) {
  // Show biggest-first so the ordering matches the sash.
  const hobbies = [...profile.hobbies].sort((a, b) => b.importance - a.importance)

  return (
    <div className="importance-editor">
      {hobbies.map((h) => {
        const color = CATEGORY_COLOR[h.category] ?? '#868e96'
        return (
          <div className="imp-row" key={h.name}>
            <span className="imp-icon">{h.icon}</span>
            <label className="imp-name" htmlFor={`imp-${h.name}`}>
              {h.name}
            </label>
            <input
              id={`imp-${h.name}`}
              className="imp-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={h.importance}
              onChange={(e) => onChange(h.name, Number(e.target.value))}
              style={{ accentColor: color }}
              aria-label={`${h.name} importance, 1 to 10`}
            />
            <span className="imp-val" style={{ color }}>
              {h.importance}
            </span>
          </div>
        )
      })}
    </div>
  )
}

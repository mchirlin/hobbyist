import { useSyncExternalStore } from 'react'
import type { Profile } from '../data/types'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { definitionStore } from '../data/definitionStore'
import { slugify, levelNamesFromDefinition } from '../data/hobbyDefinition'

interface Props {
  profile: Profile
  onOpen: (hobbyName: string) => void
}

/**
 * The home collection list — a compact, tappable row per hobby. This is the
 * app-like summary that replaces the long inline stack: each row shows the
 * hobby's icon, name, current rank, and a mini level ladder, and tapping it
 * drills into the full HobbyDetail view. All the depth lives one level down.
 */
export function HobbyList({ profile, onOpen }: Props) {
  const definitions = useSyncExternalStore(
    definitionStore.subscribe,
    definitionStore.getSnapshot,
    definitionStore.getSnapshot,
  )

  return (
    <ul className="hobby-list">
      {profile.hobbies.map((h) => {
        const color = CATEGORY_COLOR[h.category] ?? '#868e96'
        const def = definitions.find((d) => d.slug === slugify(h.name))
        const rungNames = def ? levelNamesFromDefinition(def) : [...LEVELS]
        const level = Math.min(h.level ?? 0, rungNames.length - 1)
        return (
          <li key={h.name}>
            <button
              className="hobby-row"
              onClick={() => onOpen(h.name)}
              aria-label={`Open ${h.name} — ${rungNames[level]}`}
            >
              <span className="hobby-row-icon" style={{ background: color }}>
                {h.icon}
              </span>
              <span className="hobby-row-main">
                <span className="hobby-row-name">{h.name}</span>
                <span className="hobby-row-level" style={{ color }}>
                  {rungNames[level]}
                </span>
              </span>
              <span className="hobby-row-ladder" role="img" aria-label={rungNames[level]}>
                {rungNames.map((lvl, i) => (
                  <span
                    key={`${lvl}-${i}`}
                    className={'row-rung' + (i <= level ? ' filled' : '')}
                    style={i <= level ? { background: color } : undefined}
                  />
                ))}
              </span>
              <span className="hobby-row-chevron" aria-hidden>
                ›
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

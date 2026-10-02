import { useState, useSyncExternalStore } from 'react'
import type { Profile } from '../data/types'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import {
  definitionStore,
} from '../data/definitionStore'
import {
  slugify,
  levelNamesFromDefinition,
  missionsFromDefinition,
} from '../data/hobbyDefinition'
import { missionProgressStore, isMissionDone } from '../data/missionProgress'
import { MedalCase } from './MedalCase'
import { HobbyEditPanel } from './HobbyEditPanel'

interface Props {
  profile: Profile
}

/**
 * Shows the level-up ladder and the next suggested mission for each hobby.
 * A tangible take on the "level up + suggested missions" idea.
 *
 * The ladder now renders from each hobby's OWN community-owned definition —
 * author-named rungs (via LevelLadderEditor), not the hardcoded LEVELS — so an
 * admin renaming "Novice → Master" to "Hatchling → Flyer" shows up live here.
 *
 * Milestone claims are self-attested, held locally here (like quest
 * completions) — tapping a self-claim milestone in the MedalCase earns it.
 */
export function HobbyProgress({ profile }: Props) {
  // Subscribe to the definition store so authored ladders re-render immediately.
  const definitions = useSyncExternalStore(
    definitionStore.subscribe,
    definitionStore.getSnapshot,
  )

  // Subscribe to persisted mission done-state so checking a mission off
  // re-renders here and survives reload (user progress, not definition data).
  const missionDone = useSyncExternalStore(
    missionProgressStore.subscribe,
    missionProgressStore.getSnapshot,
    missionProgressStore.getSnapshot,
  )

  // badgeId → claimed. Self-attested, cosmetic-only on your own patch
  // (COMMUNITY-MODEL §5.4), so local state is the right home in step 1.
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})
  const toggleClaim = (badgeId: string) =>
    setClaimed((c) => ({ ...c, [badgeId]: !c[badgeId] }))

  return (
    <div className="progress-list">
      {profile.hobbies.map((h) => {
        const color = CATEGORY_COLOR[h.category] ?? '#868e96'
        const def = definitions.find((d) => d.slug === slugify(h.name))
        const slug = slugify(h.name)
        // Author-named rungs when a definition exists; else the shared default.
        const rungNames = def ? levelNamesFromDefinition(def) : [...LEVELS]
        // Clamp the stored level into the (possibly re-authored) ladder range.
        const level = Math.min(h.level ?? 0, rungNames.length - 1)
        // Prefer the definition's AUTHORED missions (admin-editable); fall back
        // to the profile seed. Done-state is now USER progress: the persisted
        // missionProgress store is authoritative; the profile seed's `done`
        // flag is a one-time fallback for missions the user hasn't toggled yet.
        const doneTexts = new Set(
          (h.missions ?? []).filter((m) => m.done).map((m) => m.text),
        )
        const authored = def ? missionsFromDefinition(def) : []
        const missionPool = (authored.length > 0 ? authored : h.missions ?? []).map((m) => ({
          text: m.text,
          level: m.level,
          done:
            isMissionDone(missionDone, slug, m.text) ||
            ('done' in m ? Boolean(m.done) : doneTexts.has(m.text)),
        }))
        // Show the missions relevant NOW — those at or above the current rung —
        // each a self-attested checkbox. Completed ones stay visible (struck
        // through) so the sense of progress accumulates.
        const relevantMissions = missionPool.filter((m) => m.level >= level)
        const shownMissions = relevantMissions.length > 0 ? relevantMissions : missionPool
        return (
          <div className="progress-card" key={h.name}>
            <div className="progress-head">
              <span className="progress-icon">{h.icon}</span>
              <span className="progress-name">{h.name}</span>
              <span className="progress-level" style={{ color }}>
                {rungNames[level]}
              </span>
            </div>

            {/* level ladder — author-named rungs from the definition */}
            <div className="ladder" role="img" aria-label={`Level ${rungNames[level]}`}>
              {rungNames.map((lvl, i) => (
                <span
                  key={`${lvl}-${i}`}
                  className={'rung' + (i <= level ? ' filled' : '')}
                  style={i <= level ? { background: color } : undefined}
                  title={lvl}
                />
              ))}
            </div>

            {/* missions for the current rung — each a self-attested checkbox.
                Checking one marks it done (persisted) and advances what's next. */}
            {shownMissions.length > 0 && (
              <div className="missions" aria-label={`Missions for ${h.name}`}>
                <span className="mission-flag" style={{ color }}>
                  🎯 Missions
                </span>
                <ul className="mission-check-list">
                  {shownMissions.map((m, i) => (
                    <li
                      className={'mission-check-item' + (m.done ? ' done' : '')}
                      key={`${m.text}-${i}`}
                    >
                      <label className="mission-check">
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={() => missionProgressStore.toggle(slug, m.text)}
                          aria-label={`Complete mission: ${m.text}`}
                        />
                        <span
                          className="mission-box"
                          aria-hidden
                          style={{ borderColor: color }}
                        >
                          {m.done ? '✓' : ''}
                        </span>
                      </label>
                      <span className="mission-check-text">{m.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* concrete, countable medals + claimable milestone badges,
                sourced from the community-owned HobbyDefinition */}
            <MedalCase
              hobby={h.name}
              counts={h.metricCounts}
              claimed={claimed}
              onClaimMilestone={toggleClaim}
            />

            {/* authoring (admin, local in step 1): one Edit entry opens a
                tabbed panel — Levels · Missions · Badges · About. */}
            <div className="authoring-row">
              <HobbyEditPanel hobby={h.name} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

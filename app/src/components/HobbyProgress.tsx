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
import { MedalCase } from './MedalCase'
import { HobbyEditor } from './HobbyEditor'
import { LevelLadderEditor } from './LevelLadderEditor'
import { MissionEditor } from './MissionEditor'

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
        // Author-named rungs when a definition exists; else the shared default.
        const rungNames = def ? levelNamesFromDefinition(def) : [...LEVELS]
        // Clamp the stored level into the (possibly re-authored) ladder range.
        const level = Math.min(h.level ?? 0, rungNames.length - 1)
        // Prefer the definition's AUTHORED missions (admin-editable); fall back
        // to the profile seed. Done-state lives on the profile, so match by text.
        const doneTexts = new Set(
          (h.missions ?? []).filter((m) => m.done).map((m) => m.text),
        )
        const authored = def ? missionsFromDefinition(def) : []
        const missionPool = (authored.length > 0 ? authored : h.missions ?? []).map((m) => ({
          text: m.text,
          level: m.level,
          done: 'done' in m ? Boolean(m.done) : doneTexts.has(m.text),
        }))
        const nextMission =
          missionPool.find((m) => !m.done && m.level >= level) ??
          missionPool.find((m) => !m.done)
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

            {/* next mission */}
            {nextMission && (
              <div className="mission">
                <span className="mission-flag" style={{ color }}>
                  🎯 Next mission
                </span>
                <span className="mission-text">{nextMission.text}</span>
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

            {/* authoring surfaces (admin, local in step 1):
                name your own rungs + author missions + author a milestone badge */}
            <div className="authoring-row">
              <LevelLadderEditor hobby={h.name} />
              <MissionEditor hobby={h.name} />
              <HobbyEditor hobby={h.name} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

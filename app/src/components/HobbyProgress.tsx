import { useState } from 'react'
import type { Profile } from '../data/types'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { MedalCase } from './MedalCase'
import { HobbyEditor } from './HobbyEditor'

interface Props {
  profile: Profile
}

/**
 * Shows the level-up ladder and the next suggested mission for each hobby.
 * A tangible take on the "level up + suggested missions" idea.
 *
 * Milestone claims are self-attested, held locally here (like quest
 * completions) — tapping a self-claim milestone in the MedalCase earns it.
 */
export function HobbyProgress({ profile }: Props) {
  // badgeId → claimed. Self-attested, cosmetic-only on your own patch
  // (COMMUNITY-MODEL §5.4), so local state is the right home in step 1.
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})
  const toggleClaim = (badgeId: string) =>
    setClaimed((c) => ({ ...c, [badgeId]: !c[badgeId] }))

  return (
    <div className="progress-list">
      {profile.hobbies.map((h) => {
        const color = CATEGORY_COLOR[h.category] ?? '#868e96'
        const level = h.level ?? 0
        const nextMission =
          h.missions?.find((m) => !m.done && m.level >= level) ??
          h.missions?.find((m) => !m.done)
        return (
          <div className="progress-card" key={h.name}>
            <div className="progress-head">
              <span className="progress-icon">{h.icon}</span>
              <span className="progress-name">{h.name}</span>
              <span className="progress-level" style={{ color }}>
                {LEVELS[level]}
              </span>
            </div>

            {/* level ladder */}
            <div className="ladder" role="img" aria-label={`Level ${LEVELS[level]}`}>
              {LEVELS.map((lvl, i) => (
                <span
                  key={lvl}
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

            {/* author a new milestone badge (admin surface, local in step 1) */}
            <HobbyEditor hobby={h.name} />
          </div>
        )
      })}
    </div>
  )
}

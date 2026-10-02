import { useState, useSyncExternalStore } from 'react'
import type { Profile, ProfileHobby } from '../data/types'
import { LEVELS } from '../data/types'
import type { Quest, QuestCompletions } from '../quests/quests'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { definitionStore } from '../data/definitionStore'
import {
  slugify,
  levelNamesFromDefinition,
  missionsFromDefinition,
  resourcesFromDefinition,
} from '../data/hobbyDefinition'
import { missionProgressStore, isMissionDone } from '../data/missionProgress'
import { hobbyXp, xpToNextLevel, isCompleted } from '../quests/quests'
import { MedalCase } from './MedalCase'
import { HobbyEditPanel } from './HobbyEditPanel'

interface Props {
  hobby: ProfileHobby
  profile: Profile
  quests: Quest[]
  completions: QuestCompletions
  onToggleQuest: (questId: string) => void
  onBack: () => void
}

const RESOURCE_ICON: Record<string, string> = {
  community: '💬',
  app: '📱',
  website: '🌐',
  video: '🎬',
}

const CADENCE_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

/**
 * The DRILL-DOWN view for a single hobby — the app-like detail screen reached
 * by tapping a hobby on the home list. All the per-hobby depth that used to
 * stack inline on one long page lives here, scoped to this hobby only: the
 * level ladder, self-attested missions, the medal case, this hobby's quests,
 * curated links, and the admin edit panel. A back button returns to home.
 */
export function HobbyDetail({
  hobby,
  profile: _profile,
  quests,
  completions,
  onToggleQuest,
  onBack,
}: Props) {
  const definitions = useSyncExternalStore(
    definitionStore.subscribe,
    definitionStore.getSnapshot,
  )
  const missionDone = useSyncExternalStore(
    missionProgressStore.subscribe,
    missionProgressStore.getSnapshot,
    missionProgressStore.getSnapshot,
  )
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})
  const toggleClaim = (badgeId: string) =>
    setClaimed((c) => ({ ...c, [badgeId]: !c[badgeId] }))

  const h = hobby
  const color = CATEGORY_COLOR[h.category] ?? '#868e96'
  const slug = slugify(h.name)
  const def = definitions.find((d) => d.slug === slug)
  const rungNames = def ? levelNamesFromDefinition(def) : [...LEVELS]
  const level = Math.min(h.level ?? 0, rungNames.length - 1)

  // Missions — authored (definition) preferred, else profile seed. Done-state
  // from the persisted store is authoritative; the seed `done` is a fallback.
  const doneTexts = new Set((h.missions ?? []).filter((m) => m.done).map((m) => m.text))
  const authored = def ? missionsFromDefinition(def) : []
  const missionPool = (authored.length > 0 ? authored : h.missions ?? []).map((m) => ({
    text: m.text,
    level: m.level,
    done:
      isMissionDone(missionDone, slug, m.text) ||
      ('done' in m ? Boolean(m.done) : doneTexts.has(m.text)),
  }))
  const relevantMissions = missionPool.filter((m) => m.level >= level)
  const shownMissions = relevantMissions.length > 0 ? relevantMissions : missionPool

  // This hobby's quests only, with its XP progress toward the next level.
  const myQuests = quests.filter((q) => q.hobby === h.name)
  const xp = hobbyXp(quests, completions, h.name)
  const next = xpToNextLevel(xp)
  const resources = def ? resourcesFromDefinition(def) : []

  return (
    <div className="hobby-detail">
      <button className="detail-back" onClick={onBack}>
        ← Back to collection
      </button>

      <div className="detail-hero" style={{ borderColor: color }}>
        <span className="detail-icon" style={{ background: color }}>
          {h.icon}
        </span>
        <div className="detail-hero-text">
          <h2>{h.name}</h2>
          <span className="detail-sub">
            {h.category} · <strong style={{ color }}>{rungNames[level]}</strong>
          </span>
        </div>
      </div>

      {/* level ladder */}
      <section className="detail-section">
        <h3>Rank</h3>
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
        {next ? (
          <p className="detail-xp-note">
            {xp} XP · {next.needed} XP to {rungNames[Math.min(next.nextLevel, rungNames.length - 1)]}
          </p>
        ) : (
          <p className="detail-xp-note">{xp} XP · maxed</p>
        )}
      </section>

      {/* missions */}
      {shownMissions.length > 0 && (
        <section className="detail-section">
          <h3>Missions</h3>
          <ul className="mission-check-list" aria-label={`Missions for ${h.name}`}>
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
                  <span className="mission-box" aria-hidden style={{ borderColor: color }}>
                    {m.done ? '✓' : ''}
                  </span>
                </label>
                <span className="mission-check-text">{m.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* this hobby's quests */}
      {myQuests.length > 0 && (
        <section className="detail-section">
          <h3>Quests</h3>
          <p className="hint">Complete challenges to earn XP and level up.</p>
          <ul className="quest-list">
            {myQuests.map((q) => {
              const done = isCompleted(completions, q.id)
              return (
                <li key={q.id} className={'quest-item' + (done ? ' done' : '')}>
                  <label className="quest-check">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleQuest(q.id)}
                      aria-label={`Complete quest: ${q.text}`}
                    />
                    <span className="quest-box" aria-hidden style={{ borderColor: color }}>
                      {done ? '✓' : ''}
                    </span>
                  </label>
                  <div className="quest-body">
                    <span className="quest-text">{q.text}</span>
                    <span className="quest-meta">
                      <span className="quest-hobby" style={{ color }}>
                        {CADENCE_LABEL[q.cadence] ?? q.cadence}
                      </span>
                      <span className="quest-xp">+{q.xp} XP</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* medals */}
      <section className="detail-section">
        <h3>Medals</h3>
        <MedalCase
          hobby={h.name}
          counts={h.metricCounts}
          claimed={claimed}
          onClaimMilestone={toggleClaim}
        />
      </section>

      {/* curated links */}
      {resources.length > 0 && (
        <section className="detail-section">
          <h3>Links</h3>
          <div className="resource-links" aria-label={`Links for ${h.name}`}>
            {resources.map((r, i) => (
              <a
                key={`${r.url}-${i}`}
                className={'resource-link res-' + r.kind}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                title={r.note ?? r.url}
              >
                <span aria-hidden>{RESOURCE_ICON[r.kind] ?? '🔗'}</span> {r.label}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* admin edit */}
      <section className="detail-section">
        <h3>Customize</h3>
        <div className="authoring-row">
          <HobbyEditPanel hobby={h.name} />
        </div>
      </section>
    </div>
  )
}

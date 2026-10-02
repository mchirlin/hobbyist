import { useState, useSyncExternalStore } from 'react'
import type { Profile, ProfileHobby } from '../data/types'
import { LEVELS } from '../data/types'
import type { Quest, QuestCompletions } from '../quests/quests'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import { definitionStore } from '../data/definitionStore'
import {
  slugify,
  levelNamesFromDefinition,
  questsFromDefinition,
  resourcesFromDefinition,
} from '../data/hobbyDefinition'
import { hobbyXp, xpToNextLevel, isCompleted } from '../quests/quests'
import { MedalCase } from './MedalCase'
import { HobbyEditPanel } from './HobbyEditPanel'

interface Props {
  hobby: ProfileHobby
  profile: Profile
  /** All quests in play (used as the base pool + fallback). */
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
  once: 'Step',
}

/**
 * The DRILL-DOWN view for a single hobby. All per-hobby depth lives here,
 * scoped to this hobby: level ladder, the unified QUEST list (one-time "steps"
 * + recurring "challenges" — missions and quests are now one thing), the medal
 * case, curated links, and the admin edit panel.
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
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})
  const toggleClaim = (badgeId: string) =>
    setClaimed((c) => ({ ...c, [badgeId]: !c[badgeId] }))

  const h = hobby
  const color = CATEGORY_COLOR[h.category] ?? '#868e96'
  const slug = slugify(h.name)
  const def = definitions.find((d) => d.slug === slug)
  const rungNames = def ? levelNamesFromDefinition(def) : [...LEVELS]
  const level = Math.min(h.level ?? 0, rungNames.length - 1)

  // The ONE source of quests for this hobby: the definition (recurring +
  // one-time), falling back to the passed pool for a hobby with no definition.
  const myQuests: Quest[] = def
    ? questsFromDefinition(def)
    : quests.filter((q) => q.hobby === h.name)

  // Split for display: one-time "steps" (the old missions, now XP-bearing) vs
  // recurring "challenges". Steps are surfaced from the current level up.
  const steps = myQuests
    .filter((q) => q.cadence === 'once')
    .filter((q) => (q.level ?? 0) >= level)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  const stepsToShow =
    steps.length > 0 ? steps : myQuests.filter((q) => q.cadence === 'once')
  const challenges = myQuests.filter((q) => q.cadence !== 'once')

  // XP progress toward the next level — the SAME completions store for all.
  const xp = hobbyXp(myQuests, completions, h.name)
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

      {/* one-time steps (old missions, now XP-bearing quests) */}
      {stepsToShow.length > 0 && (
        <section className="detail-section">
          <h3>Steps</h3>
          <p className="hint">One-time goals for your level — each earns XP.</p>
          <ul className="quest-list" aria-label={`Steps for ${h.name}`}>
            {stepsToShow.map((q) => (
              <QuestRow
                key={q.id}
                quest={q}
                color={color}
                done={isCompleted(completions, q.id)}
                onToggle={onToggleQuest}
                meta={rungNames[Math.min(q.level ?? 0, rungNames.length - 1)]}
              />
            ))}
          </ul>
        </section>
      )}

      {/* recurring challenges */}
      {challenges.length > 0 && (
        <section className="detail-section">
          <h3>Challenges</h3>
          <p className="hint">Repeatable daily, weekly &amp; monthly — earn XP, level up.</p>
          <ul className="quest-list" aria-label={`Challenges for ${h.name}`}>
            {challenges.map((q) => (
              <QuestRow
                key={q.id}
                quest={q}
                color={color}
                done={isCompleted(completions, q.id)}
                onToggle={onToggleQuest}
                meta={CADENCE_LABEL[q.cadence] ?? q.cadence}
              />
            ))}
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

/** One quest row — a self-attested checkbox + text + a meta tag (level or cadence)
 *  + its XP. Shared by the Steps and Challenges lists. */
function QuestRow({
  quest,
  color,
  done,
  onToggle,
  meta,
}: {
  quest: Quest
  color: string
  done: boolean
  onToggle: (id: string) => void
  meta: string
}) {
  return (
    <li className={'quest-item' + (done ? ' done' : '')}>
      <label className="quest-check">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(quest.id)}
          aria-label={`Complete quest: ${quest.text}`}
        />
        <span className="quest-box" aria-hidden style={{ borderColor: color }}>
          {done ? '✓' : ''}
        </span>
      </label>
      <div className="quest-body">
        <span className="quest-text">{quest.text}</span>
        <span className="quest-meta">
          <span className="quest-hobby" style={{ color }}>
            {meta}
          </span>
          <span className="quest-xp">+{quest.xp} XP</span>
        </span>
      </div>
    </li>
  )
}

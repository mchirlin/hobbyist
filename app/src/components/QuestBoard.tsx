import { useMemo } from 'react'
import type { Quest, QuestCadence, QuestCompletions } from '../quests/quests'
import {
  hobbyXp,
  levelFromXp,
  xpToNextLevel,
  isCompleted,
} from '../quests/quests'
import { LEVELS } from '../data/types'
import { CATEGORY_COLOR } from '../data/sampleProfile'
import type { Profile } from '../data/types'

interface Props {
  profile: Profile
  quests: Quest[]
  completions: QuestCompletions
  /** Toggle a quest's completion (self-attested). */
  onToggle: (questId: string) => void
}

/** The recurring cadences shown on the Quest board (one-time lives per-hobby). */
type RecurringCadence = Exclude<QuestCadence, 'once'>

const CADENCE_ORDER: RecurringCadence[] = ['daily', 'weekly', 'monthly']
const CADENCE_LABEL: Record<RecurringCadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}
const CADENCE_BLURB: Record<RecurringCadence, string> = {
  daily: 'Small wins — build a streak.',
  weekly: 'Meaningful progress.',
  monthly: 'Milestones & seasonal patches.',
}

/**
 * The Quest board — the active engine. Self-attested daily/weekly/monthly
 * challenges; completing them earns XP that levels up the matching hobby on
 * the sash. No connectors required. One-time "steps" (the old missions) are
 * excluded here — they live per-hobby in the drill-down, surfaced by level.
 */
export function QuestBoard({ profile, quests, completions, onToggle }: Props) {
  const catOf = useMemo(() => {
    const m: Record<string, string> = {}
    for (const h of profile.hobbies) m[h.name] = h.category
    return m
  }, [profile])

  // Recurring challenges only; one-time steps are a per-hobby concern.
  const recurring = useMemo(
    () => quests.filter((q) => q.cadence !== 'once'),
    [quests],
  )

  return (
    <div className="quest-board">
      {CADENCE_ORDER.map((cadence) => {
        const group = recurring.filter((q) => q.cadence === cadence)
        if (group.length === 0) return null
        return (
          <div className="quest-group" key={cadence}>
            <div className="quest-group-head">
              <h3>{CADENCE_LABEL[cadence]}</h3>
              <span className="quest-group-blurb">{CADENCE_BLURB[cadence]}</span>
            </div>
            <ul className="quest-list">
              {group.map((q) => {
                const done = isCompleted(completions, q.id)
                const color = CATEGORY_COLOR[catOf[q.hobby]] ?? '#868e96'
                return (
                  <li
                    key={q.id}
                    className={'quest-item' + (done ? ' done' : '')}
                  >
                    <label className="quest-check">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => onToggle(q.id)}
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
                          {q.hobby}
                        </span>
                        <span className="quest-xp">+{q.xp} XP</span>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      <QuestProgress profile={profile} quests={quests} completions={completions} />
    </div>
  )
}

/** Per-hobby XP + level progress, driven entirely by completed quests. */
function QuestProgress({
  profile,
  quests,
  completions,
}: Omit<Props, 'onToggle'>) {
  // Only hobbies that actually have quests are worth showing here.
  const hobbies = useMemo(() => {
    const withQuests = new Set(quests.map((q) => q.hobby))
    return profile.hobbies.filter((h) => withQuests.has(h.name))
  }, [profile, quests])

  return (
    <div className="quest-progress">
      <h3>Quest progress</h3>
      <p className="hint">XP earned from quests levels up each patch.</p>
      {hobbies.map((h) => {
        const xp = hobbyXp(quests, completions, h.name)
        const level = levelFromXp(xp)
        const next = xpToNextLevel(xp)
        const color = CATEGORY_COLOR[h.category] ?? '#868e96'
        // progress toward next level as a 0–100 bar
        const pct = next
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(((next.needed === 0 ? 1 : xp) / (xp + next.needed)) * 100),
              ),
            )
          : 100
        return (
          <div className="quest-progress-row" key={h.name}>
            <div className="qpr-head">
              <span className="progress-icon">{h.icon}</span>
              <span className="progress-name">{h.name}</span>
              <span className="progress-level" style={{ color }}>
                {LEVELS[level]}
              </span>
              <span className="qpr-xp">{xp} XP</span>
            </div>
            <div className="qpr-bar">
              <div
                className="qpr-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <div className="qpr-next">
              {next
                ? `${next.needed} XP to ${LEVELS[next.nextLevel]}`
                : 'Maxed — Master'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

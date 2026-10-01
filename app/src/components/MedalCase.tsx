import { useSyncExternalStore } from 'react'
import { medalsForHobby, medalProgress, medalLabel, TIER_COLOR, type Medal } from '../quests/medals'
import { definitionStore } from '../data/definitionStore'
import {
  slugify,
  medalsFromDefinition,
  milestonesFromDefinition,
} from '../data/hobbyDefinition'

interface Props {
  hobby: string
  counts?: Record<string, number>
  /** Milestone badges claimed by the user (badgeId → true). */
  claimed?: Record<string, boolean>
  /** Toggle a milestone claim (self-attested). */
  onClaimMilestone?: (badgeId: string) => void
}

/**
 * The medal case for one hobby — Pokémon-GO-style. Each metric medal shows its
 * current tier as a coloured disc, the "X / next-threshold unit" count, and a
 * progress bar; milestone badges (connector-less, human-claimed) show a claim
 * chip. The concrete, countable answer to "how do I level up this hobby".
 *
 * Medals now source from the community-owned HobbyDefinition (definitionStore)
 * when one exists for this hobby — proving the app renders from a DEFINITION,
 * not a hardcoded const (COMMUNITY-MODEL §6 step 1). Falls back to the const
 * catalog for any hobby without a definition yet.
 */
export function MedalCase({ hobby, counts, claimed, onClaimMilestone }: Props) {
  const defs = useSyncExternalStore(
    definitionStore.subscribe,
    definitionStore.getSnapshot,
    definitionStore.getSnapshot,
  )
  const def = defs.find((d) => d.slug === slugify(hobby))
  const medals: Medal[] = def ? medalsFromDefinition(def) : medalsForHobby(hobby)
  const milestones = def ? milestonesFromDefinition(def) : []
  if (medals.length === 0 && milestones.length === 0) return null

  return (
    <div className="medal-case">
      {medals.map((medal) => {
        const count = counts?.[medal.metricKey] ?? 0
        const p = medalProgress(medal, count)
        const tierColor = p.maxed
          ? TIER_COLOR.Platinum
          : p.earned
            ? TIER_COLOR[p.earned.name]
            : '#ced4da'
        const nextThreshold = p.next?.threshold ?? p.earned?.threshold ?? 0
        return (
          <div className="medal" key={medal.id} title={medal.how}>
            <div
              className="medal-disc"
              style={{ background: tierColor }}
              aria-label={p.earned ? `${p.earned.name} medal` : 'Locked medal'}
            >
              <span className="medal-tier-glyph">
                {p.maxed ? '★' : p.earned ? p.earned.name[0] : '·'}
              </span>
            </div>
            <div className="medal-body">
              <div className="medal-top">
                <span className="medal-name">{medal.name}</span>
                <span className="medal-count">
                  {p.maxed
                    ? `${p.count} ${medal.unit} · maxed`
                    : `${p.count} / ${nextThreshold} ${medal.unit}`}
                </span>
              </div>
              <div className="medal-bar" role="img" aria-label={medalLabel(p)}>
                <div
                  className="medal-bar-fill"
                  style={{ width: `${Math.round(p.fraction * 100)}%`, background: tierColor }}
                />
              </div>
              <div className="medal-tiers">
                {medal.tiers.map((t) => {
                  const reached = p.count >= t.threshold
                  return (
                    <span
                      key={t.name}
                      className={'medal-pip' + (reached ? ' reached' : '')}
                      style={reached ? { color: TIER_COLOR[t.name] } : undefined}
                      title={`${t.name}: ${t.threshold} ${medal.unit}`}
                    >
                      {t.name[0]}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {/* Milestone badges — connector-less, human-claimed achievements (the
          ~40-hobby long tail). Default claim is self-attested: tap to earn. */}
      {milestones.map((b) => {
        const isClaimed = Boolean(claimed?.[b.id])
        const selfClaimable = b.claim === 'self' && onClaimMilestone
        return (
          <div className={'medal milestone' + (isClaimed ? ' claimed' : '')} key={b.id} title={b.how}>
            <button
              type="button"
              className="medal-disc milestone-disc"
              aria-label={isClaimed ? `${b.name} earned` : `Claim ${b.name}`}
              disabled={!selfClaimable}
              onClick={selfClaimable ? () => onClaimMilestone!(b.id) : undefined}
            >
              <span className="medal-tier-glyph">{isClaimed ? '★' : '◇'}</span>
            </button>
            <div className="medal-body">
              <div className="medal-top">
                <span className="medal-name">{b.name}</span>
                <span className="medal-count milestone-claim">
                  {isClaimed
                    ? 'Earned'
                    : b.claim === 'self'
                      ? 'Tap to claim'
                      : b.claim === 'peer'
                        ? 'Needs a peer'
                        : 'Admin-awarded'}
                </span>
              </div>
              <div className="milestone-how">{b.how}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

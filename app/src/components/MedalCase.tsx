import { medalsForHobby, medalProgress, medalLabel, TIER_COLOR } from '../quests/medals'

interface Props {
  hobby: string
  counts?: Record<string, number>
}

/**
 * The medal case for one hobby — Pokémon-GO-style. Each medal shows its current
 * tier as a coloured disc, the "X / next-threshold unit" count, and a progress
 * bar filling toward the next tier. This is the concrete, countable answer to
 * "how do I level up this hobby": not prose, a number you move.
 */
export function MedalCase({ hobby, counts }: Props) {
  const medals = medalsForHobby(hobby)
  if (medals.length === 0) return null

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
    </div>
  )
}

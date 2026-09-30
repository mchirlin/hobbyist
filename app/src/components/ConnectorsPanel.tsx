import { useMemo, useState } from 'react'
import {
  listConnectors,
  AUTOMATION_META,
  type Connector,
} from '../integrations/registry'
import { registerBuiltinConnectors } from '../integrations/connectors'
import { syncUltimateResults } from '../integrations/ultimate'
import { MICHAEL_GEOCACHE_FINDS } from '../integrations/geocaching'
import { syncGeocachingProfile } from '../integrations/geocachingParse'
import type { HobbyActivity } from '../integrations/activity'
import { EphemeralConnectCard } from './EphemeralConnectCard'

// Ensure the built-ins are registered before the component reads the registry.
registerBuiltinConnectors()

/** Optional CORS proxy for browser-side scrape fetches (results.wfdf.sport and
 * www.geocaching.com send no CORS headers). Set VITE_SCRAPE_PROXY to
 * "https://my-proxy/?u=" (VITE_WFDF_PROXY kept as a back-compat alias). When
 * unset, the live fetch fails in the browser and the connector falls back to
 * seed data — the parse is real either way, and works live server-side. */
const SCRAPE_PROXY =
  (import.meta.env.VITE_SCRAPE_PROXY as string | undefined) ||
  (import.meta.env.VITE_WFDF_PROXY as string | undefined) ||
  undefined

interface Props {
  /** Called when a live connector produces a normalized activity. */
  onActivity: (a: HobbyActivity) => void
}

function levelBadge(c: Connector) {
  const meta = AUTOMATION_META[c.level]
  return (
    <span className={`conn-level conn-level-${c.level}`} title={meta.note}>
      {meta.label}
      {meta.setAndForget && <span className="conn-auto" title="Set-and-forget — no re-entry needed">· auto</span>}
    </span>
  )
}

function ConnectorRow({ c, onActivity }: { c: Connector; onActivity: Props['onActivity'] }) {
  const meta = AUTOMATION_META[c.level]
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const activity = c.normalize(String(reader.result))
        onActivity(activity)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[connector:${c.id}] parse failed`, err)
      }
    }
    reader.readAsText(file)
  }

  // Run a `url`-kind connector's sync. Both attempt a REAL fetch (via
  // VITE_SCRAPE_PROXY in the browser, directly server-side) and report whether
  // they got live data or fell back to seed. Ultimate hits results.wfdf.sport;
  // Geocaching hits the geocaching.com public profile (souvenir count is public;
  // the find total is auth-gated, so finds stay seed-derived).
  async function onUrlSync() {
    setBusy(true)
    setStatus(null)
    try {
      if (c.id === 'ultimate-results') {
        const { results, live } = await syncUltimateResults({ proxyBase: SCRAPE_PROXY })
        onActivity(c.normalize(results))
        setStatus(
          live
            ? `Fetched live from results.wfdf.sport — ${results.length} tournaments.`
            : `Loaded ${results.length} tournaments (seed — set VITE_SCRAPE_PROXY for live browser fetch).`,
        )
      } else if (c.id === 'geocaching') {
        const { profile, live, souvenirsCount } = await syncGeocachingProfile(
          MICHAEL_GEOCACHE_FINDS,
          MICHAEL_GEOCACHE_FINDS.username,
          { proxyBase: SCRAPE_PROXY },
        )
        onActivity(c.normalize(profile))
        setStatus(
          live
            ? `Verified live at geocaching.com/${profile.username} — ${souvenirsCount ?? 0} souvenirs public; ${MICHAEL_GEOCACHE_FINDS.finds.length} finds (find total is auth-gated).`
            : `Loaded ${MICHAEL_GEOCACHE_FINDS.finds.length} finds (seed — public profile fetch needs VITE_SCRAPE_PROXY in the browser).`,
        )
      }
    } catch (err) {
      setStatus('Sync failed — see console.')
      // eslint-disable-next-line no-console
      console.error(`[connector:${c.id}] sync failed`, err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={`conn-row conn-${c.status}`}>
      <div className="conn-head">
        <span className="conn-name">{c.name}</span>
        <div className="conn-badges">
          {levelBadge(c)}
          {c.status === 'planned' && <span className="conn-planned">planned</span>}
        </div>
      </div>
      <p className="conn-signal">{c.signal}</p>
      <p className="conn-note">{meta.note}</p>
      {c.status === 'live' && c.connect.kind === 'file' && (
        <label className="conn-action">
          <span className="conn-btn">Choose {c.connect.accept} file…</span>
          <input
            type="file"
            accept={c.connect.accept}
            onChange={onFile}
            aria-label={`Import file for ${c.name}`}
            style={{ display: 'none' }}
          />
        </label>
      )}
      {c.status === 'live' && c.connect.kind === 'credentials' && (
        <EphemeralConnectCard connector={c} onActivity={onActivity} />
      )}
      {c.status === 'live' && c.connect.kind === 'token' && (
        <span className="conn-action conn-disabled">Token connect — wired via the adapter (demo)</span>
      )}
      {c.status === 'live' && c.connect.kind === 'url' && (
        <>
          <button
            type="button"
            className="conn-action conn-btn"
            onClick={onUrlSync}
            disabled={busy}
          >
            {busy ? 'Syncing…' : c.id === 'geocaching' ? 'Sync my profile (live)' : 'Sync my results (live)'}
          </button>
          {status && <p className="conn-note" style={{ marginTop: 6 }}>{status}</p>}
        </>
      )}
      {c.status === 'planned' && (
        <span className="conn-action conn-disabled">Not built yet</span>
      )}
    </li>
  )
}

export function ConnectorsPanel({ onActivity }: Props) {
  const connectors = useMemo(() => listConnectors(), [])
  const live = connectors.filter((c) => c.status === 'live')
  const planned = connectors.filter((c) => c.status === 'planned')

  return (
    <div className="connectors-panel">
      <p className="hint">
        Every source plugs in here at the highest automation level it allows.
        The badge is an honest label of how it syncs — API and email export are
        set-and-forget; manual and one-shot need you present.
      </p>
      <ul className="conn-list">
        {live.map((c) => (
          <ConnectorRow key={c.id} c={c} onActivity={onActivity} />
        ))}
        {planned.map((c) => (
          <ConnectorRow key={c.id} c={c} onActivity={onActivity} />
        ))}
      </ul>
    </div>
  )
}

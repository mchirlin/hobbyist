import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  listConnectors,
  AUTOMATION_META,
  type Connector,
} from '../integrations/registry'
import { registerBuiltinConnectors } from '../integrations/connectors'
import { connectionStore, isLinkable, type Connection } from '../integrations/connections'
import { runSync } from '../integrations/syncEngine'
import type { HobbyActivity } from '../integrations/activity'
import { EphemeralConnectCard } from './EphemeralConnectCard'
import { ConnectDialog } from './ConnectDialog'

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

/** A short label for what account is linked (from the saved config). */
function linkedAs(conn: Connection): string {
  if (conn.config.handle) return conn.config.handle
  if (conn.config.token) return 'API token'
  return 'linked'
}

function relTime(iso?: string): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function ConnectorRow({ c, onActivity }: { c: Connector; onActivity: Props['onActivity'] }) {
  const meta = AUTOMATION_META[c.level]
  const connections = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot)
  const connection = connections[c.id]
  const linkable = isLinkable(c.level)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        onActivity(c.normalize(String(reader.result)))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[connector:${c.id}] parse failed`, err)
      }
    }
    reader.readAsText(file)
  }

  // Re-sync an already-linked connector against its SAVED config.
  async function onSyncNow() {
    if (!connection) return
    setBusy(true)
    setStatus(null)
    try {
      const outcome = await runSync(c, connection.config, { proxyBase: SCRAPE_PROXY })
      onActivity(outcome.activity)
      connectionStore.markSynced(c.id)
      setStatus(outcome.status)
    } catch (err) {
      setStatus('Sync failed — see console.')
      // eslint-disable-next-line no-console
      console.error(`[connector:${c.id}] sync failed`, err)
    } finally {
      setBusy(false)
    }
  }

  function onDisconnect() {
    connectionStore.remove(c.id)
    setStatus(null)
  }

  return (
    <li className={`conn-row conn-${c.status} ${connection ? 'conn-linked' : ''}`}>
      <div className="conn-head">
        <span className="conn-name">{c.name}</span>
        <div className="conn-badges">
          {levelBadge(c)}
          {connection && <span className="conn-linked-dot" title="Connected">● linked</span>}
          {c.status === 'planned' && <span className="conn-planned">planned</span>}
        </div>
      </div>
      <p className="conn-signal">{c.signal}</p>
      <p className="conn-note">{meta.note}</p>

      {/* ---- File-drop connectors (manual): unchanged inline flow ---- */}
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

      {/* ---- Ephemeral (one-shot login): deliberately NOT linkable ---- */}
      {c.status === 'live' && c.connect.kind === 'credentials' && (
        <EphemeralConnectCard connector={c} onActivity={onActivity} />
      )}

      {/* ---- Saveable connectors (url / token): the Plaid-Link flow ---- */}
      {c.status === 'live' && (c.connect.kind === 'url' || c.connect.kind === 'token') && linkable && (
        <div className="conn-link-block">
          {!connection ? (
            <button
              type="button"
              className="conn-action conn-btn conn-connect"
              onClick={() => setDialogOpen(true)}
            >
              Connect
            </button>
          ) : (
            <div className="conn-linked-row">
              <div className="conn-linked-meta">
                <span className="conn-linked-as">Linked as <strong>{linkedAs(connection)}</strong></span>
                <span className="conn-linked-sync">Last sync: {relTime(connection.lastSyncAt)}</span>
              </div>
              <div className="conn-linked-actions">
                <button type="button" className="conn-btn" onClick={onSyncNow} disabled={busy}>
                  {busy ? 'Syncing…' : 'Sync now'}
                </button>
                <button type="button" className="conn-ghost" onClick={() => setDialogOpen(true)} disabled={busy}>
                  Edit
                </button>
                <button type="button" className="conn-ghost conn-danger" onClick={onDisconnect} disabled={busy}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
          {status && <p className="conn-note" style={{ marginTop: 6 }}>{status}</p>}
        </div>
      )}

      {dialogOpen && (
        <ConnectDialog
          connector={c}
          proxyBase={SCRAPE_PROXY}
          onActivity={onActivity}
          onClose={() => setDialogOpen(false)}
        />
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
        Every source plugs in here at the highest automation level it allows —
        like connecting an account. Click <strong>Connect</strong>, link it once,
        and it's remembered for one-click re-syncs. One-shot login is the
        exception: it stores nothing, so you re-enter each time.
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

import { useEffect, useRef, useState } from 'react'
import type { Connector } from '../integrations/registry'
import { AUTOMATION_META } from '../integrations/registry'
import type { HobbyActivity } from '../integrations/activity'
import { connectionStore, type ConnectionConfig } from '../integrations/connections'
import { runSync } from '../integrations/syncEngine'

interface Props {
  connector: Connector
  proxyBase?: string
  onActivity: (a: HobbyActivity) => void
  onClose: () => void
}

/**
 * The "Plaid Link" modal. Opens for one connector, collects exactly what its
 * connect kind needs, SAVES the link to the connection store, then runs the
 * first sync. After this the panel shows the connector as linked and re-syncing
 * reads the saved config — no hardcoded account anywhere.
 *
 * `file` and `credentials` kinds are handled by their own inline cards in the
 * panel (a file drop / the no-store ephemeral form), so this dialog covers the
 * SAVEABLE kinds: `url` (username/profile URL) and `token` (API key).
 */
export function ConnectDialog({ connector, proxyBase, onActivity, onClose }: Props) {
  const meta = AUTOMATION_META[connector.level]
  const isUrl = connector.connect.kind === 'url'
  const isToken = connector.connect.kind === 'token'
  const existing = connectionStore.get(connector.id)

  const [handle, setHandle] = useState(existing?.config.handle ?? '')
  const [token, setToken] = useState(existing?.config.token ?? '')
  const [phase, setPhase] = useState<'input' | 'linking' | 'done' | 'error'>('input')
  const [message, setMessage] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Focus the first field on open, and close on Escape.
  useEffect(() => {
    firstFieldRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const placeholder =
    connector.connect.kind === 'url' || connector.connect.kind === 'token'
      ? connector.connect.placeholder
      : ''

  const canSubmit = isUrl ? handle.trim().length > 0 : isToken ? token.trim().length > 0 : true

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const config: ConnectionConfig = {}
    if (isUrl) config.handle = handle.trim()
    if (isToken) config.token = token.trim()

    setPhase('linking')
    setMessage('Linking and running your first sync…')
    // Save the link FIRST (Plaid saves the Item before the first data pull), so
    // even if the sync falls back to seed the account stays connected.
    connectionStore.save(connector.id, config)
    try {
      const outcome = await runSync(connector, config, { proxyBase })
      onActivity(outcome.activity)
      connectionStore.markSynced(connector.id)
      setPhase('done')
      setMessage(outcome.status)
    } catch (err) {
      setPhase('error')
      setMessage(err instanceof Error ? err.message : 'Sync failed')
      // eslint-disable-next-line no-console
      console.error(`[connect:${connector.id}] first sync failed`, err)
    }
  }

  return (
    <div className="cd-overlay" role="dialog" aria-modal="true" aria-labelledby="cd-title" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cd-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="cd-brand">
          <span className="cd-hobby">{connector.hobby}</span>
          <h3 id="cd-title">Connect {connector.name}</h3>
        </div>
        <p className="cd-signal">{connector.signal}</p>
        <div className={`cd-level cd-level-${connector.level}`}>
          <strong>{meta.label}</strong> — {meta.note}
        </div>

        {phase !== 'done' ? (
          <form className="cd-form" onSubmit={onSubmit}>
            {isUrl && (
              <label className="cd-field">
                <span>{placeholder}</span>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={placeholder}
                  autoComplete="off"
                  disabled={phase === 'linking'}
                />
              </label>
            )}
            {isToken && (
              <label className="cd-field">
                <span>{placeholder}</span>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={placeholder}
                  autoComplete="off"
                  disabled={phase === 'linking'}
                />
                <small className="cd-hint">
                  An API token is safe to store and revoke — unlike a password. It's
                  saved locally in this browser only.
                </small>
              </label>
            )}
            <div className="cd-actions">
              <button type="button" className="cd-secondary" onClick={onClose} disabled={phase === 'linking'}>
                Cancel
              </button>
              <button type="submit" className="cd-primary" disabled={!canSubmit || phase === 'linking'}>
                {phase === 'linking' ? 'Linking…' : existing ? 'Update & sync' : 'Connect'}
              </button>
            </div>
            {message && phase !== 'input' && (
              <p className={`cd-status cd-${phase}`}>{message}</p>
            )}
          </form>
        ) : (
          <div className="cd-success">
            <p className="cd-status cd-done">✓ {message}</p>
            <button className="cd-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { Connector } from '../integrations/registry'
import type { HobbyActivity } from '../integrations/activity'

// A small in-browser stand-in for the headless-browser export. The REAL fetch
// lives in scripts/ephemeral-sync/run.mjs (Playwright, server-side) — it can't
// run in the browser, so here we simulate the "login → export → CSV" round trip
// with a fixed sample so the no-store credential MODEL is demonstrable end to
// end. The credentials are used only to gate this call, then dropped.
const SAMPLE_EXPORT_CSV = [
  'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,State/Province,County,Location ID,Location,Latitude,Longitude,Date,Time',
  'S1,American Robin,Turdus migratorius,1,2,US-MA,,,Backyard,,,2026-07-01,07:12',
  'S2,Northern Cardinal,Cardinalis cardinalis,2,1,US-MA,,,Backyard,,,2026-07-01,07:15',
  'S3,Black-capped Chickadee,Poecile atricapillus,3,3,US-MA,,,Trail,,,2026-07-02,08:00',
  'S4,Blue Jay,Cyanocitta cristata,4,1,US-MA,,,Trail,,,2026-07-02,08:05',
  'S5,Red-tailed Hawk,Buteo jamaicensis,5,1,US-MA,,,Ridge,,,2026-07-03,10:20',
  'S6,Osprey,Pandion haliaetus,6,1,US-MA,,,Harbor,,,2026-07-04,16:40',
  'S7,Gull sp.,Larus sp.,7,4,US-MA,,,Harbor,,,2026-07-04,16:45',
].join('\n')

async function mockEphemeralFetch(username: string, password: string): Promise<string> {
  // Gate on non-empty credentials (a real run would fail auth here).
  if (!username || !password) throw new Error('Missing credentials')
  await new Promise((r) => setTimeout(r, 550)) // simulate the login round-trip
  return SAMPLE_EXPORT_CSV
}

interface Props {
  connector: Connector
  onActivity: (a: HobbyActivity) => void
}

/**
 * Ephemeral (no-store) login form. Credentials live ONLY in component state for
 * a single submit, are handed to the fetch, and are cleared immediately after —
 * never persisted, never lifted into a parent store. To sync again the user
 * re-enters them. This is the UI half of spectrum level 4 done safely.
 */
export function EphemeralConnectCard({ connector, onActivity }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('running')
    setMessage('Signing in and fetching your export…')
    // Capture into locals, then clear the React state IMMEDIATELY so the
    // component never holds the credential past this handler.
    const u = username
    const p = password
    setUsername('')
    setPassword('')
    try {
      const csv = await mockEphemeralFetch(u, p)
      const activity = connector.normalize(csv)
      onActivity(activity)
      setStatus('done')
      setMessage(
        `Synced ${activity.activityCount} species — credentials discarded. Re-enter to sync again.`,
      )
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Sync failed')
    }
  }

  return (
    <form className="ephemeral-form" onSubmit={onSubmit}>
      <div className="eph-fields">
        <input
          type="text"
          placeholder="eBird username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label={`${connector.name} username`}
          autoComplete="off"
        />
        <input
          type="password"
          placeholder="eBird password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label={`${connector.name} password`}
          autoComplete="off"
        />
        <button type="submit" className="conn-btn" disabled={status === 'running'}>
          {status === 'running' ? 'Syncing…' : 'Sync once'}
        </button>
      </div>
      <p className="eph-note">
        🔒 Used for this one sync, held in memory, then discarded — never stored,
        never logged. (Real headless run:{' '}
        <code>scripts/ephemeral-sync/run.mjs</code>; this in-browser form
        demonstrates the credential lifecycle with a sample export.)
      </p>
      {message && <p className={`eph-status eph-${status}`}>{message}</p>}
    </form>
  )
}

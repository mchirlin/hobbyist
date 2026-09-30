import { useState } from 'react'
import { parseEbirdCsv, ebirdCsvToActivity } from '../integrations/ebirdCsv'
import type { HobbyActivity } from '../integrations/activity'
import { LEVELS } from '../data/types'

interface Props {
  onActivity: (a: HobbyActivity) => void
}

/**
 * Import an eBird "Download My Data" export (MyEBirdData.csv) entirely in the
 * browser — nothing is uploaded to a server. Derives the real life-list signal
 * and drives the Birding patch. This is the manual seed of what an email-ingest
 * connector would later do automatically.
 */
export function EbirdImportCard({ onActivity }: Props) {
  const [summary, setSummary] = useState<HobbyActivity | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseEbirdCsv(String(reader.result ?? ''))
        if (rows.length === 0) {
          setError('No rows found — is this a MyEBirdData.csv export?')
          return
        }
        const activity = ebirdCsvToActivity(rows)
        setSummary(activity)
        onActivity(activity)
      } catch (e) {
        setError('Could not parse that file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="coach-card">
      <h2>🐦 eBird Auto-Sync <span className="tag">connector demo</span></h2>
      <p className="hint">
        Drop your eBird “Download My Data” export (MyEBirdData.csv) — parsed in
        your browser, nothing uploaded. Your life list drives the Birding patch.
      </p>

      <label className="drop" style={{ cursor: 'pointer' }}>
        <input
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <span className="drop-plus">＋</span>
        Choose MyEBirdData.csv
      </label>

      {error && <p className="score" style={{ color: '#e03131' }}>{error}</p>}

      {summary && (
        <div className="feedback" style={{ marginTop: 12 }}>
          <div className="feedback-head">
            <strong>Birding — life list</strong>
            <span className="ts">from eBird export</span>
          </div>
          <p className="score">
            <strong>{summary.activityCount}</strong> species ·{' '}
            level <strong>{LEVELS[summary.level]}</strong>
            {summary.lastActive && <> · last active {summary.lastActive}</>}
          </p>
        </div>
      )}
    </div>
  )
}

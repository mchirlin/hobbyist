import { useState } from 'react'

// Illustrative sample feedback — in the real product this comes from an AI
// model analyzing the uploaded clip against a per-hobby rubric.
const SAMPLE_FEEDBACK = [
  { t: '0:02', tip: 'Good setup — steady stance and a relaxed grip.', good: true },
  { t: '0:05', tip: 'Your elbow drops on the downswing; keep it tucked.', good: false },
  { t: '0:08', tip: 'Rushing the follow-through — hold the finish a beat longer.', good: false },
]

/**
 * Mock of the flagship "AI Video Coaching" flow: upload a clip, get
 * timestamped, prioritized feedback. No real upload/AI — it's a UI sketch.
 */
export function VideoCoachCard() {
  const [analyzed, setAnalyzed] = useState(false)

  return (
    <div className="coach-card">
      <h2>🎥 AI Video Coaching <span className="tag">flagship idea</span></h2>
      <p className="hint">
        Upload a clip of yourself and get coach-style feedback on how to improve.
      </p>

      {!analyzed ? (
        <button className="drop" onClick={() => setAnalyzed(true)}>
          <span className="drop-plus">＋</span>
          Drop a video here (demo — click to see sample feedback)
        </button>
      ) : (
        <div className="feedback">
          <div className="feedback-head">
            <strong>Ukulele — strumming clip</strong>
            <button className="reset" onClick={() => setAnalyzed(false)}>
              ↺ try another
            </button>
          </div>
          <ul>
            {SAMPLE_FEEDBACK.map((f, i) => (
              <li key={i} className={f.good ? 'ok' : 'fix'}>
                <span className="ts">{f.t}</span>
                <span>{f.tip}</span>
              </li>
            ))}
          </ul>
          <p className="score">
            Technique score <strong>62/100</strong> — up from 54 last clip. Nice
            progress toward the <em>Skilled</em> level.
          </p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { PatchSash } from './components/PatchSash'
import { HobbyProgress } from './components/HobbyProgress'
import { VideoCoachCard } from './components/VideoCoachCard'
import { EbirdImportCard } from './components/EbirdImportCard'
import { sampleProfile } from './data/sampleProfile'
import type { Profile } from './data/types'
import type { HobbyActivity } from './integrations/activity'

export default function App() {
  const [replayKey, setReplayKey] = useState(0)
  const [profile, setProfile] = useState<Profile>(sampleProfile)

  // Apply a synced activity signal to the matching hobby: level from the
  // adapter, importance scaled from the activity magnitude (capped 1–10).
  function applyActivity(a: HobbyActivity) {
    setProfile((p) => ({
      ...p,
      hobbies: p.hobbies.map((h) =>
        h.name === a.hobby
          ? {
              ...h,
              level: a.level,
              // map life-list size onto the 1–10 importance scale (illustrative)
              importance: Math.max(1, Math.min(10, Math.round(a.activityCount / 25) + 2)),
            }
          : h,
      ),
    }))
    setReplayKey((k) => k + 1) // replay so the resized patch animates in
  }

  return (
    <main className="page">
      <header>
        <h1>The Hobbyist</h1>
        <p className="tagline">Add that second dimension.</p>
      </header>

      <section className="cloud-card">
        <h2>{profile.displayName}'s Hobby Sash</h2>
        <p className="hint">
          Your hobbies as a collection of earned patches — bigger patch = bigger
          part of your life. One shareable image.
        </p>
        <PatchSash profile={profile} size={620} replayKey={replayKey} />
        <button className="replay" onClick={() => setReplayKey((k) => k + 1)}>
          ↻ Replay animation
        </button>
      </section>

      <section className="ranked">
        <EbirdImportCard onActivity={applyActivity} />
      </section>

      <section className="ranked">
        <h2>Level up &amp; missions</h2>
        <p className="hint">Every hobby has a ladder — and a concrete next step.</p>
        <HobbyProgress profile={profile} />
      </section>

      <section className="ranked">
        <VideoCoachCard />
      </section>

      <footer>
        Prototype · edit <code>src/data/sampleProfile.ts</code> to change the
        hobbies and weights, and the cloud rebalances.
      </footer>
    </main>
  )
}

import { useMemo, useState } from 'react'
import { PlaySash } from './components/PlaySash'
import { HobbyProgress } from './components/HobbyProgress'
import { VideoCoachCard } from './components/VideoCoachCard'
import { EbirdImportCard } from './components/EbirdImportCard'
import { ConnectorsPanel } from './components/ConnectorsPanel'
import { QuestBoard } from './components/QuestBoard'
import { ImportanceEditor } from './components/ImportanceEditor'
import { sampleProfile } from './data/sampleProfile'
import { sampleQuests } from './quests/sampleQuests'
import { hobbyXp, levelFromXp, type QuestCompletions } from './quests/quests'
import type { Profile } from './data/types'
import type { HobbyActivity } from './integrations/activity'

export default function App() {
  const [baseProfile, setBaseProfile] = useState<Profile>(sampleProfile)
  const [completions, setCompletions] = useState<QuestCompletions>({})
  const [editingImportance, setEditingImportance] = useState(false)

  // The profile that actually drives the sash: base levels raised by quest XP.
  // Quests never LOWER a hobby (max of base and quest-derived level), so the
  // passive signal and the active engine compose instead of fighting.
  const profile = useMemo<Profile>(() => {
    return {
      ...baseProfile,
      hobbies: baseProfile.hobbies.map((h) => {
        const xp = hobbyXp(sampleQuests, completions, h.name)
        if (xp === 0) return h
        const questLevel = levelFromXp(xp)
        return { ...h, level: Math.max(h.level ?? 0, questLevel) }
      }),
    }
  }, [baseProfile, completions])

  // Apply a synced activity signal to the matching hobby: level from the
  // adapter, importance scaled from the activity magnitude (capped 1–10).
  function applyActivity(a: HobbyActivity) {
    setBaseProfile((p) => ({
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
  }

  // Toggle a quest's completion (self-attested). The sash reflects any
  // resulting level-up on its next physics render.
  function toggleQuest(questId: string) {
    setCompletions((c) => {
      const next = { ...c }
      if (next[questId]) delete next[questId]
      else next[questId] = new Date().toISOString()
      return next
    })
  }

  // Explicit override: set a hobby's importance (patch size) directly.
  function setImportance(hobby: string, importance: number) {
    setBaseProfile((p) => ({
      ...p,
      hobbies: p.hobbies.map((h) =>
        h.name === hobby ? { ...h, importance } : h,
      ),
    }))
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
          part of your life. Grab a patch and fling it; they bump into each other
          and settle.
        </p>
        <PlaySash profile={profile} size={620} />
        <button
          className="replay"
          onClick={() => setEditingImportance((v) => !v)}
        >
          {editingImportance ? '✕ Done editing' : '⚖ Edit importance'}
        </button>
        {editingImportance && (
          <div className="importance-panel">
            <p className="hint">
              Drag to set how big a part of your life each hobby is — the sash
              rebalances live. (Auto-sync will set these for you later; this is
              the cold-start + override path.)
            </p>
            <ImportanceEditor profile={profile} onChange={setImportance} />
          </div>
        )}
      </section>

      <section className="ranked">
        <h2>Quests</h2>
        <p className="hint">
          The active engine — complete daily, weekly, and monthly challenges to
          earn XP and level up a patch. No account connection needed.
        </p>
        <QuestBoard
          profile={profile}
          quests={sampleQuests}
          completions={completions}
          onToggle={toggleQuest}
        />
      </section>

      <section className="ranked">
        <h2>Connectors</h2>
        <p className="hint">
          The passive engine — each source feeds the sash at the highest
          automation level it allows. Live ones work now; planned ones show
          where the framework is going.
        </p>
        <ConnectorsPanel onActivity={applyActivity} />
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
        hobbies and weights, and the sash rebalances.
      </footer>
    </main>
  )
}

import { useMemo, useState, useSyncExternalStore } from 'react'
import { PlaySash } from './components/PlaySash'
import { HobbyProgress } from './components/HobbyProgress'
import { VideoCoachCard } from './components/VideoCoachCard'
import { EbirdImportCard } from './components/EbirdImportCard'
import { ConnectorsPanel } from './components/ConnectorsPanel'
import { AddHobbyButton } from './components/AddHobbyButton'
import { QuestBoard } from './components/QuestBoard'
import { ImportanceEditor } from './components/ImportanceEditor'
import { sampleQuests } from './quests/sampleQuests'
import { hobbyXp, levelFromXp, type QuestCompletions } from './quests/quests'
import { profileStore, isDeclared } from './integrations/profileStore'
import type { Profile } from './data/types'
import type { HobbyActivity } from './integrations/activity'

export default function App() {
  // The collection is now PERSISTED (profileStore) — a declared hobby survives
  // a reload, which is what makes "build a case of patches" feel real. The
  // store is the single source of truth; add/remove/enrich all go through it.
  const baseProfile = useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    profileStore.getSnapshot,
  )
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

  const declaredCount = baseProfile.hobbies.filter(isDeclared).length
  const enrichedCount = baseProfile.hobbies.length - declaredCount
  const existingNames = baseProfile.hobbies.map((h) => h.name.toLowerCase())

  // Enrich a hobby from a synced activity signal — persisted via the store, so
  // the patch flips declared → enriched and stays that way across reloads.
  function applyActivity(a: HobbyActivity) {
    profileStore.applyActivity(a)
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

  return (
    <main className="page">
      <header>
        <h1>The Hobbyist</h1>
        <p className="tagline">
          Collect everything you’re into. Tap to add a hobby; connect real data
          to level it up.
        </p>
      </header>

      <section className="cloud-card">
        <h2>{profile.displayName}’s Collection</h2>
        <p className="hint">
          {baseProfile.hobbies.length} patches · {enrichedCount} earned with real
          data · {declaredCount} waiting to be filled in. Grab a patch and fling
          it — they bump into each other and settle.
        </p>
        <PlaySash profile={profile} size={620} />

        <div className="add-hobby-wrap">
          <AddHobbyButton
            existing={existingNames}
            onAdd={(input) => profileStore.addHobby(input)}
          />
        </div>

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
              rebalances live. (Connecting real data sets these for you; this is
              the cold-start + override path.)
            </p>
            <ImportanceEditor profile={profile} onChange={profileStore.setImportance} />
            <div className="declared-manage">
              {baseProfile.hobbies.filter(isDeclared).map((h) => (
                <button
                  key={h.name}
                  className="declared-remove"
                  onClick={() => profileStore.removeHobby(h.name)}
                >
                  Remove {h.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="ranked">
        <h2>Level up a patch</h2>
        <p className="hint">
          The enrich half of the loop — connect a real source and watch an empty
          patch fill in. Live ones work now; planned ones show where it’s going.
        </p>
        <ConnectorsPanel onActivity={applyActivity} />
      </section>

      <section className="ranked">
        <EbirdImportCard onActivity={applyActivity} />
      </section>

      <section className="ranked">
        <h2>Quests</h2>
        <p className="hint">
          No account needed — complete daily, weekly, and monthly challenges to
          earn XP and level up a patch.
        </p>
        <QuestBoard
          profile={profile}
          quests={sampleQuests}
          completions={completions}
          onToggle={toggleQuest}
        />
      </section>

      <section className="ranked">
        <h2>Medals &amp; missions</h2>
        <p className="hint">Every hobby has countable medals — and a concrete next step.</p>
        <HobbyProgress profile={profile} />
      </section>

      <section className="ranked">
        <VideoCoachCard />
      </section>

      <footer>
        Prototype · your collection is saved in this browser. Add a hobby above,
        or connect a source to level one up.
      </footer>
    </main>
  )
}

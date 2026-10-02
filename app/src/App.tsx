import { useMemo, useState, useSyncExternalStore } from 'react'
import { PlaySash } from './components/PlaySash'
import { HobbyList } from './components/HobbyList'
import { HobbyDetail } from './components/HobbyDetail'
import { EbirdImportCard } from './components/EbirdImportCard'
import { ConnectorsPanel } from './components/ConnectorsPanel'
import { AddHobbyButton } from './components/AddHobbyButton'
import { CreateHobbyWizard } from './components/CreateHobbyWizard'
import { QuestBoard } from './components/QuestBoard'
import { ImportanceEditor } from './components/ImportanceEditor'
import { hobbyXp, levelFromXp, type Quest, type QuestCompletions } from './quests/quests'
import { profileStore, isDeclared } from './integrations/profileStore'
import { definitionStore } from './data/definitionStore'
import { questsFromDefinition } from './data/hobbyDefinition'
import { CATEGORY_ARCHETYPE } from './data/sampleProfile'
import type { Profile } from './data/types'
import type { HobbyActivity } from './integrations/activity'

type Tab = 'collection' | 'quests' | 'connect' | 'profile'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'collection', label: 'Collection', icon: '🎖️' },
  { id: 'quests', label: 'Quests', icon: '🎯' },
  { id: 'connect', label: 'Connect', icon: '🔌' },
  { id: 'profile', label: 'Profile', icon: '👤' },
]

export default function App() {
  // Collection PERSISTED via profileStore — single source of truth.
  const baseProfile = useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    profileStore.getSnapshot,
  )
  // Hobby definitions (universal catalog + local edits) — the source of every
  // quest (recurring + one-time). Subscribing keeps the pool live on edits.
  const definitions = useSyncExternalStore(
    definitionStore.subscribe,
    definitionStore.getSnapshot,
  )
  const [completions, setCompletions] = useState<QuestCompletions>({})

  // The ONE quest pool: every definition's quests materialized (recurring +
  // one-time "steps", each with XP). Missions and quests are now one thing.
  const quests = useMemo<Quest[]>(
    () => definitions.flatMap((d) => questsFromDefinition(d)),
    [definitions],
  )

  // App-shell navigation, modeled on Pokémon GO / Facebook: a persistent
  // bottom tab bar is the primary nav, each tab is a focused screen, and a
  // hobby opens into a full-screen detail you back out of. No more one long
  // scroll with everything stacked.
  const [tab, setTab] = useState<Tab>('collection')
  const [openHobby, setOpenHobby] = useState<string | null>(null)
  const [editingImportance, setEditingImportance] = useState(false)
  const [creating, setCreating] = useState(false)

  // Sash-driving profile: base levels raised by quest XP (never lowered).
  const profile = useMemo<Profile>(() => {
    return {
      ...baseProfile,
      hobbies: baseProfile.hobbies.map((h) => {
        const xp = hobbyXp(quests, completions, h.name)
        if (xp === 0) return h
        const questLevel = levelFromXp(xp)
        return { ...h, level: Math.max(h.level ?? 0, questLevel) }
      }),
    }
  }, [baseProfile, quests, completions])

  const declaredCount = baseProfile.hobbies.filter(isDeclared).length
  const enrichedCount = baseProfile.hobbies.length - declaredCount
  const existingNames = baseProfile.hobbies.map((h) => h.name.toLowerCase())

  // Dominant category → archetype title for the profile identity card.
  const archetype = useMemo(() => {
    const byCat: Record<string, number> = {}
    for (const h of profile.hobbies) {
      byCat[h.category] = (byCat[h.category] ?? 0) + (h.importance ?? 1)
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0]
    return top ? CATEGORY_ARCHETYPE[top] ?? '' : ''
  }, [profile])

  function applyActivity(a: HobbyActivity) {
    profileStore.applyActivity(a)
  }

  function toggleQuest(questId: string) {
    setCompletions((c) => {
      const next = { ...c }
      if (next[questId]) delete next[questId]
      else next[questId] = new Date().toISOString()
      return next
    })
  }

  // Wipe all earned progress but KEEP every hobby (and its definition). Resets
  // the two progress layers: synced levels/metrics (profileStore) and quest
  // completions (local state — now covers the old missions too, since missions
  // are unified into quests).
  function resetProgress() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Clear all progress from every hobby? Your hobbies stay — only levels, medals, and quest completions are reset.',
      )
    ) {
      return
    }
    profileStore.clearProgress()
    setCompletions({})
  }

  function openHobbyDetail(name: string) {
    setTab('collection')
    setOpenHobby(name)
  }

  const activeHobby =
    openHobby !== null ? profile.hobbies.find((h) => h.name === openHobby) : undefined

  // ---- Full-screen hobby drill-down (overlays the Collection tab) ------
  if (activeHobby) {
    return (
      <main className="page has-tabbar">
        <HobbyDetail
          hobby={activeHobby}
          profile={profile}
          quests={quests}
          completions={completions}
          onToggleQuest={toggleQuest}
          onBack={() => setOpenHobby(null)}
        />
        <TabBar active="collection" onChange={(t) => { setOpenHobby(null); setTab(t) }} />
      </main>
    )
  }

  return (
    <main className="page has-tabbar">
      {tab === 'collection' && (
        <>
          <header className="app-head">
            <h1>Collection</h1>
          </header>

          <section className="cloud-card">
            <h2>{profile.displayName}’s Collection</h2>
            <p className="hint">
              {baseProfile.hobbies.length} patches · {enrichedCount} earned with
              real data · {declaredCount} to fill in.
            </p>
            <PlaySash profile={profile} size={620} />
          </section>

          <section className="ranked">
            <h2>Your hobbies</h2>
            <p className="hint">Tap one for its rank, steps, medals, and challenges.</p>
            <HobbyList profile={profile} onOpen={openHobbyDetail} />

            <div className="add-hobby-wrap">
              {creating ? (
                <CreateHobbyWizard
                  existing={existingNames}
                  onCancel={() => setCreating(false)}
                  onCommit={(draft) => {
                    definitionStore.addDefinition(draft)
                    profileStore.addHobby({
                      name: draft.name,
                      category: draft.category,
                      icon: draft.emblem,
                    })
                    setCreating(false)
                  }}
                />
              ) : (
                <>
                  <AddHobbyButton
                    existing={existingNames}
                    onAdd={(input) => profileStore.addHobby(input)}
                  />
                  <button className="create-with-ai" onClick={() => setCreating(true)}>
                    ✨ Create with AI — draft everything for me
                  </button>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'quests' && (
        <>
          <header className="app-head">
            <h1>Quests</h1>
          </header>
          <section className="ranked">
            <p className="hint">
              No account needed — complete daily, weekly, and monthly challenges
              to earn XP and level up a patch.
            </p>
            <QuestBoard
              profile={profile}
              quests={quests}
              completions={completions}
              onToggle={toggleQuest}
            />
          </section>
        </>
      )}

      {tab === 'connect' && (
        <>
          <header className="app-head">
            <h1>Connect data</h1>
          </header>
          <section className="ranked">
            <p className="hint">
              Connect a real source and watch an empty patch fill in. Live ones
              work now; planned ones show where it’s going.
            </p>
            <ConnectorsPanel onActivity={applyActivity} />
          </section>
          <section className="ranked">
            <EbirdImportCard onActivity={applyActivity} />
          </section>
        </>
      )}

      {tab === 'profile' && (
        <>
          <header className="app-head">
            <h1>Profile</h1>
          </header>

          <section className="cloud-card profile-id">
            <div className="profile-avatar" aria-hidden>
              {profile.displayName.charAt(0)}
            </div>
            <h2>{profile.displayName}</h2>
            {archetype && <p className="profile-archetype">{archetype}</p>}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-num">{baseProfile.hobbies.length}</span>
                <span className="profile-stat-label">hobbies</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-num">{enrichedCount}</span>
                <span className="profile-stat-label">with real data</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-num">{declaredCount}</span>
                <span className="profile-stat-label">to fill in</span>
              </div>
            </div>
          </section>

          <section className="ranked">
            <h2>Manage collection</h2>
            <button className="replay" onClick={() => setEditingImportance((v) => !v)}>
              {editingImportance ? '✕ Done editing' : '⚖ Edit importance'}
            </button>
            {editingImportance && (
              <div className="importance-panel">
                <p className="hint">
                  Drag to set how big a part of your life each hobby is — the sash
                  rebalances live.
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
            <div className="danger-zone">
              <button className="reset-progress" onClick={resetProgress}>
                ♻ Reset all progress
              </button>
              <p className="hint">
                Keeps every hobby — clears earned levels, medals, and quest
                completions back to a fresh start.
              </p>
            </div>
            <footer>
              Prototype · your collection is saved in this browser.
            </footer>
          </section>
        </>
      )}

      <TabBar active={tab} onChange={setTab} />
    </main>
  )
}

/** Persistent bottom tab bar — the app's primary navigation (Pokémon GO /
 *  Facebook pattern). Fixed to the bottom, notch/home-indicator safe. */
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={'tab' + (active === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="tab-icon" aria-hidden>{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

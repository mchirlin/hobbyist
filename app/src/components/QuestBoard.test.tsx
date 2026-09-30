import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestBoard } from './QuestBoard'
import type { Profile } from '../data/types'
import type { Quest, QuestCompletions } from '../quests/quests'
import { CADENCE_XP } from '../quests/quests'

const profile: Profile = {
  displayName: 'Test',
  hobbies: [{ name: 'Birding', category: 'Outdoors', importance: 5, level: 0 }],
}

const quests: Quest[] = [
  { id: 'b-d', hobby: 'Birding', cadence: 'daily', text: 'Log a checklist', xp: CADENCE_XP.daily },
  { id: 'b-w', hobby: 'Birding', cadence: 'weekly', text: 'New species', xp: CADENCE_XP.weekly },
]

/** Find the checkbox input whose aria-label ends with the given quest text. */
function questCheckbox(text: string): HTMLInputElement {
  const box = screen
    .getAllByRole('checkbox')
    .find((el) => el.getAttribute('aria-label') === `Complete quest: ${text}`)
  if (!box) throw new Error(`no checkbox for "${text}"`)
  return box as HTMLInputElement
}

describe('<QuestBoard>', () => {
  it('renders quests grouped by cadence with XP labels', () => {
    render(
      <QuestBoard profile={profile} quests={quests} completions={{}} onToggle={() => {}} />,
    )
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
    expect(screen.getByText('Log a checklist')).toBeInTheDocument()
    expect(screen.getByText('+10 XP')).toBeInTheDocument()
    expect(screen.getByText('+40 XP')).toBeInTheDocument()
  })

  it('calls onToggle with the quest id when a checkbox is clicked', async () => {
    const onToggle = vi.fn()
    render(
      <QuestBoard profile={profile} quests={quests} completions={{}} onToggle={onToggle} />,
    )
    await userEvent.click(questCheckbox('Log a checklist'))
    expect(onToggle).toHaveBeenCalledWith('b-d')
  })

  it('shows the completed state and updated XP/level in progress', () => {
    const completions: QuestCompletions = { 'b-d': 'now', 'b-w': 'now' } // 50 XP
    render(
      <QuestBoard
        profile={profile}
        quests={quests}
        completions={completions}
        onToggle={() => {}}
      />,
    )
    // 50 XP < 60, still Novice, and the progress row reports the XP total.
    expect(screen.getByText('50 XP')).toBeInTheDocument()
    expect(screen.getByText('10 XP to Apprentice')).toBeInTheDocument()
    expect(questCheckbox('Log a checklist').checked).toBe(true)
  })
})

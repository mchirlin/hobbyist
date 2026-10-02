import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

/** Find a quest checkbox by the quest text embedded in its aria-label. */
function questCheckbox(text: string): HTMLInputElement {
  const box = screen
    .getAllByRole('checkbox')
    .find((el) => el.getAttribute('aria-label') === `Complete quest: ${text}`)
  if (!box) throw new Error(`no checkbox for "${text}"`)
  return box as HTMLInputElement
}

// Integration: completing quests must raise the matching hobby's level in the
// same profile that drives the sash — now across the tabbed app shell:
// Quests tab to complete, then drill into Birding to read its level.
describe('App quest → level integration (tabbed shell)', () => {
  it('completing Birding quests levels Birding from Novice to Apprentice', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Go to the Quests tab and complete Birding's monthly (120) + weekly (40)
    // + a daily (10) = 170 XP, crossing the 60-XP Apprentice threshold.
    await user.click(screen.getByRole('button', { name: /Quests/i }))
    await user.click(questCheckbox('Visit a new hotspot and log 10+ species.'))
    await user.click(questCheckbox('Add a species you have never seen before.'))
    await user.click(questCheckbox('Log one checklist on eBird today.'))

    // Back to Collection, drill into the Birding hobby, and confirm the detail
    // view now reads Apprentice.
    await user.click(screen.getByRole('button', { name: /^Collection$/i }))
    await user.click(screen.getByRole('button', { name: /Open Birding/i }))

    const hero = screen.getByRole('heading', { name: 'Birding' }).closest('.detail-hero')
    expect(hero).not.toBeNull()
    expect(within(hero as HTMLElement).getByText('Apprentice')).toBeInTheDocument()
  })

  it('shows the hobby list on the collection tab and drills into a hobby', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Collection tab is default: the hobby list rows are present.
    const birdingRow = screen.getByRole('button', { name: /Open Birding/i })
    expect(birdingRow).toBeInTheDocument()

    // Drill in — the detail hero + a Back control appear.
    await user.click(birdingRow)
    expect(screen.getByRole('heading', { name: 'Birding' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to collection/i })).toBeInTheDocument()
  })
})

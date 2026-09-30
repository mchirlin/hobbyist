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
// same profile that drives the sash. This is the end-to-end proof the browser
// click couldn't give (hidden checkbox inputs), locked as a regression test.
describe('App quest → level integration', () => {
  it('completing Birding quests levels Birding from Novice to Apprentice', async () => {
    render(<App />)

    // The "Level up & missions" list shows each hobby's current level. Find the
    // Birding progress card there and confirm it starts at Novice.
    const birdingCards = screen
      .getAllByText('Birding')
      .map((el) => el.closest('.progress-card'))
      .filter((c): c is HTMLElement => c !== null)
    expect(birdingCards.length).toBeGreaterThan(0)
    const card = birdingCards[0]
    expect(within(card).getByText('Novice')).toBeInTheDocument()

    // Complete Birding's monthly (120) + weekly (40) + a daily (10) = 170 XP,
    // which crosses the 60-XP Apprentice threshold.
    await userEvent.click(questCheckbox('Visit a new hotspot and log 10+ species.'))
    await userEvent.click(questCheckbox('Add a species you have never seen before.'))
    await userEvent.click(questCheckbox('Log one checklist on eBird today.'))

    // The same Birding card should now read Apprentice.
    const cardAfter = screen
      .getAllByText('Birding')
      .map((el) => el.closest('.progress-card'))
      .filter((c): c is HTMLElement => c !== null)[0]
    expect(within(cardAfter).getByText('Apprentice')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

/** Find a quest checkbox by the quest text embedded in its aria-label. */
function questCheckbox(text: string): HTMLInputElement {
  const box = screen
    .getAllByRole('checkbox')
    .find((el) => el.getAttribute('aria-label') === `Complete quest: ${text}`)
  if (!box) throw new Error(`no quest checkbox for "${text}"`)
  return box as HTMLInputElement
}

// Integration: a one-time "step" (the old mission, now a unified XP-bearing
// quest) is self-attested done via its checkbox in the hobby drill-down, and
// completing it moves the hobby's XP. Missions and quests are one thing now —
// this locks that a step toggles through the single completion path.
describe('App step (unified one-time quest) toggle', () => {
  it('checking a step marks it done and raises the hobby XP', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Steps live in the hobby drill-down — open 3D Printing (level 2).
    await user.click(screen.getByRole('button', { name: /Open 3D Printing/i }))

    // 3D Printing seeds a level-2 step; it's surfaced at the hobby's level.
    const text = 'Print a multi-part model with moving joints.'
    const box = questCheckbox(text)
    expect(box.checked).toBe(false)

    // XP before completing the step.
    const rank = screen.getByRole('img', { name: /^Level / }).closest('.detail-section')
    const xpBefore = within(rank as HTMLElement).getByText(/\d+ XP ·/).textContent

    await user.click(box)

    // The checkbox reflects done and the XP line changed (the step earned XP).
    expect(questCheckbox(text).checked).toBe(true)
    const xpAfter = within(rank as HTMLElement).getByText(/\d+ XP ·/).textContent
    expect(xpAfter).not.toBe(xpBefore)

    // Toggling off clears it again.
    await user.click(questCheckbox(text))
    expect(questCheckbox(text).checked).toBe(false)
  })
})

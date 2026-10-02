import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { missionProgressStore } from '../data/missionProgress'

/** Find a mission checkbox by the mission text embedded in its aria-label. */
function missionCheckbox(text: string): HTMLInputElement {
  const box = screen
    .getAllByRole('checkbox')
    .find((el) => el.getAttribute('aria-label') === `Complete mission: ${text}`)
  if (!box) throw new Error(`no mission checkbox for "${text}"`)
  return box as HTMLInputElement
}

// Integration: a mission is self-attested done via its checkbox, and the state
// persists through the store (the same store a reload reads). This is the proof
// a hidden-checkbox browser click can't give — locked as a regression test.
describe('App mission done toggle', () => {
  beforeEach(() => {
    missionProgressStore.reset()
  })

  it('checking a mission marks it done and persists to the store', async () => {
    render(<App />)

    // 3D Printing seeds a level-2 mission; it's relevant at the hobby's level.
    const text = 'Print a multi-part model with moving joints.'
    const box = missionCheckbox(text)
    expect(box.checked).toBe(false)

    await userEvent.click(box)

    // The checkbox reflects done, and the persisted store agrees (survives reload).
    expect(missionCheckbox(text).checked).toBe(true)
    expect(missionProgressStore.isDone('3d-printing', text)).toBe(true)

    // Toggling off clears it again.
    await userEvent.click(missionCheckbox(text))
    expect(missionCheckbox(text).checked).toBe(false)
    expect(missionProgressStore.isDone('3d-printing', text)).toBe(false)
  })
})

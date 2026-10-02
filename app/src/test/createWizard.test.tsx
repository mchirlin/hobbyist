import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateHobbyWizard } from '../components/CreateHobbyWizard'
import type { HobbyDraft } from '../data/draftHobby'

// Integration: the AI create wizard — name a hobby, draft every facet, review,
// and commit. Proves the two-step flow and that commit hands up a COMPLETE,
// engine-safe draft (all facets present, including the community link).
describe('CreateHobbyWizard', () => {
  it('drafts all facets from a name and commits them', async () => {
    const onCommit = vi.fn<(d: HobbyDraft) => void>()
    const onCancel = vi.fn()
    render(<CreateHobbyWizard onCommit={onCommit} onCancel={onCancel} existing={[]} />)

    // Step 1: name it, then draft.
    await userEvent.type(screen.getByLabelText('Hobby name'), 'Pottery')
    await userEvent.click(screen.getByRole('button', { name: /draft it for me/i }))

    // Step 2: review surface shows the drafted facets as editable fields.
    expect(screen.getByText(/Description/)).toBeInTheDocument()
    expect(screen.getByText(/Level ladder/)).toBeInTheDocument()
    expect(screen.getByText(/Missions/)).toBeInTheDocument()
    expect(screen.getByText(/Quests/)).toBeInTheDocument()
    expect(screen.getByText(/Milestone badges/)).toBeInTheDocument()
    expect(screen.getByText(/Links & communities/)).toBeInTheDocument()

    // Badge art step: the local-generator command, pre-filled for this hobby.
    expect(screen.getByText(/Badge art/)).toBeInTheDocument()
    expect(screen.getByText(/generate\.mjs/).textContent).toContain(
      'node scripts/badge-gen/generate.mjs "Pottery"',
    )

    // Commit.
    await userEvent.click(screen.getByRole('button', { name: /create this hobby/i }))

    expect(onCommit).toHaveBeenCalledTimes(1)
    const draft = onCommit.mock.calls[0][0]
    expect(draft.name).toBe('Pottery')
    expect(draft.levels.length).toBeGreaterThan(0)
    expect(draft.missions.length).toBeGreaterThan(0)
    expect(draft.quests.length).toBe(3)
    expect(draft.badges.length).toBeGreaterThan(0)
    expect(draft.resources?.some((r) => r.kind === 'community')).toBe(true)
  })

  it('blocks a duplicate name and never drafts it', async () => {
    const onCommit = vi.fn()
    render(
      <CreateHobbyWizard onCommit={onCommit} onCancel={vi.fn()} existing={['pottery']} />,
    )
    await userEvent.type(screen.getByLabelText('Hobby name'), 'Pottery')
    expect(screen.getByText(/You already have/)).toBeInTheDocument()
    const draftBtn = screen.getByRole('button', { name: /draft it for me/i })
    expect(draftBtn).toBeDisabled()
  })
})

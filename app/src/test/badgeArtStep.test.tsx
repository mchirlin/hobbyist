import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { badgeSubjectFor, BADGE_SUBJECTS } from '../data/badgeSubjects'
import { BadgeArtStep } from '../components/BadgeArtStep'

describe('badgeSubjectFor', () => {
  it('returns the curated phrase for a known hobby, flagged curated', () => {
    const r = badgeSubjectFor('Birding')
    expect(r.isCurated).toBe(true)
    expect(r.subject).toBe(BADGE_SUBJECTS.Birding)
  })

  it('returns a literal fallback for an unknown hobby, flagged not-curated', () => {
    const r = badgeSubjectFor('Lockpicking')
    expect(r.isCurated).toBe(false)
    expect(r.subject).toContain('Lockpicking')
  })
})

describe('BadgeArtStep', () => {
  it('renders a ready-to-run generate command with the name and subject quoted', () => {
    render(<BadgeArtStep name="Pottery" subject="a glazed clay pot on a wheel" />)
    const cmd = screen.getByText(/generate\.mjs/).textContent ?? ''
    expect(cmd).toContain('node scripts/badge-gen/generate.mjs "Pottery"')
    expect(cmd).toContain('--subject "a glazed clay pot on a wheel"')
  })

  it('warns when the hobby has no curated art subject', () => {
    render(<BadgeArtStep name="Lockpicking" />)
    expect(screen.getByText(/No curated art subject/)).toBeInTheDocument()
  })

  it('does not warn for a curated hobby', () => {
    render(<BadgeArtStep name="Birding" />)
    expect(screen.queryByText(/No curated art subject/)).not.toBeInTheDocument()
  })

  it('updates the command and reports edits when the subject is changed', async () => {
    const edits: string[] = []
    render(<BadgeArtStep name="Pottery" subject="a pot" onSubjectChange={(s) => edits.push(s)} />)
    const input = screen.getByLabelText('Badge art subject')
    await userEvent.clear(input)
    await userEvent.type(input, 'X')
    expect(edits[edits.length - 1]).toBe('X')
    expect(screen.getByText(/generate\.mjs/).textContent).toContain('--subject "X"')
  })
})

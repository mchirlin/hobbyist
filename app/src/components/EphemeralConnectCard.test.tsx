import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EphemeralConnectCard } from './EphemeralConnectCard'
import type { Connector } from '../integrations/registry'
import { parseEbirdCsv, ebirdCsvToActivity } from '../integrations/ebirdCsv'

const connector: Connector<string> = {
  id: 'ebird-ephemeral',
  name: 'eBird — one-shot login sync',
  hobby: 'Birding',
  level: 'ephemeral',
  connect: { kind: 'credentials' },
  status: 'live',
  signal: 'test',
  normalize: (csv: string) => ebirdCsvToActivity(parseEbirdCsv(csv)),
}

describe('EphemeralConnectCard (no-store lifecycle)', () => {
  it('emits activity on sync and clears the credentials after', async () => {
    const onActivity = vi.fn()
    render(<EphemeralConnectCard connector={connector} onActivity={onActivity} />)

    const user = screen.getByLabelText(/username/i) as HTMLInputElement
    const pass = screen.getByLabelText(/password/i) as HTMLInputElement

    await userEvent.type(user, 'demo-birder')
    await userEvent.type(pass, 'hunter2-demo')
    expect(user.value).toBe('demo-birder')
    expect(pass.value).toBe('hunter2-demo')

    await userEvent.click(screen.getByRole('button', { name: /sync/i }))

    await waitFor(() => expect(onActivity).toHaveBeenCalledTimes(1))
    const activity = onActivity.mock.calls[0][0]
    expect(activity.hobby).toBe('Birding')
    expect(activity.activityCount).toBe(6) // 7 rows, Gull sp. excluded

    // The whole point: credentials are gone from the inputs after the sync.
    expect(user.value).toBe('')
    expect(pass.value).toBe('')
    await screen.findByText(/credentials discarded/i)
    cleanup()
  })

  it('reports an error and emits nothing on missing credentials', async () => {
    const onActivity = vi.fn()
    render(<EphemeralConnectCard connector={connector} onActivity={onActivity} />)
    // Submit with empty fields.
    await userEvent.click(screen.getByRole('button', { name: /sync/i }))
    await screen.findByText(/missing credentials/i)
    expect(onActivity).not.toHaveBeenCalled()
    cleanup()
  })
})

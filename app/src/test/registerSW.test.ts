import { describe, it, expect, vi, afterEach } from 'vitest'
import { registerServiceWorker } from '../registerSW'

/**
 * In the test environment `import.meta.env.PROD` is false, so the guard must
 * short-circuit and never touch navigator.serviceWorker. (The production
 * registration path is exercised by the real build + browser, not here —
 * jsdom has no service worker.) These tests lock the "never break the app"
 * contract: the function is safe to call in dev and with no SW support.
 */
describe('registerServiceWorker', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not register in a non-production (dev/test) environment', () => {
    const register = vi.fn()
    // @ts-expect-error — minimal shim
    globalThis.navigator = { serviceWorker: { register } }
    const addEventListener = vi.spyOn(window, 'addEventListener')

    registerServiceWorker()

    // PROD is false in tests → it returns before touching anything.
    expect(register).not.toHaveBeenCalled()
    expect(addEventListener).not.toHaveBeenCalledWith('load', expect.anything())
  })

  it('is a no-op (never throws) when service workers are unsupported', () => {
    // @ts-expect-error — simulate a browser with no serviceWorker
    globalThis.navigator = {}
    expect(() => registerServiceWorker()).not.toThrow()
  })
})

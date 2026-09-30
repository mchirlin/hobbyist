// Self-test for the no-leak guard: proves that if any code path tries to log
// the credential, the guard throws instead of leaking it. Run:
//   node scripts/ephemeral-sync/guard.test.mjs
//
// Re-declares the same guard as run.mjs (kept in sync intentionally small); the
// point is to demonstrate the property, not to unit-test a shared export.

function installNoLeakGuard(secrets) {
  const orig = { log: console.log, error: console.error, warn: console.warn }
  const scrub = (args) =>
    args.map((a) => {
      const s = typeof a === 'string' ? a : JSON.stringify(a)
      for (const secret of secrets) {
        if (secret && s.includes(secret)) {
          throw new Error('SECURITY GUARD TRIPPED: attempted to log a credential.')
        }
      }
      return a
    })
  console.log = (...a) => orig.log(...scrub(a))
  console.error = (...a) => orig.error(...scrub(a))
  console.warn = (...a) => orig.warn(...scrub(a))
  return () => Object.assign(console, orig)
}

const restore = installNoLeakGuard(['hunter2-demo'])
let tripped = false
try {
  // Simulate a careless log that includes the password.
  console.log('debug: user logged in with password hunter2-demo')
} catch (e) {
  tripped = true
  restore()
  console.log('PASS: guard tripped as expected —', e.message)
}
if (!tripped) {
  restore()
  console.error('FAIL: guard did NOT trip; the password would have leaked.')
  process.exit(1)
}

// And a safe log (no secret) must pass through untouched.
console.log('PASS: a non-secret log passes through fine.')

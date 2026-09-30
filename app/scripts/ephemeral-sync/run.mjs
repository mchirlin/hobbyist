// ============================================================================
// Ephemeral login-then-automate runner  (prototype)
// ============================================================================
//
// Demonstrates the credential model Michael proposed for no-API, login-gated
// sources: the user supplies credentials for ONE run, the automation uses them
// in memory only, and they are DISCARDED — never persisted, never logged. To
// sync again, the user re-enters them. This is spectrum level 4, done the
// safe(r) way: no credential-at-rest.
//
// SCOPE / HONESTY:
//   • This runs against a LOCAL MOCK site (scripts/ephemeral-sync/mock-site),
//     not real eBird. Real eBird would trip 2FA / CAPTCHA / ToS and cannot be
//     automated honestly from here — the mock lets the *model* be demonstrated
//     and verified end-to-end.
//   • "Never touches disk/logs" is ARCHITECTED here (see the guards below), but
//     production hardening (memory scrubbing guarantees, running client-side so
//     the credential never leaves the user's device) is beyond a prototype.
//     The most important property — no credential-at-rest — is real here.
//
// CREDENTIAL LIFECYCLE (the whole point):
//   1. Credentials arrive ONLY via argv/env for this single invocation.
//   2. They live in local variables, passed straight into the browser form.
//   3. They are NEVER written to a file, and NEVER logged (see assertNoLog).
//   4. After the run they are overwritten and dropped; the process exits.
//
// Usage:
//   MOCKBIRD_USER=demo-birder MOCKBIRD_PASS=hunter2-demo \
//     node scripts/ephemeral-sync/run.mjs
//
// ============================================================================

import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOCK_URL = pathToFileURL(path.join(__dirname, 'mock-site', 'index.html')).href

// --- Guard: make "we never log the password" enforceable, not a promise. -----
// We wrap console so that if any code path ever tries to print the secret, the
// run fails loudly instead of leaking it. This is the kind of discipline a real
// no-store implementation needs.
function installNoLeakGuard(secrets) {
  const orig = { log: console.log, error: console.error, warn: console.warn }
  const scrub = (args) =>
    args.map((a) => {
      let s = typeof a === 'string' ? a : safeString(a)
      for (const secret of secrets) {
        if (secret && s.includes(secret)) {
          throw new Error(
            'SECURITY GUARD TRIPPED: attempted to log a credential. Aborting.',
          )
        }
      }
      return a
    })
  console.log = (...a) => orig.log(...scrub(a))
  console.error = (...a) => orig.error(...scrub(a))
  console.warn = (...a) => orig.warn(...scrub(a))
  return () => Object.assign(console, orig)
}

function safeString(v) {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// Progress goes to STDERR (through the guarded console, so it's still
// credential-scrubbed) so that STDOUT carries ONLY the harvested CSV payload —
// a clean pipe for the adapter step.
function progress(msg) {
  console.error(msg)
}

// Overwrite a string's backing where we can, then drop the reference. JS can't
// truly zero an immutable string, but we can stop holding it — the honest limit
// of memory scrubbing in a prototype, called out explicitly.
function forget(obj, keys) {
  for (const k of keys) obj[k] = '\0'.repeat(32)
  for (const k of keys) delete obj[k]
}

async function run() {
  // 1. Credentials for THIS run only. Never read from a stored file.
  const creds = {
    username: process.env.MOCKBIRD_USER ?? '',
    password: process.env.MOCKBIRD_PASS ?? '',
  }
  if (!creds.username || !creds.password) {
    console.error(
      'Provide credentials for this one run:\n' +
        '  MOCKBIRD_USER=demo-birder MOCKBIRD_PASS=hunter2-demo node scripts/ephemeral-sync/run.mjs',
    )
    process.exit(2)
  }

  const restoreConsole = installNoLeakGuard([creds.password])
  let csv = ''

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'], // same fix that unblocked Chromium on this host
  })
  try {
    const page = await browser.newPage()
    progress(`[ephemeral-sync] opening login page…`)
    await page.goto(MOCK_URL)

    // 2. Fill the login form with the in-memory credentials.
    progress(`[ephemeral-sync] signing in as "${creds.username}"…`)
    await page.fill('#username', creds.username)
    await page.fill('#password', creds.password)
    await page.click('#login-btn')

    // A real site may now present 2FA/CAPTCHA. Because the user is PRESENT and
    // initiated this, that's handleable (they'd enter the code) — unlike silent
    // background automation. Here the mock logs straight in.
    const err = await page.textContent('#login-err')
    if (err && err.trim()) {
      throw new Error(`Login failed: ${err.trim()}`)
    }
    await page.waitForSelector('#dashboard-view:not(.hidden)', { timeout: 5000 })
    progress(`[ephemeral-sync] authenticated. Triggering export…`)

    // 3. Drive the export and capture the data.
    await page.click('#download-btn')
    await page.waitForSelector('[data-export-ready="true"]', { timeout: 5000 })
    csv = (await page.textContent('#export-status')) ?? ''
    progress(`[ephemeral-sync] export captured (${csv.split('\n').length} rows).`)
  } finally {
    await browser.close()
    // 4. Discard credentials. To sync again the user must re-enter them.
    forget(creds, ['username', 'password'])
    restoreConsole()
  }

  return csv
}

run()
  .then((csv) => {
    // Hand the captured CSV to STDOUT so the adapter step can consume it.
    // (Only the harvested public data leaves this process — never the creds.)
    process.stdout.write(csv)
    process.exit(0)
  })
  .catch((e) => {
    console.error(`[ephemeral-sync] error: ${e.message}`)
    process.exit(1)
  })

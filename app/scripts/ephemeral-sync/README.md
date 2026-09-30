# Ephemeral login-then-automate — prototype

Demonstrates the credential model for **no-API, login-gated sources**: the user
supplies credentials for **one run**, the automation uses them **in memory
only**, and they are **discarded**. To sync again, the user re-enters them.
This is connector-automation **spectrum level 4**, done the safe(r) way — no
credential-at-rest.

## Why this model

The biggest liability of the old Plaid-style approach was *storing* the user's
password. This model removes that: if the server is breached, there is no
reusable credential to steal. The tradeoff is honest — it is **assisted sync,
not set-and-forget**: re-entry is required each time.

## What's here

| File | Role |
|---|---|
| `run.mjs` | The ephemeral runner. Takes creds via env for one run, drives a headless browser to log in + export, prints the captured CSV to **stdout**, discards the creds. |
| `mock-site/index.html` | A **local mock** "eBird-like" login → export page. Stands in for real eBird so the flow is demonstrable end-to-end without 2FA / CAPTCHA / ToS problems. |
| `demo-e2e.mjs` | Runs `run.mjs`, then feeds its output through the **real** `src/integrations/ebirdCsv.ts` adapter → normalized `HobbyActivity`. Proves automation is just another source feeding the one activity model. |
| `guard.test.mjs` | Self-test proving the no-leak guard aborts if any code tries to log the credential. |

## Run it

```bash
cd app

# One-shot automated login + export against the mock, captured CSV → stdout:
MOCKBIRD_USER=demo-birder MOCKBIRD_PASS=hunter2-demo \
  node scripts/ephemeral-sync/run.mjs

# Full pipeline: automation → the real adapter → normalized activity:
node scripts/ephemeral-sync/demo-e2e.mjs

# Prove the no-leak guard:
node scripts/ephemeral-sync/guard.test.mjs
```

Expected: 7 observation rows → the non-species `Gull sp.` excluded → **6
distinct species**, `lastActive` 2026-07-04, level 1 (Apprentice).

## Credential lifecycle (the whole point)

1. Credentials arrive **only** via env for this single invocation — never read
   from a stored file.
2. They live in local variables, passed straight into the browser form.
3. They are **never written to disk** and **never logged** — a `console`
   wrapper (`installNoLeakGuard`) throws if any code path tries to print the
   secret, so "we don't log it" is enforced, not merely promised.
4. After the run they are overwritten and dropped; the process exits.
5. Only the **harvested public data** (the CSV) leaves the process (stdout).

## Honest limits (prototype vs. production)

- **Runs against a mock, not real eBird.** Real eBird would trip 2FA/CAPTCHA and
  violate its ToS for automated login. The mock lets the *model* be verified.
  For eBird specifically, **email-ingest of the sanctioned "Download My Data"
  export is still the better path** — no login, no ToS issue. This ephemeral
  model is for sources that have **no API and no email export** but a login.
- **"Never touches disk/logs" is architected here**, but true zero-exposure
  needs the automation to run **client-side** (a browser extension or local
  app) so the credential never leaves the user's device. Running it on a server
  means the password briefly lives on your infra during the run — a compromised
  server *during* a run could capture it.
- **JS can't truly zero an immutable string in memory.** `forget()` drops the
  reference; it can't guarantee the bytes are gone. Called out in the code.
- **Login flows are the most brittle, most-defended part of any site** — this
  path breaks whenever the form/2FA/anti-bot changes. It is a last resort, below
  API and email-ingest.

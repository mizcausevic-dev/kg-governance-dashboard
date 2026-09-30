# Release review — 2026-09-29

**Status: BLOCKED for production deployment.** The public site served a
synthetic demo with `__AUDIT_STREAM_URL__` in `/config.js` when reviewed. The
last deploy workflow for main SHA `1136a474` failed with FTPS `530 Login
incorrect` ([run 31003154311](https://github.com/mizcausevic-dev/kg-governance-dashboard/actions/runs/31003154311)).
No deployment was performed in this review.

## Findings and scoped fixes

- Corrected the live contract to upstream `GET /stream` and its named SSE
  frames. The previous `/events/stream` URL plus `onmessage` listener could
  not receive events from [audit-stream-py](https://github.com/mizcausevic-dev/audit-stream-py/blob/main/src/audit_stream/app.py).
  Connected-mode producer cards now show observed sources/kinds instead of
  assuming demo catalog entries are deployed. The default attestation rule
  now recognizes upstream `attestation_tampered`.
- Rejects malformed history, SSE, and `/verify` responses; rejects insecure or
  credential-bearing remote URLs. Merges backfill with SSE by event ID to avoid
  losing new arrivals. The UI now distinguishes demo, connecting, disconnected,
  and live states.
- Replaced unsupported chain-integrity and NIST compliance claims with limits
  and a few [official NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
  review topics. A server-side hash walk does not prove log completeness or
  resist a privileged rewrite without an independent checkpoint.
- Restored mobile navigation, keyboard focus and Escape behavior in the Signals
  drawer, visible focus, and reduced-motion support. Fonts are served locally.
- Changed deployment to a manual main-only workflow with lint, typecheck,
  tests, production dependency audit, and build before FTPS. Removed blind
  retry and verbose FTP logs. The workflow was only linted locally, not run.
- Updated development tooling to versions with no findings in the npm audit
  run. The five direct production dependency versions are unchanged. The lock
  changed from 300 to 229 package entries, with 25 installed-version changes
  outside the root package, all marked development-only in old/new locks.

## Checks run

- `npm ci --cache .npm-cache`: exit 0; 228 packages installed, zero
  vulnerabilities reported. The temporary repo-local cache was removed after
  verification. Initial sandboxed attempts failed on Windows cache access and
  restricted network; the successful install used approved network access.
- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 30/30 tests across six files.
- `npm run build`: exit 0; 729.41 kB JS (221.32 kB gzip), with Vite's
  >500 kB chunk warning.
- `npm audit --audit-level=moderate`: exit 0; zero vulnerabilities reported.
- `actionlint -color=false` and `git diff --check`: exit 0 each.
- `gitleaks dir .`, `gitleaks dir dist`, and `gitleaks git .` with redaction:
  exit 0, no findings reported. History scan used process-local
  `safe.directory`; scans do not prove the absence of secrets.
- Local production preview in the in-app browser: at 390 px, all four nav
  controls were visible and page scroll width was 381 px; at 768 and 1440 px,
  no page overflow was measured. Signals drawer focus/Escape behavior was
  observed. Browser error log was empty. No real audit-stream endpoint or
  production browser flow was verified.

## Release gates and rollback

Verify FTPS account, target path, and a successful manual deployment run.
Before connecting a public site to real events, establish backend authorization,
redaction, retention, CORS, and an independent chain checkpoint. The upstream
app exposes read endpoints without authentication in its application code;
any protecting gateway was not verified. Candidate CI and CodeQL must run on
the reviewed commit; current repository rules do not require either check or
PR review. No production release or rollback was exercised. Revert the review
commit to undo these repository-only changes.

Useful next enrichment: code splitting to reduce the initial JS bundle,
contract tests against a deployed audit-stream instance, external chain
anchoring, and explicit accessibility checks across representative browsers.

## Technical unblock wave (same date)

- Configured live URLs now require an HTTPS same-origin read gateway; HTTP
  cross-origin loopback is allowed only when the dashboard itself runs on
  loopback. A rejected non-placeholder URL shows **CONFIG ERROR** with zero
  events and no demo producer catalog or synthetic log label. HTTP failures
  from a configured gateway show a visible error. Read requests use
  same-origin credentials and request no caching. These client checks cannot
  authenticate or redact the upstream stream.
- The manual deploy workflow is explicitly a synthetic-demo path. It checks
  built `dist/config.js` and the public site's current `/config.js` before FTP
  and refuses to overwrite a site configured for a live feed. The built and
  current public config each passed that preflight locally. The CI and deploy
  checkout/setup actions and FTPS action are pinned to immutable SHAs, and
  checkout credentials are not persisted. The workflow has
  **not** run; the prior FTPS `530 Login incorrect` remains unresolved.
- Executed `npm run lint` (exit 0), `npm run typecheck` (exit 0), `npm test`
  (exit 0: 33 Vitest plus 2 Node tests), `npm run build` (exit 0: 731.03 kB
  JavaScript, 221.89 kB gzip, with the >500 kB chunk warning),
  `npm audit --audit-level=high` (exit 0, zero vulnerabilities), and
  `actionlint -color=false` (exit 0). Headless Chrome via CDP at 390 and
  1440 CSS pixels showed no document/root horizontal overflow and all four
  navigation labels in demo and invalid modes, with expected status and zero
  console errors. A same-origin `/audit-stream` config showed an error banner,
  zero events, and no overflow; the local Vite server returned expected 404s
  because no gateway was installed, so that was not a live-stream pass.
- Production connection remains blocked until an authenticated, authorized,
  redacted same-origin read gateway is built and verified against a permitted
  audit stream. The app source of `audit-stream-py` exposes read endpoints
  without authentication; no gateway, real event authorization, client-data
  handling, external chain checkpoint, or production rollback was verified.

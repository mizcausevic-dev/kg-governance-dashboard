# kg-governance-dashboard

> Live procurement-reviewer-grade dashboard for the Kinetic Gain audit-stream
> spine. Reads the same hash-chained governance log every other suite repo
> writes to.

[![CI](https://github.com/mizcausevic-dev/kg-governance-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/kg-governance-dashboard/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**Live at:** [governance.kineticgain.com](https://governance.kineticgain.com)

## What it shows

A procurement reviewer / CISO / district CIO opens one tab and can answer
five questions about a deployed AI system without leaving the page:

1. **Is anything happening?** — flowing live timeline of every governance
   event the stack emits, color-coded by severity, with relative timestamps
   that update in place.
2. **Which producer is doing what?** — per-producer cards with rolling
   counters, per-event-kind tallies, and the most recent kind for each.
3. **Is the chain intact?** — one-click `GET /verify` that walks the
   audit-stream chain end-to-end and reports whether anyone has tampered
   with the log.
4. **What compliance framework cares about this?** — every event kind
   carries its [NIST AI RMF crosswalk](https://suite.kineticgain.com/docs/nist-rmf-crosswalk.md)
   citation right in the timeline (MAP 2.2, MEASURE 2.5, MANAGE 1.2, etc.).
5. **What's the story for vendor X?** — paste a domain into the vendor
   filter and everything narrows to events whose payload mentions that
   vendor.

## Architecture

```
audit-stream-py     --SSE-->     kg-governance-dashboard
   /events/stream                  React 19 SPA
                                   (deployed as static HTML/JS to a CDN)
```

Pure SPA. Zero backend. Three runtime data sources:

- `GET {AUDIT_STREAM_URL}/events?limit=50` — initial backfill on cold load.
- `GET {AUDIT_STREAM_URL}/events/stream` — long-lived SSE for the live tail.
  Browser auto-reconnects on drop; the UI shows the connection state.
- `GET {AUDIT_STREAM_URL}/verify` — on demand, when the user clicks the
  "Verify the chain" button.

When `AUDIT_STREAM_URL` is unset the dashboard runs against a built-in
**demo stream** that synthesises realistic events at ~1.5/sec across all
nine known producer kinds. Visitors see a working dashboard even when
there's no real backend pointing at it yet.

## Config

The audit-stream URL is loaded at **runtime** from `/config.js` so you
can repoint a deployed dashboard at a different backend without
rebuilding:

```js
// public/config.js
window.__KG_GOVERNANCE_CONFIG__ = {
  AUDIT_STREAM_URL: "https://audit-stream.your-domain.com",
};
```

Leave `AUDIT_STREAM_URL` as the placeholder `__AUDIT_STREAM_URL__` to
stay in demo mode.

CORS: your `audit-stream-py` instance must allow the dashboard's
origin. The relevant CORS headers for `/events`, `/events/stream`, and
`/verify` are `Access-Control-Allow-Origin: https://governance.kineticgain.com`
(or `*` for the demo).

## Producers in scope

Nine producers across two language ecosystems, 21 event kinds total.
Every one of these emits to the same `audit-stream-py` endpoint with
the same `{kind, source, payload}` envelope:

| Producer | Lang | Event kinds |
|---|---|---|
| `procurement-decision-api` | Python | `decision_card_drafted` |
| `aeo-validator-service` | Python | `watch_created`, `watch_drifted`, `watch_validity_flipped` |
| `policy-as-code-engine` | Python | `policy_bundle_registered`, `request_allowed`, `request_denied` |
| `data-contract-registry` | Python | `contract_promoted`, `contract_deprecated`, `contract_compatibility_failed` |
| `slo-budget-tracker` | Python | `slo_burn_started`, `slo_recovered` |
| `hash-attestation` | Rust | `attestation_signed`, `attestation_verified`, `attestation_failed` |
| `incident-correlation` | Rust | `incident_correlated`, `incident_correlation_failed` |
| `aeo-graph-explorer` | Rust | `graph_ingested`, `graph_ingest_failed` |
| `reliability-toolkit` | Rust | `breaker_opened`, `breaker_recovered` |

## Develop locally

```bash
npm install
npm run dev       # vite dev server on http://localhost:5173
npm run test      # vitest run
npm run lint      # eslint (max-warnings 0)
npm run typecheck # tsc --noEmit
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Deploy

The repo ships with two GitHub Actions workflows:

- `.github/workflows/ci.yml` — runs lint + typecheck + test + build on
  every push, matrix on Node 20 + 22.
- `.github/workflows/deploy.yml` — builds + FTPs `dist/` to `/governance/`
  on every push to `main`. Configure repo secrets `FTP_HOST`, `FTP_USER`,
  `FTP_PASS`.

Same pattern as the other `*.kineticgain.com` properties.

## Composes with

- [audit-stream-py](https://github.com/mizcausevic-dev/audit-stream-py) — the upstream this dashboard subscribes to.
- [audit-stream-prometheus](https://github.com/mizcausevic-dev/audit-stream-prometheus) — the sibling consumer that re-exposes the same events as Prometheus counters. This dashboard is the *human-facing* read-side; audit-stream-prometheus is the *machine-facing* one.
- All 9 producers above — every one writes to `audit-stream-py` using the same opt-in `AUDIT_STREAM_URL` contract.

## License

Apache-2.0. See [LICENSE](LICENSE).

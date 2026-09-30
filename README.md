# kg-governance-dashboard

> A governance-event dashboard for evaluating an audit-stream integration.
> The public site currently runs a clearly labeled synthetic demo.

[![CI](https://github.com/mizcausevic-dev/kg-governance-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/kg-governance-dashboard/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**Public demo:** [governance.kineticgain.com](https://governance.kineticgain.com).
Its `/config.js` still had the `__AUDIT_STREAM_URL__` placeholder when checked
on 2026-09-29; no production audit-stream feed was verified.

## What it shows

A reviewer can explore these questions in the synthetic demo. With an
approved stream configured, the same interface can display that stream's
events; completeness and provenance must be assessed separately:

1. **Is anything happening?** — timeline of received governance events,
   color-coded by severity, with relative timestamps
   that update in place.
2. **What's the trend?** — `Overview` tab shows KPI cards plus a 24-hour
   events-per-hour stacked area chart and a top-10 event-kind distribution
   bar chart, all derived from the currently displayed event stream.
3. **Which producer is doing what?** — `Producers` tab renders one large
   card per producer in the spine, with mini bar charts per event kind +
   last-seen highlight, color-coded by language ecosystem.
4. **Is the stored chain internally consistent?** — one-click `GET /verify`
   asks the configured server to check its current log. This does not prove
   completeness or protect against a privileged rewrite without an external
   checkpoint or witness. NIST AI RMF mapping aids appear inline.
5. **Signal while this tab is open.** — in-browser configurable alert rules
   (stored in localStorage, no auth, no backend) fire either by *match*
   (any event with kind/source matching a regex) or by *threshold*
   (N matching events within a rolling window). Hits surface as a
   pulsing bell badge in the header; optionally a desktop notification
   (one-click permission grant).
6. **What's the story for vendor X?** — paste a domain into the vendor
   filter on the Audit Trail tab and everything narrows to events whose
   payload mentions that vendor.

Selected event kinds have suggested review topics linked to the
[official NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/).
Uncertain kinds are deliberately unmapped. These are prompts for review, not
conformance findings or proof that a control operates.

## Architecture

```
audit-stream-py  <-- private read path --  authenticated, redacted gateway
                                            | same-origin /audit-stream/*
                                            v
                                  kg-governance-dashboard
                                  React 19 static SPA
```

Pure SPA with no dashboard backend. A connected deployment needs a same-origin
gateway that authorizes each viewer and redacts data before returning these
three read surfaces:

- `GET {AUDIT_STREAM_URL}/events?limit=50` — initial backfill on cold load.
- `GET {AUDIT_STREAM_URL}/stream` — long-lived SSE for the live tail.
Browser reconnects on drop; the UI shows the connection state.
- `GET {AUDIT_STREAM_URL}/verify` — on demand, when the user clicks the
  "Verify the chain" button.

`audit-stream-py` sends named SSE events (`event: <kind>`). The client listens
for the server's current event-kind vocabulary as well as unnamed messages;
an upstream kind addition needs a client update before it appears in the live
tail. Some synthetic demo kinds are not accepted by the current upstream
server. See its [wire model](https://github.com/mizcausevic-dev/audit-stream-py/blob/main/src/audit_stream/models.py)
and [SSE endpoint](https://github.com/mizcausevic-dev/audit-stream-py/blob/main/src/audit_stream/app.py).

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
  AUDIT_STREAM_URL: "/audit-stream",
};
```

Leave `AUDIT_STREAM_URL` as the placeholder `__AUDIT_STREAM_URL__` to stay
in synthetic demo mode. A configured value must be a root-relative path or an
absolute same-origin HTTPS URL. Cross-origin HTTP loopback is accepted only
when the dashboard itself runs on loopback for local development. Userinfo,
query parameters, fragments, and bare relative paths are rejected. A rejected
configured value shows **CONFIG ERROR** with no synthetic events; it cannot
silently appear to be a healthy demo or live feed.

The gateway must protect `GET /events`, `GET /stream`, and `GET /verify` with
viewer authentication and authorization; enforce read-only routing (do not
expose upstream `POST /events`); redact or omit client, matter, privileged,
secret, and personal data before it reaches the browser; prevent sensitive
response caching; and define retention, rate limits, and timeouts. A browser
cannot keep an API secret. Same-origin requests can use a securely configured
session cookie; the SPA does not provide authentication. The upstream
`audit-stream-py` app does not itself authenticate its read endpoints in the
reviewed source. A gateway and its behavior have not been built or verified
here. CORS alone is not authorization. A separate chain checkpoint is still
needed for independent tamper evidence. Alert rules and up to 100 recent hit
summaries are stored in each browser's `localStorage`; users can clear hits in
the Signals drawer. No analytics are configured in this repo, and fonts are
served locally.

## Producers in scope

The synthetic demo has a catalog of nine producer names and 21 event kinds.
In connected mode, the Producers tab lists only source names and kinds observed
in received events; those names are not authenticated producer identities.
Catalog membership is not proof that a producer is currently deployed or
emitting. A compatible stream uses the
`{kind, source, payload}` envelope:

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

- `.github/workflows/ci.yml` — runs lint, typecheck, tests, build, and
  dependency audit on every push/PR, matrix on Node 22 + 24.
- `.github/workflows/deploy.yml` — manual dispatch from `main` only for the
  synthetic demo. It runs
  lint, typecheck, tests, a production dependency audit, and a build before
  attempting FTPS-sync of `dist/` to `/governance/`. Before FTP, it rejects
  a built non-demo config and refuses to overwrite a public site whose
  `/config.js` is not still the demo placeholder. A live deployment needs a
  separately reviewed path and gateway. Configure repo secrets
  `FTP_HOST`, `FTP_USER`, `FTP_PASS`, verify account access and path, and check
  the actual workflow and public site after any release. The observed main
  deploy run on 2026-08-05 failed with `530 Login incorrect` on both attempts;
  a passing local build does not establish deployment.

## Composes with

- [audit-stream-py](https://github.com/mizcausevic-dev/audit-stream-py) — the upstream this dashboard subscribes to.
- [audit-stream-prometheus](https://github.com/mizcausevic-dev/audit-stream-prometheus) — the sibling consumer that re-exposes the same events as Prometheus counters. This dashboard is the *human-facing* read-side; audit-stream-prometheus is the *machine-facing* one.
- All 9 producers above — every one writes to `audit-stream-py` using the same opt-in `AUDIT_STREAM_URL` contract.

## License

Apache-2.0. See [LICENSE](LICENSE).

/**
 * Wire types shared across the dashboard.
 *
 * Mirrors the `GovernanceEvent` envelope `audit-stream-py` emits:
 *
 *   {
 *     "event_id":   42,
 *     "timestamp":  "2026-05-15T03:14:15+00:00",
 *     "kind":       "watch_drifted",
 *     "source":     "aeo-validator-service",
 *     "payload":    { ... free-form },
 *     "prev_hash":  "9a3f...",
 *     "hash":       "b7d1..."
 *   }
 *
 * Live SSE events arrive WITHOUT `prev_hash` / `hash` set (the server
 * already chained them — clients just observe). REST history responses
 * include them.
 */
export interface GovernanceEvent {
  event_id: number;
  timestamp: string;
  kind: string;
  source: string;
  payload: Record<string, unknown>;
  prev_hash?: string;
  hash?: string;
}

/** Server `GET /verify` response shape. */
export interface ChainVerifyResult {
  valid: boolean;
  checked: number;
  first_break_at: number | null;
  reason: string | null;
}

/** Runtime config exposed by `/public/config.js`. */
export interface RuntimeConfig {
  AUDIT_STREAM_URL: string;
}

declare global {
  interface Window {
    __KG_GOVERNANCE_CONFIG__?: RuntimeConfig;
  }
}

/** Producer registry — one entry per known source. Cards render in this order. */
export interface Producer {
  source: string;
  display: string;
  language: "Python" | "Rust";
  shape: string;
  kinds: readonly string[];
}

export const PRODUCERS: readonly Producer[] = [
  {
    source: "procurement-decision-api",
    display: "procurement-decision-api",
    language: "Python",
    shape: "FastAPI service",
    kinds: ["decision_card_drafted"],
  },
  {
    source: "aeo-validator-service",
    display: "aeo-validator-service",
    language: "Python",
    shape: "FastAPI service",
    kinds: ["watch_created", "watch_drifted", "watch_validity_flipped"],
  },
  {
    source: "policy-as-code-engine",
    display: "policy-as-code-engine",
    language: "Python",
    shape: "FastAPI service",
    kinds: ["policy_bundle_registered", "request_allowed", "request_denied"],
  },
  {
    source: "data-contract-registry",
    display: "data-contract-registry",
    language: "Python",
    shape: "FastAPI service",
    kinds: ["contract_promoted", "contract_deprecated", "contract_compatibility_failed"],
  },
  {
    source: "slo-budget-tracker",
    display: "slo-budget-tracker",
    language: "Python",
    shape: "library",
    kinds: ["slo_burn_started", "slo_recovered"],
  },
  {
    source: "hash-attestation",
    display: "hash-attestation",
    language: "Rust",
    shape: "crypto library",
    kinds: ["attestation_signed", "attestation_verified", "attestation_failed"],
  },
  {
    source: "incident-correlation",
    display: "incident-correlation",
    language: "Rust",
    shape: "graph library",
    kinds: ["incident_correlated", "incident_correlation_failed"],
  },
  {
    source: "aeo-graph-explorer",
    display: "aeo-graph-explorer",
    language: "Rust",
    shape: "axum service",
    kinds: ["graph_ingested", "graph_ingest_failed"],
  },
  {
    source: "reliability-toolkit",
    display: "reliability-toolkit",
    language: "Rust",
    shape: "primitives library",
    kinds: ["breaker_opened", "breaker_recovered"],
  },
] as const;

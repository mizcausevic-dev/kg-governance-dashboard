/**
 * Synthetic event generator for demo mode.
 *
 * When `AUDIT_STREAM_URL` is unset, the dashboard runs against this
 * generator so visitors can see what it looks like before configuring
 * a real backend. The generator emits a believable trickle of events
 * — heavy on the high-volume kinds (`request_allowed`,
 * `request_denied`, `attestation_verified`), light on the rare ones
 * (`attestation_failed`, `breaker_opened`, `slo_burn_started`).
 *
 * Cadence: ~1.5 events / second, with bursts.
 */

import type { GovernanceEvent } from "./types";

interface KindWeight {
  kind: string;
  source: string;
  /** Higher = more likely. */
  weight: number;
  payloadBuilder: () => Record<string, unknown>;
}

const VENDOR_DOMAINS = [
  "acmetutor.example.com",
  "globalclinic.example.org",
  "k12data.example.net",
  "fintechco.example.io",
];

function randomVendor(): string {
  return VENDOR_DOMAINS[Math.floor(Math.random() * VENDOR_DOMAINS.length)]!;
}

const KINDS: KindWeight[] = [
  // High-volume request gating
  {
    kind: "request_allowed",
    source: "policy-as-code-engine",
    weight: 30,
    payloadBuilder: () => ({
      bundle_id: `pb-${1000 + Math.floor(Math.random() * 9000)}`,
      decision: "allow",
      matched_rule_id: "tier-pro-admin",
      reason: "subject.role=admin matches allow rule",
    }),
  },
  {
    kind: "request_denied",
    source: "policy-as-code-engine",
    weight: 8,
    payloadBuilder: () => ({
      bundle_id: `pb-${1000 + Math.floor(Math.random() * 9000)}`,
      decision: "deny",
      matched_rule_id: "deny-non-admin-writes",
      reason: "subject.role=viewer not allowed to write",
    }),
  },

  // Validator service
  {
    kind: "watch_created",
    source: "aeo-validator-service",
    weight: 2,
    payloadBuilder: () => ({
      watch_id: `w-${Math.floor(Math.random() * 10_000)}`,
      url: `https://${randomVendor()}/.well-known/aeo.json`,
      spec: "aeo",
      spec_version: "0.1",
      valid: true,
    }),
  },
  {
    kind: "watch_drifted",
    source: "aeo-validator-service",
    weight: 5,
    payloadBuilder: () => ({
      watch_id: `w-${Math.floor(Math.random() * 10_000)}`,
      url: `https://${randomVendor()}/.well-known/aeo.json`,
      spec: "aeo",
      spec_changed: false,
      added_fields: ["bias_audit_uri"],
      removed_fields: [],
    }),
  },
  {
    kind: "watch_validity_flipped",
    source: "aeo-validator-service",
    weight: 1,
    payloadBuilder: () => ({
      watch_id: `w-${Math.floor(Math.random() * 10_000)}`,
      url: `https://${randomVendor()}/.well-known/agent-card.json`,
      became_invalid: true,
      became_valid: false,
      spec: "agent-card",
      after_issues: 2,
    }),
  },

  // Procurement
  {
    kind: "decision_card_drafted",
    source: "procurement-decision-api",
    weight: 2,
    payloadBuilder: () => ({
      decision_id: `DEC-2026-${100 + Math.floor(Math.random() * 900)}`,
      buyer: "Springfield USD",
      subject_vendor: randomVendor(),
      rubric_status: "approved-with-conditions",
    }),
  },

  // Policy lifecycle
  {
    kind: "policy_bundle_registered",
    source: "policy-as-code-engine",
    weight: 2,
    payloadBuilder: () => ({
      bundle_id: `pb-${1000 + Math.floor(Math.random() * 9000)}`,
      policy_count: 1 + Math.floor(Math.random() * 3),
      source: `DEC-2026-${100 + Math.floor(Math.random() * 900)}`,
    }),
  },

  // Data contracts
  {
    kind: "contract_promoted",
    source: "data-contract-registry",
    weight: 1,
    payloadBuilder: () => ({
      dataset_id: "users.daily_active",
      version: `1.${Math.floor(Math.random() * 8)}.0`,
      mode: "backward",
      owners: ["growth-platform"],
    }),
  },
  {
    kind: "contract_compatibility_failed",
    source: "data-contract-registry",
    weight: 1,
    payloadBuilder: () => ({
      dataset_id: "users.daily_active",
      version: "2.0.0",
      mode: "backward",
      issue_count: 1,
      issues: [{ kind: "field_removed", field: "ltv" }],
    }),
  },

  // Attestation
  {
    kind: "attestation_signed",
    source: "hash-attestation",
    weight: 4,
    payloadBuilder: () => ({
      key_url: `https://${randomVendor()}/.well-known/aeo-key.pem`,
      signed_hash: "sha256:" + randomHex(64),
      signed_at: new Date().toISOString(),
    }),
  },
  {
    kind: "attestation_verified",
    source: "hash-attestation",
    weight: 8,
    payloadBuilder: () => ({
      key_url: `https://${randomVendor()}/.well-known/aeo-key.pem`,
      signed_hash: "sha256:" + randomHex(64),
      trusted_keys: 3,
    }),
  },
  {
    kind: "attestation_failed",
    source: "hash-attestation",
    weight: 1,
    payloadBuilder: () => ({
      key_url: `https://${randomVendor()}/.well-known/aeo-key.pem`,
      signed_hash: "sha256:" + randomHex(64),
      reason: "hash mismatch (body has been modified since signing)",
    }),
  },

  // Reliability
  {
    kind: "breaker_opened",
    source: "reliability-toolkit",
    weight: 1,
    payloadBuilder: () => ({
      name: pick(["downstream-billing", "downstream-search", "downstream-cache"]),
      previous_state: "closed",
      cause: "call",
    }),
  },
  {
    kind: "breaker_recovered",
    source: "reliability-toolkit",
    weight: 1,
    payloadBuilder: () => ({
      name: pick(["downstream-billing", "downstream-search", "downstream-cache"]),
      previous_state: "half_open",
      cause: "call",
    }),
  },

  // SLO
  {
    kind: "slo_burn_started",
    source: "slo-budget-tracker",
    weight: 1,
    payloadBuilder: () => ({
      slo_name: pick(["api-availability", "search-latency", "billing-success"]),
      window_seconds: 3600,
      burn_rate: 14.4 + Math.random() * 5,
      threshold: 14.4,
      success_ratio: 0.91 + Math.random() * 0.05,
      sample_count: 200 + Math.floor(Math.random() * 500),
    }),
  },
  {
    kind: "slo_recovered",
    source: "slo-budget-tracker",
    weight: 1,
    payloadBuilder: () => ({
      slo_name: "api-availability",
      window_seconds: 3600,
      threshold: 14.4,
    }),
  },

  // Graph + Incidents
  {
    kind: "graph_ingested",
    source: "aeo-graph-explorer",
    weight: 1,
    payloadBuilder: () => ({
      nodes: 100 + Math.floor(Math.random() * 200),
      edges: 200 + Math.floor(Math.random() * 600),
      input_bytes: 12_000 + Math.floor(Math.random() * 80_000),
    }),
  },
  {
    kind: "incident_correlated",
    source: "incident-correlation",
    weight: 1,
    payloadBuilder: () => ({
      incident_id: `INC-2026-${100 + Math.floor(Math.random() * 900)}`,
      severity: pick(["medium", "high", "critical"]),
      affected_documents: ["tool:lookup"],
      affected_node_count: 3 + Math.floor(Math.random() * 6),
      max_urgency: pick(["normal", "high", "critical"]),
      has_page: Math.random() > 0.5,
    }),
  },
];

const TOTAL_WEIGHT = KINDS.reduce((s, k) => s + k.weight, 0);

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function randomHex(n: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function pickWeighted(): KindWeight {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const k of KINDS) {
    r -= k.weight;
    if (r <= 0) return k;
  }
  return KINDS[0]!;
}

function buildEvent(eventId: number): GovernanceEvent {
  const choice = pickWeighted();
  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    kind: choice.kind,
    source: choice.source,
    payload: choice.payloadBuilder(),
  };
}

/** Synthesise a backfill of `count` historical events. */
export function seedHistory(count: number): GovernanceEvent[] {
  const out: GovernanceEvent[] = [];
  // Walk backwards in time, ~1 event every 1.2s on average.
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const ev = buildEvent(count - i);
    ev.timestamp = new Date(now - i * 1_200).toISOString();
    out.push(ev);
  }
  // Return chronological order (oldest first).
  return out.reverse();
}

export interface DemoSubscription {
  close(): void;
}

/**
 * Start emitting synthetic events. Returns a subscription you can
 * close on unmount. `nextEventId` is provided by the caller so demo
 * mode can pick up after a `seedHistory()` of size N.
 */
export function startDemoStream(
  nextEventId: number,
  onEvent: (ev: GovernanceEvent) => void,
): DemoSubscription {
  let id = nextEventId;
  let stopped = false;

  function scheduleNext() {
    if (stopped) return;
    // Random interval between 500ms and 2000ms — bursty enough to feel real.
    const delay = 500 + Math.random() * 1_500;
    setTimeout(() => {
      if (stopped) return;
      onEvent(buildEvent(id++));
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  return {
    close() {
      stopped = true;
    },
  };
}

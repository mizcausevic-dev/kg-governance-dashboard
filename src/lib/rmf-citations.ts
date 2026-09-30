/**
 * Suggested NIST AI RMF review topics for a few event kinds. This is a
 * deliberately narrow map: an event is not proof that an RMF outcome was met.
 * Topic descriptions were checked against the official AI RMF 1.0 Core on
 * 2026-09-29. Keep uncertain event kinds unmapped until reviewed.
 */
export const NIST_CORE_URL = "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/";

export interface RmfCitation {
  id: string;
  short: string;
}

export type EventSeverity = "ok" | "info" | "warn" | "error";

export interface EventCatalogEntry {
  kind: string;
  blurb: string;
  severity: EventSeverity;
  /** Review topics, not evidence of implementation or conformance. */
  rmf: readonly RmfCitation[];
}

const MONITORING: RmfCitation = {
  id: "MEASURE 2.4",
  short: "Production AI system behavior monitoring",
};
const INCIDENT_PRACTICES: RmfCitation = {
  id: "GOVERN 4.3",
  short: "Practices for testing and incident identification",
};
const SECURITY_RESILIENCE: RmfCitation = {
  id: "MEASURE 2.7",
  short: "Security and resilience evaluation",
};

export const EVENT_CATALOG: Record<string, EventCatalogEntry> = {
  decision_card_drafted: {
    kind: "decision_card_drafted",
    blurb: "A buyer drafted a Decision Card from a vendor's Suite documents.",
    severity: "info",
    rmf: [],
  },
  watch_created: {
    kind: "watch_created",
    blurb: "A document validation watch was created.",
    severity: "info",
    rmf: [],
  },
  watch_drifted: {
    kind: "watch_drifted",
    blurb: "A watched document changed since the last poll.",
    severity: "warn",
    rmf: [],
  },
  watch_validity_flipped: {
    kind: "watch_validity_flipped",
    blurb: "A watched document changed validity state.",
    severity: "error",
    rmf: [],
  },
  policy_bundle_registered: {
    kind: "policy_bundle_registered",
    blurb: "A runtime policy bundle was registered.",
    severity: "ok",
    rmf: [],
  },
  request_allowed: {
    kind: "request_allowed",
    blurb: "A request was evaluated and allowed by a policy bundle.",
    severity: "info",
    rmf: [MONITORING],
  },
  request_denied: {
    kind: "request_denied",
    blurb: "A request was evaluated and denied by a policy bundle.",
    severity: "warn",
    rmf: [MONITORING],
  },
  contract_promoted: {
    kind: "contract_promoted",
    blurb: "A data-contract version passed compatibility checks and was promoted.",
    severity: "ok",
    rmf: [],
  },
  contract_deprecated: {
    kind: "contract_deprecated",
    blurb: "A data-contract version was marked deprecated.",
    severity: "info",
    rmf: [],
  },
  contract_compatibility_failed: {
    kind: "contract_compatibility_failed",
    blurb: "A proposed data-contract version failed compatibility checks.",
    severity: "error",
    rmf: [],
  },
  slo_burn_started: {
    kind: "slo_burn_started",
    blurb: "An SLO burn-rate window crossed the alert threshold.",
    severity: "warn",
    rmf: [MONITORING],
  },
  slo_recovered: {
    kind: "slo_recovered",
    blurb: "An SLO burn-rate window cleared.",
    severity: "ok",
    rmf: [MONITORING],
  },
  attestation_signed: {
    kind: "attestation_signed",
    blurb: "An attestation was signed over a canonical document hash.",
    severity: "info",
    rmf: [],
  },
  attestation_verified: {
    kind: "attestation_verified",
    blurb: "An attestation signature was reported as verified.",
    severity: "ok",
    rmf: [],
  },
  attestation_failed: {
    kind: "attestation_failed",
    blurb: "An attestation verification failed; investigate the cause.",
    severity: "error",
    rmf: [SECURITY_RESILIENCE],
  },
  incident_correlated: {
    kind: "incident_correlated",
    blurb: "An incident was correlated with related records.",
    severity: "info",
    rmf: [INCIDENT_PRACTICES],
  },
  incident_correlation_failed: {
    kind: "incident_correlation_failed",
    blurb: "Incident correlation failed; review the source record or graph.",
    severity: "error",
    rmf: [INCIDENT_PRACTICES],
  },
  graph_ingested: {
    kind: "graph_ingested",
    blurb: "A graph crawl was ingested into the explorer.",
    severity: "ok",
    rmf: [],
  },
  graph_ingest_failed: {
    kind: "graph_ingest_failed",
    blurb: "A graph crawl failed ingestion checks.",
    severity: "error",
    rmf: [],
  },
  breaker_opened: {
    kind: "breaker_opened",
    blurb: "A circuit breaker opened after a downstream failure.",
    severity: "error",
    rmf: [MONITORING],
  },
  breaker_recovered: {
    kind: "breaker_recovered",
    blurb: "A circuit breaker recovered.",
    severity: "ok",
    rmf: [MONITORING],
  },
};

export function lookup(kind: string): EventCatalogEntry {
  return EVENT_CATALOG[kind] ?? {
    kind,
    blurb: "Uncatalogued event kind. Review the producer and payload before using it as evidence.",
    severity: "info",
    rmf: [],
  };
}

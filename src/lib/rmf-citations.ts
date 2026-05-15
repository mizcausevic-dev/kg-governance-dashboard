/**
 * NIST AI RMF crosswalk per event kind.
 *
 * The full Suite × NIST AI RMF crosswalk lives at
 * https://suite.kineticgain.com/docs/nist-rmf-crosswalk.md and maps the
 * 11 specs + the implementation tooling to specific subcategories.
 * This file is the *runtime* slice — for every event kind a Kinetic
 * Gain producer can emit, which RMF subcategory does that event
 * directly contribute evidence for?
 *
 * Use this to render "what compliance framework cares about this?"
 * next to each event in the timeline, so a procurement reviewer can
 * see governance ↔ RMF mapping at a glance.
 */

export interface RmfCitation {
  /** Subcategory id, e.g. "MEASURE 2.5". */
  id: string;
  /** Short human-readable description. */
  short: string;
}

/**
 * Severity hint for timeline accents. Operators care about *_failed,
 * *_denied, *_drifted; routine emissions are info.
 */
export type EventSeverity = "ok" | "info" | "warn" | "error";

export interface EventCatalogEntry {
  kind: string;
  /** One-line description shown in tooltips + the timeline. */
  blurb: string;
  severity: EventSeverity;
  rmf: readonly RmfCitation[];
}

/* prettier-ignore */
export const EVENT_CATALOG: Record<string, EventCatalogEntry> = {
  // procurement-decision-api
  decision_card_drafted: {
    kind: "decision_card_drafted",
    blurb: "A buyer drafted a Decision Card from a vendor's Suite documents.",
    severity: "info",
    rmf: [
      { id: "GOVERN 5.1", short: "Organizational policies + procedures" },
      { id: "MAP 3.1",     short: "AI risks + benefits cataloged" },
    ],
  },

  // aeo-validator-service
  watch_created: {
    kind: "watch_created",
    blurb: "A new always-on validation watch was installed for a Suite doc URL.",
    severity: "info",
    rmf: [
      { id: "MEASURE 2.7", short: "Operational measurement + monitoring" },
    ],
  },
  watch_drifted: {
    kind: "watch_drifted",
    blurb: "A watched Suite doc changed shape since the last poll.",
    severity: "warn",
    rmf: [
      { id: "MEASURE 2.7",  short: "Operational measurement + monitoring" },
      { id: "MEASURE 2.10", short: "Deviation from expected behavior tracked" },
    ],
  },
  watch_validity_flipped: {
    kind: "watch_validity_flipped",
    blurb: "A watched Suite doc went from valid → invalid (or back).",
    severity: "error",
    rmf: [
      { id: "MEASURE 2.7", short: "Operational measurement + monitoring" },
      { id: "MANAGE 2.2",  short: "Response to detected issues" },
    ],
  },

  // policy-as-code-engine
  policy_bundle_registered: {
    kind: "policy_bundle_registered",
    blurb: "A runtime policy bundle was deployed (often from a Decision Card).",
    severity: "ok",
    rmf: [
      { id: "GOVERN 5.1", short: "Organizational policies + procedures" },
    ],
  },
  request_allowed: {
    kind: "request_allowed",
    blurb: "A live request was evaluated and allowed by a policy bundle.",
    severity: "info",
    rmf: [
      { id: "MEASURE 2.5", short: "AI system operational measurement" },
    ],
  },
  request_denied: {
    kind: "request_denied",
    blurb: "A live request was evaluated and DENIED by a policy bundle.",
    severity: "warn",
    rmf: [
      { id: "MEASURE 2.5", short: "AI system operational measurement" },
      { id: "MANAGE 1.2",  short: "Risk response resourcing" },
    ],
  },

  // data-contract-registry
  contract_promoted: {
    kind: "contract_promoted",
    blurb: "A new data-contract version passed compatibility checks and was promoted.",
    severity: "ok",
    rmf: [
      { id: "GOVERN 4.1", short: "Org commits to AI lifecycle decisions" },
    ],
  },
  contract_deprecated: {
    kind: "contract_deprecated",
    blurb: "A data-contract version was marked deprecated.",
    severity: "info",
    rmf: [
      { id: "MANAGE 4.1", short: "Continuous improvement of risk responses" },
    ],
  },
  contract_compatibility_failed: {
    kind: "contract_compatibility_failed",
    blurb: "A proposed data-contract version was REJECTED for breaking compatibility.",
    severity: "error",
    rmf: [
      { id: "MANAGE 4.1", short: "Continuous improvement of risk responses" },
      { id: "MEASURE 2.7", short: "Operational measurement + monitoring" },
    ],
  },

  // slo-budget-tracker
  slo_burn_started: {
    kind: "slo_burn_started",
    blurb: "An SLO burn-rate window crossed the alert threshold.",
    severity: "warn",
    rmf: [
      { id: "MANAGE 1.2", short: "Risk response resourcing" },
      { id: "MEASURE 2.8", short: "Operational transparency" },
    ],
  },
  slo_recovered: {
    kind: "slo_recovered",
    blurb: "An SLO burn-rate window cleared.",
    severity: "ok",
    rmf: [
      { id: "MEASURE 2.8", short: "Operational transparency" },
    ],
  },

  // hash-attestation
  attestation_signed: {
    kind: "attestation_signed",
    blurb: "An ed25519 attestation was minted over a Suite doc canonical hash.",
    severity: "info",
    rmf: [
      { id: "MAP 2.2",     short: "AI system documentation" },
      { id: "MEASURE 2.8", short: "Operational transparency" },
    ],
  },
  attestation_verified: {
    kind: "attestation_verified",
    blurb: "An attestation was verified against a trusted key — bytes are authentic.",
    severity: "ok",
    rmf: [
      { id: "MAP 2.2",     short: "AI system documentation" },
      { id: "MEASURE 2.7", short: "Operational measurement + monitoring" },
    ],
  },
  attestation_failed: {
    kind: "attestation_failed",
    blurb: "Attestation verification FAILED — tampered doc, untrusted key, or bad signature.",
    severity: "error",
    rmf: [
      { id: "MAP 2.2",    short: "AI system documentation" },
      { id: "MANAGE 2.2", short: "Response to detected issues" },
    ],
  },

  // incident-correlation
  incident_correlated: {
    kind: "incident_correlated",
    blurb: "An AI Incident Card was walked across the suite graph to a remediation plan.",
    severity: "info",
    rmf: [
      { id: "GOVERN 5.1", short: "Organizational policies + procedures" },
      { id: "MANAGE 4.2", short: "AI risk management process improvement" },
    ],
  },
  incident_correlation_failed: {
    kind: "incident_correlation_failed",
    blurb: "Incident correlation failed (unknown affected doc or graph error).",
    severity: "error",
    rmf: [
      { id: "MANAGE 4.2", short: "AI risk management process improvement" },
    ],
  },

  // aeo-graph-explorer
  graph_ingested: {
    kind: "graph_ingested",
    blurb: "An AEO graph crawl was atomically swapped into the explorer.",
    severity: "ok",
    rmf: [
      { id: "MAP 4.1", short: "Map AI system to organizational context" },
    ],
  },
  graph_ingest_failed: {
    kind: "graph_ingest_failed",
    blurb: "An AEO graph crawl was rejected — malformed JSONL.",
    severity: "error",
    rmf: [
      { id: "MAP 4.1",      short: "Map AI system to organizational context" },
      { id: "MEASURE 2.10", short: "Deviation from expected behavior tracked" },
    ],
  },

  // reliability-toolkit
  breaker_opened: {
    kind: "breaker_opened",
    blurb: "A circuit breaker tripped — downstream lost our trust.",
    severity: "error",
    rmf: [
      { id: "MANAGE 1.2",  short: "Risk response resourcing" },
      { id: "MEASURE 2.5", short: "AI system operational measurement" },
    ],
  },
  breaker_recovered: {
    kind: "breaker_recovered",
    blurb: "A circuit breaker recovered — downstream looks healthy again.",
    severity: "ok",
    rmf: [
      { id: "MEASURE 2.8", short: "Operational transparency" },
    ],
  },
} as const;

/** Lookup an event kind. Falls back to a generic info entry when unknown. */
export function lookup(kind: string): EventCatalogEntry {
  return (
    EVENT_CATALOG[kind] ?? {
      kind,
      blurb: "Unknown event kind. (Producer not in the v0.1.0 catalogue — payload still chained.)",
      severity: "info",
      rmf: [],
    }
  );
}

/**
 * Client-side alert-rule engine.
 *
 * Rules are stored in `localStorage` (no backend, no auth — the dashboard
 * is read-only public). Each rule is evaluated against the rolling
 * window of observed events on every new arrival; matches produce
 * `AlertHit` records that surface in the notification bell + (if the
 * user has granted permission) a desktop notification.
 *
 * Two rule shapes today:
 *   - `match`   : any event matching kind/source predicates fires
 *   - `threshold`: N events in window_seconds matching the predicates
 *
 * Both shapes are deliberately minimal — covers the 90% of "wake me up
 * when X" use cases without dragging in a full DSL.
 */

import type { GovernanceEvent } from "./types";

const STORAGE_KEY = "kg-governance-dashboard:alert-rules:v1";
const HITS_STORAGE_KEY = "kg-governance-dashboard:alert-hits:v1";
const MAX_HITS = 100;

export type AlertShape = "match" | "threshold";

export interface AlertRule {
  id: string;
  /** Human-readable label shown in the bell drawer. */
  label: string;
  shape: AlertShape;
  /** Optional kind predicates. Empty = match any kind. Regex strings. */
  kinds: string[];
  /** Optional source predicates. Empty = match any source. */
  sources: string[];
  /** For shape="threshold": count required within the window. */
  threshold?: number;
  /** For shape="threshold": rolling window in seconds. */
  window_seconds?: number;
  /** Browser-desktop notification permission consent for this rule. */
  desktop: boolean;
  /** Severity tag applied to the resulting hit. */
  severity: "info" | "warn" | "error";
  enabled: boolean;
}

export interface AlertHit {
  id: string;
  rule_id: string;
  rule_label: string;
  severity: AlertRule["severity"];
  /** ISO timestamp the hit was produced. */
  at: string;
  /** Human-readable explanation. */
  message: string;
  /** event_id that tripped the rule (most recent for thresholds). */
  trigger_event_id: number;
  /** Has the user acknowledged this in the bell drawer? */
  read: boolean;
}

/** A starter set of rules pre-installed on first load. */
export const DEFAULT_RULES: AlertRule[] = [
  {
    id: "rule-any-failure",
    label: "Any *_failed event",
    shape: "match",
    kinds: ["_failed$"],
    sources: [],
    desktop: true,
    severity: "error",
    enabled: true,
  },
  {
    id: "rule-attestation-tamper",
    label: "Attestation verification failure (possible tampering)",
    shape: "match",
    kinds: ["^attestation_failed$"],
    sources: [],
    desktop: true,
    severity: "error",
    enabled: true,
  },
  {
    id: "rule-deny-burst",
    label: "Policy deny burst (≥5 denies / 60s)",
    shape: "threshold",
    kinds: ["^request_denied$"],
    sources: [],
    threshold: 5,
    window_seconds: 60,
    desktop: false,
    severity: "warn",
    enabled: true,
  },
  {
    id: "rule-breaker-open",
    label: "Any breaker_opened event",
    shape: "match",
    kinds: ["^breaker_opened$"],
    sources: [],
    desktop: true,
    severity: "warn",
    enabled: true,
  },
  {
    id: "rule-slo-burn",
    label: "SLO burn started",
    shape: "match",
    kinds: ["^slo_burn_started$"],
    sources: [],
    desktop: true,
    severity: "warn",
    enabled: true,
  },
];

/* ---------- persistence ------------------------------------------- */

export function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RULES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_RULES;
    return parsed.filter(isRule);
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: AlertRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Quota exceeded or storage disabled — silent.
  }
}

export function loadHits(): AlertHit[] {
  try {
    const raw = localStorage.getItem(HITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHit).slice(-MAX_HITS);
  } catch {
    return [];
  }
}

export function saveHits(hits: AlertHit[]): void {
  try {
    localStorage.setItem(
      HITS_STORAGE_KEY,
      JSON.stringify(hits.slice(-MAX_HITS)),
    );
  } catch {
    // Quota exceeded — silent.
  }
}

function isRule(x: unknown): x is AlertRule {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.label === "string" &&
    (r.shape === "match" || r.shape === "threshold") &&
    Array.isArray(r.kinds) &&
    Array.isArray(r.sources)
  );
}

function isHit(x: unknown): x is AlertHit {
  if (!x || typeof x !== "object") return false;
  const h = x as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.rule_id === "string" &&
    typeof h.at === "string" &&
    typeof h.message === "string"
  );
}

/* ---------- evaluation -------------------------------------------- */

function matchAny(patterns: string[], value: string): boolean {
  if (patterns.length === 0) return true;
  return patterns.some((p) => {
    try {
      return new RegExp(p).test(value);
    } catch {
      // Treat as literal substring fallback if not a valid regex.
      return value.includes(p);
    }
  });
}

/**
 * Decide whether a rule fires for the latest event, given the rolling
 * window of recent events. Returns `null` when the rule doesn't fire.
 *
 * The caller maintains the (window-sized) recent event buffer and
 * passes it on every new event arrival.
 */
export function evaluate(
  rule: AlertRule,
  recent: readonly GovernanceEvent[],
  latest: GovernanceEvent,
): AlertHit | null {
  if (!rule.enabled) return null;
  const kindMatch = matchAny(rule.kinds, latest.kind);
  const sourceMatch = matchAny(rule.sources, latest.source);
  if (!kindMatch || !sourceMatch) return null;

  if (rule.shape === "match") {
    return makeHit(rule, latest, `${latest.kind} from ${latest.source}`);
  }

  // threshold shape — count matching events within window
  const threshold = rule.threshold ?? 1;
  const windowMs = (rule.window_seconds ?? 60) * 1000;
  const cutoff = Date.parse(latest.timestamp) - windowMs;
  let count = 0;
  for (const e of recent) {
    if (Date.parse(e.timestamp) < cutoff) continue;
    if (!matchAny(rule.kinds, e.kind)) continue;
    if (!matchAny(rule.sources, e.source)) continue;
    count++;
  }
  if (count < threshold) return null;
  return makeHit(
    rule,
    latest,
    `${count} matching events in the last ${rule.window_seconds}s (threshold ${threshold})`,
  );
}

function makeHit(rule: AlertRule, ev: GovernanceEvent, message: string): AlertHit {
  return {
    id: `hit-${ev.event_id}-${rule.id}`,
    rule_id: rule.id,
    rule_label: rule.label,
    severity: rule.severity,
    at: new Date().toISOString(),
    message,
    trigger_event_id: ev.event_id,
    read: false,
  };
}

/* ---------- desktop notifications --------------------------------- */

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function notificationPermission(): NotificationPermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  const res = await Notification.requestPermission();
  return res as NotificationPermissionState;
}

export function fireDesktopNotification(hit: AlertHit, rule: AlertRule): void {
  if (!rule.desktop) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(`KG Governance: ${rule.label}`, {
      body: hit.message,
      tag: rule.id, // collapses repeat notifications for the same rule
      icon: "/favicon.svg",
    });
  } catch {
    // some browsers throw on private mode; safe to swallow.
  }
}

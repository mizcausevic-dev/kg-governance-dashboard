/**
 * Thin client for the audit-stream-py REST + SSE surfaces.
 *
 * The dashboard only cares about three operations:
 *
 *   - subscribe(onEvent)  — long-lived SSE tail; auto-reconnects.
 *   - history(opts)       — initial backfill of the last N events so the
 *                           timeline isn't blank on cold load.
 *   - verifyChain()       — GET /verify; one-shot, return promise.
 *
 * Runtime config (the URL itself) comes from window.__KG_GOVERNANCE_CONFIG__
 * via `/public/config.js`. That lets operators repoint the deployed
 * dashboard at a different audit-stream instance without rebuilding.
 *
 * When the URL is unset / placeholder, callers should switch to demo
 * mode (see `./demo-events.ts`).
 */
import type { ChainVerifyResult, GovernanceEvent } from "./types";

const CONFIG_PLACEHOLDER = "__AUDIT_STREAM_URL__";

// audit-stream-py emits named SSE frames (`event: <kind>`) from this wire
// vocabulary. A new upstream kind needs to be added here to appear live;
// unnamed `message` frames are also accepted for compatible proxies.
// https://github.com/mizcausevic-dev/audit-stream-py/blob/main/src/audit_stream/models.py
const SSE_EVENT_KINDS = [
  "decision_card_drafted", "decision_card_signed", "decision_card_status_changed",
  "policy_bundle_registered", "request_denied", "request_allowed",
  "contract_promoted", "contract_deprecated", "contract_compatibility_failed",
  "watch_created", "watch_drifted", "watch_validity_flipped",
  "incident_filed", "remediation_planned", "attestation_verified",
  "attestation_tampered", "flag_swapped", "shadow_divergence_recorded",
  "tool_invocation_allowed", "tool_invocation_denied",
  "tool_invocation_required_approval", "other",
] as const;

export function getAuditStreamUrl(): string | null {
  const cfg = window.__KG_GOVERNANCE_CONFIG__;
  if (!cfg) return null;
  const raw = (cfg.AUDIT_STREAM_URL ?? "").trim();
  if (!raw || raw === CONFIG_PLACEHOLDER) return null;
  try {
    const url = new URL(raw);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
        url.username || url.password || url.search || url.hash) return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function isLive(): boolean {
  return getAuditStreamUrl() !== null;
}

function isGovernanceEvent(value: unknown): value is GovernanceEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return Number.isSafeInteger(event.event_id) && Number(event.event_id) >= 0 &&
    typeof event.timestamp === "string" && Number.isFinite(Date.parse(event.timestamp)) &&
    typeof event.kind === "string" && typeof event.source === "string" &&
    !!event.payload && typeof event.payload === "object" && !Array.isArray(event.payload);
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GET failed: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- REST ---------------------------------------------------- */

export async function history(
  opts: { limit?: number } = {},
): Promise<GovernanceEvent[]> {
  const base = getAuditStreamUrl();
  if (!base) return [];
  const limit = opts.limit ?? 50;
  const url = `${base}/events?limit=${limit}`;
  const body = await getJson(url);
  if (!Array.isArray(body) || !body.every(isGovernanceEvent)) {
    throw new Error("history GET: invalid governance event array");
  }
  return body;
}

export async function verifyChain(): Promise<ChainVerifyResult> {
  const base = getAuditStreamUrl();
  if (!base) {
    throw new Error("AUDIT_STREAM_URL not configured");
  }
  const body = await getJson(`${base}/verify`);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("verify GET: invalid result");
  }
  const result = body as Record<string, unknown>;
  if (typeof result.valid !== "boolean" ||
      !Number.isSafeInteger(result.checked) || Number(result.checked) < 0 ||
      !(result.first_break_at === null || (Number.isSafeInteger(result.first_break_at) && Number(result.first_break_at) >= 0)) ||
      !(result.reason === null || typeof result.reason === "string")) {
    throw new Error("verify GET: invalid result");
  }
  return result as unknown as ChainVerifyResult;
}

/* ---------- SSE ----------------------------------------------------- */

export interface Subscription {
  /** Stop the consumer; closes the EventSource and cancels reconnect attempts. */
  close(): void;
}

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

export interface SubscribeOptions {
  onEvent: (event: GovernanceEvent) => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (err: unknown) => void;
}

/**
 * Subscribe to `/stream`. EventSource handles ordinary reconnects;
 * the fallback timer handles a connection the browser closes permanently.
 */
export function subscribe(opts: SubscribeOptions): Subscription {
  const base = getAuditStreamUrl();
  if (!base) {
    opts.onStateChange?.("closed");
    opts.onError?.(new Error("AUDIT_STREAM_URL not configured"));
    return { close: () => {} };
  }
  const url = `${base}/stream`;
  let closed = false;
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function open() {
    if (closed) return;
    opts.onStateChange?.("connecting");
    es = new EventSource(url);
    es.onopen = () => {
      if (closed) return;
      opts.onStateChange?.("open");
    };
    const receive = (msg: Event) => {
      if (closed) return;
      if (!(msg instanceof MessageEvent)) return;
      try {
        const ev: unknown = JSON.parse(msg.data);
        if (isGovernanceEvent(ev)) {
          opts.onEvent(ev);
        } else {
          opts.onError?.(new Error("stream event: invalid governance event"));
        }
      } catch (err) {
        opts.onError?.(err);
      }
    };
    es.onmessage = receive;
    for (const kind of SSE_EVENT_KINDS) es.addEventListener(kind, receive);
    es.onerror = (err) => {
      if (closed) return;
      opts.onStateChange?.("reconnecting");
      opts.onError?.(err);
      // EventSource will auto-reconnect by default; we don't need to
      // recreate it. If it transitions to CLOSED, the browser gave up
      // — we'd then need a manual restart.
      if (es && es.readyState === EventSource.CLOSED && !reconnectTimer) {
        es.close();
        es = null;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!closed) open();
        }, 2_000);
      }
    };
  }

  open();

  return {
    close() {
      closed = true;
      opts.onStateChange?.("closed");
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
    },
  };
}

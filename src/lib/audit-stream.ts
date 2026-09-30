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
 * Only an unset / placeholder URL enables demo mode. A rejected URL must
 * remain visibly invalid rather than silently showing synthetic evidence.
 */
import type { ChainVerifyResult, GovernanceEvent } from "./types";

const CONFIG_PLACEHOLDER = "__AUDIT_STREAM_URL__";
export type StreamMode = "demo" | "live" | "invalid";

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

function resolveConfig(): { mode: StreamMode; url: string | null } {
  const cfg = window.__KG_GOVERNANCE_CONFIG__;
  if (!cfg || cfg.AUDIT_STREAM_URL === undefined || cfg.AUDIT_STREAM_URL === "") {
    return { mode: "demo", url: null };
  }
  if (typeof cfg.AUDIT_STREAM_URL !== "string") return { mode: "invalid", url: null };
  const raw = cfg.AUDIT_STREAM_URL.trim();
  if (!raw || raw === CONFIG_PLACEHOLDER) return { mode: "demo", url: null };
  try {
    // Root-relative paths are allowed for a same-origin authenticated gateway.
    // Bare relative paths can depend on the page route and are rejected.
    if (!raw.startsWith("/") && !/^https?:\/\//i.test(raw)) {
      return { mode: "invalid", url: null };
    }
    const url = new URL(raw, window.location.origin);
    const pageLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const targetLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const devLoopback = pageLoopback && targetLoopback && url.protocol === "http:";
    if ((!devLoopback && (url.protocol !== "https:" || url.origin !== window.location.origin)) ||
        url.username || url.password || url.search || url.hash) {
      return { mode: "invalid", url: null };
    }
    return { mode: "live", url: url.href.replace(/\/+$/, "") };
  } catch {
    return { mode: "invalid", url: null };
  }
}

export function getAuditStreamMode(): StreamMode {
  return resolveConfig().mode;
}

export function getAuditStreamUrl(): string | null {
  return resolveConfig().url;
}

export function isLive(): boolean {
  return getAuditStreamMode() === "live";
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
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GET failed: HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new Error("Read gateway returned a non-JSON response");
    }
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

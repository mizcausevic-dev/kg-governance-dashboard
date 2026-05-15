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

export function getAuditStreamUrl(): string | null {
  const cfg = window.__KG_GOVERNANCE_CONFIG__;
  if (!cfg) return null;
  const raw = (cfg.AUDIT_STREAM_URL ?? "").trim();
  if (!raw || raw === CONFIG_PLACEHOLDER) return null;
  return raw.replace(/\/+$/, "");
}

export function isLive(): boolean {
  return getAuditStreamUrl() !== null;
}

/* ---------- REST ---------------------------------------------------- */

export async function history(
  opts: { limit?: number } = {},
): Promise<GovernanceEvent[]> {
  const base = getAuditStreamUrl();
  if (!base) return [];
  const limit = opts.limit ?? 50;
  const url = `${base}/events?limit=${limit}`;
  const resp = await fetch(url, { headers: { accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`history GET failed: HTTP ${resp.status}`);
  }
  const body = await resp.json();
  if (!Array.isArray(body)) {
    throw new Error("history GET: expected JSON array");
  }
  return body as GovernanceEvent[];
}

export async function verifyChain(): Promise<ChainVerifyResult> {
  const base = getAuditStreamUrl();
  if (!base) {
    throw new Error("AUDIT_STREAM_URL not configured");
  }
  const resp = await fetch(`${base}/verify`, { headers: { accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`verify GET failed: HTTP ${resp.status}`);
  }
  return (await resp.json()) as ChainVerifyResult;
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
 * Subscribe to `/events/stream`. The browser's `EventSource` already
 * does exponential reconnect for us; we just rewrap state changes so
 * the UI can render a connection indicator.
 */
export function subscribe(opts: SubscribeOptions): Subscription {
  const base = getAuditStreamUrl();
  if (!base) {
    opts.onStateChange?.("closed");
    opts.onError?.(new Error("AUDIT_STREAM_URL not configured"));
    return { close: () => {} };
  }
  const url = `${base}/events/stream`;
  let closed = false;
  let es: EventSource | null = null;

  function open() {
    if (closed) return;
    opts.onStateChange?.("connecting");
    es = new EventSource(url);
    es.onopen = () => {
      if (closed) return;
      opts.onStateChange?.("open");
    };
    es.onmessage = (msg) => {
      if (closed) return;
      try {
        const ev = JSON.parse(msg.data) as GovernanceEvent;
        if (typeof ev.kind === "string" && typeof ev.source === "string") {
          opts.onEvent(ev);
        }
      } catch (err) {
        opts.onError?.(err);
      }
    };
    es.onerror = (err) => {
      if (closed) return;
      opts.onStateChange?.("reconnecting");
      opts.onError?.(err);
      // EventSource will auto-reconnect by default; we don't need to
      // recreate it. If it transitions to CLOSED, the browser gave up
      // — we'd then need a manual restart.
      if (es && es.readyState === EventSource.CLOSED) {
        // Browser closed it permanently; try again after a small delay.
        setTimeout(() => {
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
      if (es) {
        es.close();
        es = null;
      }
    },
  };
}

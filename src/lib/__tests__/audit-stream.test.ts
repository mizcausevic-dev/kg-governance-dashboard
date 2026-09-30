import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuditStreamMode, getAuditStreamUrl, history, subscribe, verifyChain } from "../audit-stream";

const validEvent = {
  event_id: 7,
  timestamp: "2026-09-29T12:00:00Z",
  kind: "request_denied",
  source: "policy-as-code-engine",
  payload: { reason: "test" },
};
const jsonHeaders = new Headers({ "content-type": "application/json" });

function configure() {
  window.__KG_GOVERNANCE_CONFIG__ = { AUDIT_STREAM_URL: "/audit-stream" };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.__KG_GOVERNANCE_CONFIG__;
});

describe("audit stream response validation", () => {
  it("subscribes to the upstream /stream endpoint and receives named SSE events", () => {
    configure();
    class FakeEventSource extends EventTarget {
      static latest: FakeEventSource;
      readonly url: string;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      readyState = 1;

      constructor(url: string) {
        super();
        this.url = url;
        FakeEventSource.latest = this;
      }

      close() { this.readyState = 2; }
    }
    vi.stubGlobal("EventSource", FakeEventSource);
    const onEvent = vi.fn();
    const subscription = subscribe({ onEvent });
    expect(FakeEventSource.latest.url).toBe(new URL("/audit-stream/stream", window.location.origin).href);
    FakeEventSource.latest.dispatchEvent(new MessageEvent("request_denied", {
      data: JSON.stringify(validEvent),
    }));
    expect(onEvent).toHaveBeenCalledWith(validEvent);
    subscription.close();
  });

  it("accepts same-origin gateway paths and rejects cross-origin, insecure, or credential-bearing URLs", () => {
    configure();
    expect(getAuditStreamMode()).toBe("live");
    expect(getAuditStreamUrl()).toBe(new URL("/audit-stream", window.location.origin).href);
    window.__KG_GOVERNANCE_CONFIG__!.AUDIT_STREAM_URL = "https://audit.example.test";
    expect(getAuditStreamMode()).toBe("invalid");
    expect(getAuditStreamUrl()).toBeNull();
    window.__KG_GOVERNANCE_CONFIG__ = { AUDIT_STREAM_URL: "http://audit.example.test" };
    expect(getAuditStreamMode()).toBe("invalid");
    window.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "https://user:pass@audit.example.test";
    expect(getAuditStreamMode()).toBe("invalid");
    window.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "http://localhost:8000";
    expect(getAuditStreamUrl()).toBe("http://localhost:8000");
  });

  it("keeps missing config in demo and configured invalid values out of demo", () => {
    expect(getAuditStreamMode()).toBe("demo");
    window.__KG_GOVERNANCE_CONFIG__ = { AUDIT_STREAM_URL: "__AUDIT_STREAM_URL__" };
    expect(getAuditStreamMode()).toBe("demo");
    window.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "//audit.example.test";
    expect(getAuditStreamMode()).toBe("invalid");
    window.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "/audit-stream?token=secret";
    expect(getAuditStreamMode()).toBe("invalid");
    window.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "audit-stream";
    expect(getAuditStreamMode()).toBe("invalid");
  });

  it("accepts a structurally valid history", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: jsonHeaders, json: async () => [validEvent] }));
    await expect(history()).resolves.toEqual([validEvent]);
  });

  it("rejects malformed history rather than rendering it as governance evidence", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: jsonHeaders, json: async () => [{ ...validEvent, event_id: "7" }] }));
    await expect(history()).rejects.toThrow("invalid governance event array");
  });

  it("surfaces an authorization failure from the read gateway", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(history()).rejects.toThrow("HTTP 403");
  });

  it("rejects an HTML fallback instead of treating it as the read gateway", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, headers: new Headers({ "content-type": "text/html" }), json: async () => [],
    }));
    await expect(history()).rejects.toThrow("non-JSON response");
  });

  it("rejects a string valid flag instead of displaying false as a valid chain", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: jsonHeaders,
      json: async () => ({ valid: "false", checked: 7, first_break_at: null, reason: null }),
    }));
    await expect(verifyChain()).rejects.toThrow("verify GET: invalid result");
  });

  it("accepts a correctly typed broken-chain result", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: jsonHeaders,
      json: async () => ({ valid: false, checked: 7, first_break_at: 4, reason: "hash mismatch" }),
    }));
    await expect(verifyChain()).resolves.toMatchObject({ valid: false, first_break_at: 4 });
  });
});

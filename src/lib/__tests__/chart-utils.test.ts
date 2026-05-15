import { describe, expect, it } from "vitest";
import { eventsPerHour, kindDistribution, sourceDistribution } from "../chart-utils";
import type { GovernanceEvent } from "../types";

function ev(
  id: number,
  kind: string,
  source: string,
  timestamp: string,
): GovernanceEvent {
  return { event_id: id, timestamp, kind, source, payload: {} };
}

describe("eventsPerHour", () => {
  it("buckets events into the hourly slot they fall in", () => {
    const now = Date.parse("2026-05-15T14:30:00Z");
    const points = eventsPerHour(
      [
        ev(1, "request_allowed", "policy-as-code-engine", "2026-05-15T14:15:00Z"),
        ev(2, "request_denied", "policy-as-code-engine", "2026-05-15T14:45:00Z"),
        ev(3, "attestation_failed", "hash-attestation", "2026-05-15T13:00:00Z"),
      ],
      24,
      now,
    );
    expect(points.length).toBe(24);
    // Last bucket is "today's 14:00 UTC" — 2 events (info + warn).
    // Skip the wall-clock label assertion since it's rendered in the
    // user's local timezone; assert the bucket counts instead.
    const bucket14 = points[23]!;
    expect(bucket14.total).toBe(2);
    expect(bucket14.info + bucket14.warn).toBe(2);
    // Second-to-last bucket holds "13:00 UTC" — 1 error.
    const bucket13 = points[22]!;
    expect(bucket13.total).toBe(1);
    expect(bucket13.error).toBe(1);
  });

  it("ignores events outside the windowed range", () => {
    const now = Date.parse("2026-05-15T14:00:00Z");
    const points = eventsPerHour(
      [ev(1, "request_allowed", "policy-as-code-engine", "2026-05-10T14:00:00Z")],
      24,
      now,
    );
    const total = points.reduce((s, p) => s + p.total, 0);
    expect(total).toBe(0);
  });
});

describe("kindDistribution", () => {
  it("counts events by kind, descending", () => {
    const dist = kindDistribution([
      ev(1, "request_allowed", "policy-as-code-engine", "2026-05-15T14:00:00Z"),
      ev(2, "request_allowed", "policy-as-code-engine", "2026-05-15T14:00:01Z"),
      ev(3, "request_denied", "policy-as-code-engine", "2026-05-15T14:00:02Z"),
    ]);
    expect(dist[0]!.kind).toBe("request_allowed");
    expect(dist[0]!.count).toBe(2);
    expect(dist[1]!.kind).toBe("request_denied");
    expect(dist[1]!.count).toBe(1);
  });

  it("truncates to the requested top N", () => {
    const events = Array.from({ length: 15 }, (_, i) =>
      ev(i, `kind_${i}`, "x", "2026-05-15T14:00:00Z"),
    );
    expect(kindDistribution(events, 5)).toHaveLength(5);
  });
});

describe("sourceDistribution", () => {
  it("counts events by source, descending", () => {
    const dist = sourceDistribution([
      ev(1, "x", "policy-as-code-engine", "2026-05-15T14:00:00Z"),
      ev(2, "x", "policy-as-code-engine", "2026-05-15T14:00:00Z"),
      ev(3, "x", "hash-attestation", "2026-05-15T14:00:00Z"),
    ]);
    expect(dist[0]!.source).toBe("policy-as-code-engine");
    expect(dist[0]!.count).toBe(2);
  });
});

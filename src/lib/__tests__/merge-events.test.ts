import { describe, expect, it } from "vitest";
import { mergeEvents } from "../merge-events";
import type { GovernanceEvent } from "../types";

const event = (event_id: number): GovernanceEvent => ({
  event_id,
  timestamp: `2026-09-29T12:00:${String(event_id).padStart(2, "0")}Z`,
  kind: "request_allowed",
  source: "policy-as-code-engine",
  payload: {},
});

describe("mergeEvents", () => {
  it("preserves an SSE event that arrived before the REST backfill resolves", () => {
    expect(mergeEvents([event(3)], [event(1), event(2)], 500).map((e) => e.event_id))
      .toEqual([1, 2, 3]);
  });

  it("deduplicates overlapping events and retains the REST hash fields", () => {
    const merged = mergeEvents([event(3)], [{ ...event(3), hash: "abc", prev_hash: "def" }], 500);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ event_id: 3, hash: "abc", prev_hash: "def" });
  });

  it("retains only the newest bounded event ids", () => {
    expect(mergeEvents([event(1), event(2)], [event(3)], 2).map((e) => e.event_id))
      .toEqual([2, 3]);
  });
});

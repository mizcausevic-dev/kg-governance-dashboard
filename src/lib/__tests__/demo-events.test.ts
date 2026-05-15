import { describe, expect, it } from "vitest";
import { seedHistory, startDemoStream } from "../demo-events";
import { EVENT_CATALOG } from "../rmf-citations";

describe("seedHistory", () => {
  it("returns the requested count of events", () => {
    const events = seedHistory(20);
    expect(events).toHaveLength(20);
  });

  it("returns events in chronological order (oldest first)", () => {
    const events = seedHistory(10);
    for (let i = 1; i < events.length; i++) {
      expect(Date.parse(events[i]!.timestamp)).toBeGreaterThanOrEqual(
        Date.parse(events[i - 1]!.timestamp),
      );
    }
  });

  it("uses event kinds that are all in the catalogue", () => {
    const events = seedHistory(50);
    for (const e of events) {
      expect(
        EVENT_CATALOG[e.kind],
        `demo emitted unknown kind ${e.kind}`,
      ).toBeDefined();
    }
  });

  it("monotonically assigns event_id starting at 1", () => {
    const events = seedHistory(15);
    const ids = events.map((e) => e.event_id);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("startDemoStream", () => {
  it("close() prevents future events from firing", async () => {
    const received: number[] = [];
    const sub = startDemoStream(1, (e) => received.push(e.event_id));
    sub.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toEqual([]);
  });
});

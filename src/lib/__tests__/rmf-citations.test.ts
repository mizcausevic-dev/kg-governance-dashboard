import { describe, expect, it } from "vitest";
import { EVENT_CATALOG, lookup } from "../rmf-citations";
import { PRODUCERS } from "../types";

describe("EVENT_CATALOG", () => {
  it("covers every event kind declared by every producer", () => {
    const declared = new Set<string>();
    for (const p of PRODUCERS) {
      for (const k of p.kinds) declared.add(k);
    }
    const catalogued = new Set(Object.keys(EVENT_CATALOG));
    for (const kind of declared) {
      expect(catalogued, `producer declared ${kind} but catalogue does not`).toContain(kind);
    }
  });

  it("keeps unmapped events explicit and uses only reviewed NIST topics", () => {
    const reviewed = new Set(["MEASURE 2.4", "MEASURE 2.7", "GOVERN 4.3"]);
    for (const [kind, entry] of Object.entries(EVENT_CATALOG)) {
      expect(entry.kind, kind).toBe(kind);
      expect(entry.blurb.length, `${kind} blurb`).toBeGreaterThan(10);
      for (const topic of entry.rmf) expect(reviewed.has(topic.id), kind).toBe(true);
    }
    expect(EVENT_CATALOG.decision_card_drafted.rmf).toEqual([]);
  });
});

describe("lookup", () => {
  it("returns the catalogue entry for a known kind", () => {
    const entry = lookup("request_denied");
    expect(entry.kind).toBe("request_denied");
    expect(entry.rmf.length).toBeGreaterThan(0);
  });

  it("returns a fallback entry for an unknown kind", () => {
    const entry = lookup("totally_made_up_kind");
    expect(entry.kind).toBe("totally_made_up_kind");
    expect(entry.severity).toBe("info");
    expect(entry.rmf).toEqual([]);
  });
});

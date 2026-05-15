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

  it("every entry has at least one RMF citation except the fallback", () => {
    for (const [kind, entry] of Object.entries(EVENT_CATALOG)) {
      expect(entry.kind, kind).toBe(kind);
      expect(entry.blurb.length, `${kind} blurb`).toBeGreaterThan(10);
      expect(entry.rmf.length, `${kind} rmf`).toBeGreaterThan(0);
    }
  });
});

describe("lookup", () => {
  it("returns the catalogue entry for a known kind", () => {
    const entry = lookup("decision_card_drafted");
    expect(entry.kind).toBe("decision_card_drafted");
    expect(entry.rmf.length).toBeGreaterThan(0);
  });

  it("returns a fallback entry for an unknown kind", () => {
    const entry = lookup("totally_made_up_kind");
    expect(entry.kind).toBe("totally_made_up_kind");
    expect(entry.severity).toBe("info");
    expect(entry.rmf).toEqual([]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_RULES, evaluate } from "../alert-rules";
import type { GovernanceEvent } from "../types";

function ev(
  id: number,
  kind: string,
  source: string,
  offset_ms = 0,
): GovernanceEvent {
  return {
    event_id: id,
    timestamp: new Date(Date.now() + offset_ms).toISOString(),
    kind,
    source,
    payload: {},
  };
}

describe("evaluate", () => {
  beforeEach(() => {
    // Reset Notification if it bleeds in from prior tests.
  });

  it("match shape fires on a single matching event", () => {
    const rule = DEFAULT_RULES.find((r) => r.id === "rule-any-failure")!;
    const e = ev(1, "attestation_failed", "hash-attestation");
    const hit = evaluate(rule, [e], e);
    expect(hit).not.toBeNull();
    expect(hit!.rule_id).toBe(rule.id);
    expect(hit!.severity).toBe("error");
  });

  it("match shape skips non-matching kinds", () => {
    const rule = DEFAULT_RULES.find((r) => r.id === "rule-any-failure")!;
    const e = ev(1, "request_allowed", "policy-as-code-engine");
    expect(evaluate(rule, [e], e)).toBeNull();
  });

  it("threshold shape fires only after enough matching events in window", () => {
    const rule = DEFAULT_RULES.find((r) => r.id === "rule-deny-burst")!;
    // Threshold is 5/60s. Push 4 hits inside the window — should not fire yet.
    const buf: GovernanceEvent[] = [];
    for (let i = 1; i <= 4; i++) {
      buf.push(ev(i, "request_denied", "policy-as-code-engine", -1000 * i));
    }
    const latest4 = buf[buf.length - 1]!;
    expect(evaluate(rule, buf, latest4)).toBeNull();

    // Add a 5th — should fire.
    const fifth = ev(5, "request_denied", "policy-as-code-engine", 0);
    buf.push(fifth);
    const hit = evaluate(rule, buf, fifth);
    expect(hit).not.toBeNull();
    expect(hit!.severity).toBe("warn");
  });

  it("threshold shape does not fire when matches are outside the window", () => {
    const rule = DEFAULT_RULES.find((r) => r.id === "rule-deny-burst")!;
    // 5 hits — but the first 4 are 5 minutes old, only the last is fresh.
    const buf: GovernanceEvent[] = [
      ev(1, "request_denied", "policy-as-code-engine", -300_000),
      ev(2, "request_denied", "policy-as-code-engine", -290_000),
      ev(3, "request_denied", "policy-as-code-engine", -280_000),
      ev(4, "request_denied", "policy-as-code-engine", -270_000),
      ev(5, "request_denied", "policy-as-code-engine", 0),
    ];
    expect(evaluate(rule, buf, buf[4]!)).toBeNull();
  });

  it("disabled rules never fire", () => {
    const rule = { ...DEFAULT_RULES[0]!, enabled: false };
    const e = ev(1, "attestation_failed", "hash-attestation");
    expect(evaluate(rule, [e], e)).toBeNull();
  });

  it("attestation_failed matches the dedicated tamper rule", () => {
    const rule = DEFAULT_RULES.find((r) => r.id === "rule-attestation-tamper")!;
    const e = ev(1, "attestation_failed", "hash-attestation");
    expect(evaluate(rule, [e], e)).not.toBeNull();
  });
});

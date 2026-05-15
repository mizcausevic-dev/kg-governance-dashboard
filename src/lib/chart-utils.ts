/**
 * Pure-function transformations from raw `GovernanceEvent[]` into the
 * series shapes Recharts expects. Kept in `lib/` so they're trivially
 * unit-testable independent of the React layer.
 */

import { lookup } from "./rmf-citations";
import type { GovernanceEvent } from "./types";

export interface EventsPerHourPoint {
  /** Bucket label, e.g. `"14:00"`. */
  hour: string;
  /** Absolute timestamp of the bucket start (ms since epoch). */
  bucket_ms: number;
  total: number;
  ok: number;
  info: number;
  warn: number;
  error: number;
}

/**
 * Bucket events into hourly slots over the last `hours` hours.
 * Buckets are aligned to the wall-clock hour and the result is
 * chronological (oldest first).
 */
export function eventsPerHour(
  events: readonly GovernanceEvent[],
  hours: number = 24,
  now: number = Date.now(),
): EventsPerHourPoint[] {
  // Anchor on the floor of the current hour, then walk backwards.
  const HOUR_MS = 3_600_000;
  const anchor = Math.floor(now / HOUR_MS) * HOUR_MS;
  const points: EventsPerHourPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const bucket_ms = anchor - i * HOUR_MS;
    const date = new Date(bucket_ms);
    points.push({
      hour: `${String(date.getHours()).padStart(2, "0")}:00`,
      bucket_ms,
      total: 0,
      ok: 0,
      info: 0,
      warn: 0,
      error: 0,
    });
  }
  for (const e of events) {
    const t = Date.parse(e.timestamp);
    if (Number.isNaN(t)) continue;
    const idx = Math.floor((t - (anchor - (hours - 1) * HOUR_MS)) / HOUR_MS);
    if (idx < 0 || idx >= hours) continue;
    const bucket = points[idx]!;
    bucket.total++;
    const sev = lookup(e.kind).severity;
    bucket[sev]++;
  }
  return points;
}

export interface KindDistributionPoint {
  kind: string;
  count: number;
  severity: "ok" | "info" | "warn" | "error";
}

/**
 * Aggregate events by kind, return descending by count, optionally
 * truncated to `top` entries.
 */
export function kindDistribution(
  events: readonly GovernanceEvent[],
  top: number = 10,
): KindDistributionPoint[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }
  const points: KindDistributionPoint[] = [];
  for (const [kind, count] of counts.entries()) {
    points.push({ kind, count, severity: lookup(kind).severity });
  }
  points.sort((a, b) => b.count - a.count);
  return points.slice(0, top);
}

export interface SourceDistributionPoint {
  source: string;
  count: number;
}

/** Aggregate events by source, descending. */
export function sourceDistribution(
  events: readonly GovernanceEvent[],
): SourceDistributionPoint[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

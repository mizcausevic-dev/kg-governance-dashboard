import type { GovernanceEvent } from "./types";

/** Combine the REST backfill and SSE tail without losing events that arrived
 * while the backfill was in flight. Prefer REST's hash fields when present. */
export function mergeEvents(
  current: readonly GovernanceEvent[],
  incoming: readonly GovernanceEvent[],
  maxEvents: number,
): GovernanceEvent[] {
  const byId = new Map<number, GovernanceEvent>();
  for (const event of [...current, ...incoming]) {
    const existing = byId.get(event.event_id);
    byId.set(event.event_id, existing ? {
      ...existing,
      ...event,
      prev_hash: event.prev_hash ?? existing.prev_hash,
      hash: event.hash ?? existing.hash,
    } : event);
  }
  return [...byId.values()]
    .sort((a, b) => a.event_id - b.event_id)
    .slice(-maxEvents);
}

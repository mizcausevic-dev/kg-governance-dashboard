import { useMemo } from "react";
import { lookup } from "../lib/rmf-citations";
import type { GovernanceEvent } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
  /** Optional filter — only show events whose payload mentions this string. */
  vendorFilter: string;
}

/**
 * Reverse-chronological stream of governance events. Newest at top.
 * Each event renders:
 *   - timestamp (relative + absolute)
 *   - kind badge with severity color
 *   - source pill
 *   - one-line blurb from the catalogue
 *   - NIST RMF citations
 *   - collapsible payload (default closed to keep the timeline scannable)
 */
export function Timeline({ events, vendorFilter }: Props) {
  const filtered = useMemo(() => {
    if (!vendorFilter) return events;
    const needle = vendorFilter.toLowerCase();
    return events.filter((e) => {
      // Cheap: search the JSON-serialised payload + source for the needle.
      const blob = (JSON.stringify(e.payload) + " " + e.source).toLowerCase();
      return blob.includes(needle);
    });
  }, [events, vendorFilter]);

  const reversed = useMemo(() => [...filtered].reverse(), [filtered]);

  if (reversed.length === 0) {
    return (
      <div className="timeline-empty">
        {vendorFilter
          ? `No events match the vendor filter "${vendorFilter}".`
          : "Waiting for the first governance event…"}
      </div>
    );
  }

  return (
    <ol className="timeline">
      {reversed.map((ev) => (
        <TimelineRow key={`${ev.event_id}-${ev.timestamp}`} event={ev} />
      ))}
    </ol>
  );
}

function TimelineRow({ event }: { event: GovernanceEvent }) {
  const entry = lookup(event.kind);
  return (
    <li className={`timeline-row sev-${entry.severity}`}>
      <div className="timeline-row-head">
        <span className="timeline-when" title={event.timestamp}>
          {formatRelative(event.timestamp)}
        </span>
        <span className={`kind-badge sev-${entry.severity}`}>{event.kind}</span>
        <span className="source-pill">{event.source}</span>
        <span className="event-id" title="audit-stream event_id">
          #{event.event_id}
        </span>
      </div>
      <div className="timeline-blurb">{entry.blurb}</div>
      {entry.rmf.length > 0 && (
        <div className="timeline-rmf">
          {entry.rmf.map((c) => (
            <span key={c.id} className="rmf-chip" title={c.short}>
              NIST {c.id}
            </span>
          ))}
        </div>
      )}
      <details className="timeline-payload">
        <summary>payload</summary>
        <pre>{JSON.stringify(event.payload, null, 2)}</pre>
      </details>
    </li>
  );
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const delta = Date.now() - then;
  if (delta < 1_000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1_000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(then).toLocaleString();
}

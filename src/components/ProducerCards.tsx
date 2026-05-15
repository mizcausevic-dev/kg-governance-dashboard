import { useMemo } from "react";
import { lookup } from "../lib/rmf-citations";
import { PRODUCERS } from "../lib/types";
import type { GovernanceEvent, Producer } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
  /** Only count events whose payload mentions this string. Empty = all. */
  vendorFilter: string;
}

/**
 * Grid of cards, one per producer in `PRODUCERS`. Each card shows:
 *   - producer identity (name + language + shape)
 *   - per-event-kind rolling counts within the visible event window
 *   - the most recent event kind that fired (with severity accent)
 */
export function ProducerCards({ events, vendorFilter }: Props) {
  const filtered = useMemo(() => {
    if (!vendorFilter) return events;
    const needle = vendorFilter.toLowerCase();
    return events.filter((e) =>
      (JSON.stringify(e.payload) + " " + e.source).toLowerCase().includes(needle),
    );
  }, [events, vendorFilter]);

  return (
    <div className="producer-grid">
      {PRODUCERS.map((p) => (
        <ProducerCard key={p.source} producer={p} events={filtered} />
      ))}
    </div>
  );
}

function ProducerCard({
  producer,
  events,
}: {
  producer: Producer;
  events: readonly GovernanceEvent[];
}) {
  const { counts, total, last } = useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(producer.kinds.map((k) => [k, 0]));
    let t = 0;
    let l: GovernanceEvent | null = null;
    for (const e of events) {
      if (e.source !== producer.source) continue;
      t++;
      l = e; // events are oldest-first; last one wins
      if (e.kind in c) c[e.kind] = (c[e.kind] ?? 0) + 1;
    }
    return { counts: c, total: t, last: l };
  }, [events, producer]);

  const lastEntry = last ? lookup(last.kind) : null;

  return (
    <article className={`producer-card lang-${producer.language.toLowerCase()}`}>
      <header className="producer-card-head">
        <h3>{producer.display}</h3>
        <span className="producer-meta">
          {producer.language} · {producer.shape}
        </span>
      </header>
      <div className="producer-total" aria-label="total events from this producer">
        {total}
        <span className="producer-total-label">events</span>
      </div>
      <ul className="producer-kinds">
        {producer.kinds.map((k) => {
          const entry = lookup(k);
          const count = counts[k] ?? 0;
          return (
            <li key={k} className={`kind-row sev-${entry.severity}`}>
              <span className="kind-name">{k}</span>
              <span className="kind-count">{count}</span>
            </li>
          );
        })}
      </ul>
      {last && lastEntry && (
        <footer className={`producer-last sev-${lastEntry.severity}`}>
          last: <code>{last.kind}</code>
        </footer>
      )}
    </article>
  );
}

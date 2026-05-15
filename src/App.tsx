import { useEffect, useRef, useState } from "react";
import { ChainVerify } from "./components/ChainVerify";
import { DemoBanner } from "./components/DemoBanner";
import { ProducerCards } from "./components/ProducerCards";
import { Timeline } from "./components/Timeline";
import { VendorFilter } from "./components/VendorFilter";
import {
  type ConnectionState,
  history,
  isLive,
  subscribe,
} from "./lib/audit-stream";
import { seedHistory, startDemoStream } from "./lib/demo-events";
import type { GovernanceEvent } from "./lib/types";

/** Max events kept in memory. Older ones are evicted so the page stays snappy. */
const MAX_EVENTS = 500;

export default function App() {
  const [events, setEvents] = useState<readonly GovernanceEvent[]>([]);
  const [conn, setConn] = useState<ConnectionState>(isLive() ? "connecting" : "open");
  const [filter, setFilter] = useState("");
  const live = useRef(isLive()).current;

  useEffect(() => {
    let cancelled = false;

    if (live) {
      // Backfill + SSE subscribe.
      history({ limit: 50 })
        .then((seed) => {
          if (cancelled) return;
          setEvents(seed);
        })
        .catch(() => {
          // Empty history is fine; SSE will populate.
        });
      const sub = subscribe({
        onEvent: (ev) =>
          setEvents((prev) => {
            const next = [...prev, ev];
            return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
          }),
        onStateChange: (s) => setConn(s),
      });
      return () => {
        cancelled = true;
        sub.close();
      };
    } else {
      // Demo mode: synthesise history + emit a steady drip.
      const seed = seedHistory(40);
      setEvents(seed);
      const nextId = (seed[seed.length - 1]?.event_id ?? 0) + 1;
      const sub = startDemoStream(nextId, (ev) =>
        setEvents((prev) => {
          const next = [...prev, ev];
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
        }),
      );
      return () => {
        cancelled = true;
        sub.close();
      };
    }
  }, [live]);

  return (
    <div className="app-root">
      <Header conn={conn} live={live} count={events.length} />
      <DemoBanner />
      <main className="app-main">
        <section className="left-rail">
          <VendorFilter value={filter} onChange={setFilter} />
          <ChainVerify />
          <KeyFacts />
        </section>
        <section className="center-rail">
          <h2 className="rail-h">Live timeline</h2>
          <Timeline events={events} vendorFilter={filter} />
        </section>
        <section className="right-rail">
          <h2 className="rail-h">Producers</h2>
          <ProducerCards events={events} vendorFilter={filter} />
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Header({
  conn,
  live,
  count,
}: {
  conn: ConnectionState;
  live: boolean;
  count: number;
}) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="brand-mark" aria-hidden="true">⌬</span>
        <div>
          <h1>Kinetic Gain Governance Dashboard</h1>
          <p className="app-header-tag">
            Live audit-stream tail · per-producer counters · NIST AI RMF crosswalk · chain
            verification
          </p>
        </div>
      </div>
      <div className="app-header-status">
        <span className={`conn-dot conn-${conn}`} aria-hidden="true" />
        <span className="conn-label">
          {live ? `audit-stream-py · ${conn}` : "demo mode · synthetic stream"}
        </span>
        <span className="event-counter" title="events held in client memory">
          {count.toLocaleString()} events
        </span>
      </div>
    </header>
  );
}

function KeyFacts() {
  return (
    <aside className="key-facts">
      <h3>The audit-stream spine</h3>
      <p>
        Every governance moment in a Kinetic Gain–instrumented stack writes to one hash-chained,
        tamper-evident log via{" "}
        <a
          href="https://github.com/mizcausevic-dev/audit-stream-py"
          target="_blank"
          rel="noreferrer"
        >
          audit-stream-py
        </a>
        . Nine producers across Python + Rust ecosystems, 21 event kinds, one verifiable narrative
        an auditor can replay end-to-end.
      </p>
      <p>
        <a
          href="https://suite.kineticgain.com/docs/nist-rmf-crosswalk.md"
          target="_blank"
          rel="noreferrer"
        >
          Suite × NIST AI RMF crosswalk ↗
        </a>
      </p>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <small>
        © 2026 Miz Causevic ·{" "}
        <a href="https://kineticgain.com" target="_blank" rel="noreferrer">
          kineticgain.com
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/mizcausevic-dev/kg-governance-dashboard"
          target="_blank"
          rel="noreferrer"
        >
          source
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/mizcausevic-dev/audit-stream-py"
          target="_blank"
          rel="noreferrer"
        >
          audit-stream-py
        </a>
      </small>
    </footer>
  );
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { AppHeader } from "./components/AppHeader";
import { AuditTrailTab } from "./components/AuditTrailTab";
import { DemoBanner } from "./components/DemoBanner";
import { OverviewTab } from "./components/OverviewTab";
import { ProducersTab } from "./components/ProducersTab";
import { Sidebar, type TabId } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { SystemLogStrip } from "./components/SystemLogStrip";
import { VerifyTab } from "./components/VerifyTab";
import {
  type ConnectionState,
  getAuditStreamMode,
  history,
  subscribe,
} from "./lib/audit-stream";
import { seedHistory, startDemoStream } from "./lib/demo-events";
import { mergeEvents } from "./lib/merge-events";
import type { GovernanceEvent } from "./lib/types";

const MAX_EVENTS = 500;

const TAB_LABEL: Record<TabId, string> = {
  overview: "Overview",
  producers: "Producers",
  trail: "Audit Trail",
  verify: "Chain Verify",
};

export default function App() {
  const [events, setEvents] = useState<readonly GovernanceEvent[]>([]);
  const mode = useRef(getAuditStreamMode()).current;
  const [conn, setConn] = useState<ConnectionState>(mode === "live" ? "connecting" : "closed");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [filter, setFilter] = useState("");
  const live = mode === "live";

  useEffect(() => {
    let cancelled = false;
    if (live) {
      history({ limit: 50 })
        .then((seed) => {
          if (!cancelled) setEvents((prev) => mergeEvents(prev, seed, MAX_EVENTS));
        })
        .catch((error: unknown) => {
          if (!cancelled) setStreamError(error instanceof Error ? error.message : "Unable to load stream history");
        });
      const sub = subscribe({
        onEvent: (ev) =>
          setEvents((prev) => mergeEvents(prev, [ev], MAX_EVENTS)),
        onStateChange: (state) => {
          setConn(state);
          if (state === "open") setStreamError(null);
        },
        onError: () => setStreamError((current) => current ?? "Stream connection failed; check gateway access"),
      });
      return () => {
        cancelled = true;
        sub.close();
      };
    } else if (mode === "demo") {
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
  }, [live, mode]);

  return (
    <div className={`app-root ${mode}`}>
      <h1 className="sr-only">Kinetic Gain Governance Dashboard</h1>
      <Sidebar
        active={tab}
        onSelect={setTab}
        mode={mode}
        conn={conn}
        eventCount={events.length}
      />
      <AppHeader
        conn={conn}
        mode={mode}
        tabLabel={TAB_LABEL[tab]}
        events={events}
      />
      <DemoBanner mode={mode} />
      {mode === "live" && streamError && (
        <div className="demo-banner stream-error-banner" role="alert">
          <strong>Live stream unavailable.</strong> {streamError}. Check the gateway route, session, and read permissions.
        </div>
      )}
      <main className="app-main">
        <AnimatePresence mode="wait">
          {tab === "overview" && <OverviewTab key="overview" events={events} />}
          {tab === "producers" && <ProducersTab key="producers" events={events} mode={mode} />}
          {tab === "trail" && (
            <AuditTrailTab
              key="trail"
              events={events}
              filter={filter}
              onFilter={setFilter}
            />
          )}
          {tab === "verify" && <VerifyTab key="verify" />}
        </AnimatePresence>
      </main>
      <SystemLogStrip events={events} mode={mode} />
      <StatusBar mode={mode} conn={conn} eventCount={events.length} />
    </div>
  );
}

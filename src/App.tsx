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
  history,
  isLive,
  subscribe,
} from "./lib/audit-stream";
import { seedHistory, startDemoStream } from "./lib/demo-events";
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
  const [conn, setConn] = useState<ConnectionState>(isLive() ? "connecting" : "open");
  const [tab, setTab] = useState<TabId>("overview");
  const [filter, setFilter] = useState("");
  const live = useRef(isLive()).current;
  const connected = live ? conn === "open" : true;

  useEffect(() => {
    let cancelled = false;
    if (live) {
      history({ limit: 50 })
        .then((seed) => {
          if (!cancelled) setEvents(seed);
        })
        .catch(() => {
          /* SSE will populate */
        });
      const sub = subscribe({
        onEvent: (ev) =>
          setEvents((prev) => {
            const next = [...prev, ev];
            return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
          }),
        onStateChange: setConn,
      });
      return () => {
        cancelled = true;
        sub.close();
      };
    } else {
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
    <div className={`app-root ${live ? "live" : "demo"}`}>
      <Sidebar
        active={tab}
        onSelect={setTab}
        connected={connected}
        eventCount={events.length}
      />
      <AppHeader
        conn={conn}
        live={live}
        tabLabel={TAB_LABEL[tab]}
        events={events}
      />
      <DemoBanner />
      <main className="app-main">
        <AnimatePresence mode="wait">
          {tab === "overview" && <OverviewTab key="overview" events={events} />}
          {tab === "producers" && <ProducersTab key="producers" events={events} />}
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
      <SystemLogStrip events={events} />
      <StatusBar live={live} eventCount={events.length} />
    </div>
  );
}

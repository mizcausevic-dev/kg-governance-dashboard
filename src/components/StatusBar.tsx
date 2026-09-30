import type { ConnectionState } from "../lib/audit-stream";

interface Props {
  live: boolean;
  conn: ConnectionState;
  eventCount: number;
}

/** Sticky bottom status bar — pinned mono row of system metadata. */
export function StatusBar({ live, conn, eventCount }: Props) {
  const connected = live && conn === "open";
  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <span className={`status-pulse ${connected ? "status-pulse-live" : "status-pulse-demo"}`} />
        <span>stream_status: {!live ? "DEMO" : conn.toUpperCase()}</span>
        <span className="status-sep">·</span>
        <span>source: {live ? "configured SSE" : "synthetic"}</span>
        <span className="status-sep">·</span>
        <span>events: {eventCount.toLocaleString()}</span>
      </div>
      <div className="status-bar-right">
        <span>kg-governance-dashboard</span>
        <span className="status-sep">·</span>
        <span className="status-ver">v0.2.0</span>
      </div>
    </footer>
  );
}

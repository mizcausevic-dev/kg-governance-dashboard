interface Props {
  live: boolean;
  eventCount: number;
}

/** Sticky bottom status bar — pinned mono row of system metadata. */
export function StatusBar({ live, eventCount }: Props) {
  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <span className={`status-pulse ${live ? "status-pulse-live" : "status-pulse-demo"}`} />
        <span>core_status: {live ? "NOMINAL" : "DEMO"}</span>
        <span className="status-sep">·</span>
        <span>lat: {live ? "live SSE" : "synthetic"}</span>
        <span className="status-sep">·</span>
        <span>events: {eventCount.toLocaleString()}</span>
      </div>
      <div className="status-bar-right">
        <span>kg-governance-dashboard</span>
        <span className="status-sep">·</span>
        <span className="status-ver">v0.2.0 · ALPHA-04B</span>
      </div>
    </footer>
  );
}

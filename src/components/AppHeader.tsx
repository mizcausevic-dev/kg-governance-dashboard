import type { ConnectionState, StreamMode } from "../lib/audit-stream";
import type { GovernanceEvent } from "../lib/types";
import { NotificationBell } from "./NotificationBell";

interface Props {
  conn: ConnectionState;
  mode: StreamMode;
  tabLabel: string;
  events: readonly GovernanceEvent[];
}

const TONE: Record<ConnectionState, string> = {
  open: "tone-ok",
  connecting: "tone-warn",
  reconnecting: "tone-warn",
  closed: "tone-error",
};

const LABEL: Record<ConnectionState, string> = {
  open: "STREAM CONNECTED",
  connecting: "CONNECTING",
  reconnecting: "RECONNECTING",
  closed: "DISCONNECTED",
};

/** Top-of-page header strip with current tab title + status pills + bell. */
export function AppHeader({ conn, mode, tabLabel, events }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-titles">
        <h2 className="app-header-tab">{tabLabel}</h2>
        <div className="app-header-pills">
          <span role="status" aria-live="polite" className={`pill ${mode === "live" ? TONE[conn] : mode === "invalid" ? "tone-error" : "tone-warn"}`}>
            {mode === "live" ? LABEL[conn] : mode === "invalid" ? "CONFIG ERROR" : "DEMO MODE"}
          </span>
          <span className="pill tone-info">v0.2.0</span>
          <span className="pill tone-muted">{events.length} events</span>
        </div>
      </div>
      <div className="app-header-actions">
        <NotificationBell events={events} />
      </div>
    </header>
  );
}

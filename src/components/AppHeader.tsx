import type { ConnectionState } from "../lib/audit-stream";
import type { GovernanceEvent } from "../lib/types";
import { NotificationBell } from "./NotificationBell";

interface Props {
  conn: ConnectionState;
  live: boolean;
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
  open: "ENGINE ACTIVE",
  connecting: "CONNECTING",
  reconnecting: "RECONNECTING",
  closed: "DISCONNECTED",
};

/** Top-of-page header strip with current tab title + status pills + bell. */
export function AppHeader({ conn, live, tabLabel, events }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-titles">
        <h2 className="app-header-tab">{tabLabel}</h2>
        <div className="app-header-pills">
          <span className={`pill ${live ? TONE[conn] : "tone-warn"}`}>
            {live ? LABEL[conn] : "DEMO MODE"}
          </span>
          <span className="pill tone-info">ALPHA-04B</span>
          <span className="pill tone-muted">{events.length} events</span>
        </div>
      </div>
      <div className="app-header-actions">
        <NotificationBell events={events} />
      </div>
    </header>
  );
}

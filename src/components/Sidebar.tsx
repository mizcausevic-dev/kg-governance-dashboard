import {
  LayoutDashboard,
  Cpu,
  History,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { ComponentType } from "react";

export type TabId = "overview" | "producers" | "trail" | "verify";

interface TabDef {
  id: TabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: readonly TabDef[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "producers", label: "Producers", icon: Cpu },
  { id: "trail", label: "Audit Trail", icon: History },
  { id: "verify", label: "Chain Verify", icon: ShieldCheck },
];

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
  /** Whether the live SSE connection is healthy — drives the heartbeat dot. */
  connected: boolean;
  /** Total events held in memory — shown in the heartbeat panel. */
  eventCount: number;
}

/**
 * Left-rail navigation, glassmorphic dark. Holds the brand mark + tab
 * switcher + a heartbeat panel pinned to the bottom showing whether
 * the dashboard is talking to a live audit-stream.
 */
export function Sidebar({ active, onSelect, connected, eventCount }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">⌬</div>
        <div>
          <div className="sidebar-brand-name">KG Gov</div>
          <div className="sidebar-brand-tag">audit-stream · v0.2.0</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="dashboard tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`sidebar-tab ${isActive ? "sidebar-tab-active" : ""}`}
              onClick={() => onSelect(tab.id)}
            >
              <Icon className="sidebar-tab-icon" />
              <span className="sidebar-tab-label">{tab.label}</span>
              {isActive && <ChevronRight className="sidebar-tab-caret" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-heartbeat">
        <div className="heartbeat-head">
          <span className="heartbeat-label">Heartbeat</span>
          <span
            className={`heartbeat-dot ${connected ? "heartbeat-dot-up" : "heartbeat-dot-down"}`}
            aria-hidden="true"
          />
        </div>
        <div className="heartbeat-row">
          <span>state</span>
          <span className="heartbeat-val">
            {connected ? "live" : "demo"}
          </span>
        </div>
        <div className="heartbeat-row">
          <span>events</span>
          <span className="heartbeat-val">{eventCount.toLocaleString()}</span>
        </div>
      </div>
    </aside>
  );
}

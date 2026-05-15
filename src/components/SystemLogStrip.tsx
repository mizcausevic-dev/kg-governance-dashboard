import { useMemo } from "react";
import { Terminal } from "lucide-react";
import { lookup } from "../lib/rmf-citations";
import type { GovernanceEvent } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
  /** How many lines to show. Default 8. */
  rows?: number;
}

/**
 * Compact monospace log strip pinned at the bottom of every page.
 * Shows the last N events as colored mono text — alternate compact
 * rendering of the same data the Timeline renders fully.
 */
export function SystemLogStrip({ events, rows = 8 }: Props) {
  const recent = useMemo(() => events.slice(-rows).reverse(), [events, rows]);
  return (
    <div className="log-strip">
      <div className="log-strip-head">
        <Terminal className="log-strip-icon" />
        <span className="log-strip-title">SYSTEM_LOGS_STREAM</span>
        <span className="log-strip-tag">SECURE_TUNNEL · ACTIVE</span>
      </div>
      <div className="log-strip-body">
        {recent.length === 0 ? (
          <span className="log-strip-idle">awaiting first event…</span>
        ) : (
          recent.map((e) => {
            const sev = lookup(e.kind).severity;
            return (
              <div key={`${e.event_id}-${e.timestamp}`} className={`log-strip-line sev-${sev}`}>
                <span className="log-strip-ts">{shortTime(e.timestamp)}</span>
                <span className="log-strip-source">[{shortSource(e.source)}]</span>
                <span className="log-strip-kind">{e.kind}</span>
                <span className="log-strip-id">#{e.event_id}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function shortSource(s: string): string {
  // Tighten long source names for the strip.
  return s.replace(/-py$|-rs$|-service$|-tracker$|-engine$|-registry$|-explorer$|-correlation$|-toolkit$|-decision-api$/, (m) =>
    m === "-decision-api" ? "-decision" : m.slice(1, 5),
  );
}

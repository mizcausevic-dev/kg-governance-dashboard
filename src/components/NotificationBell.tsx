import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, Settings, X } from "lucide-react";
import {
  type AlertHit,
  type AlertRule,
  evaluate,
  fireDesktopNotification,
  loadHits,
  loadRules,
  notificationPermission,
  requestNotificationPermission,
  saveHits,
  saveRules,
} from "../lib/alert-rules";
import type { GovernanceEvent } from "../lib/types";
import { AlertRulesPanel } from "./AlertRulesPanel";

/** Rolling window of recent events the rule engine consults for
 * threshold-shape rules (60s is the longest window in DEFAULT_RULES). */
const RECENT_WINDOW = 200;

interface Props {
  events: readonly GovernanceEvent[];
}

/**
 * The notification bell in the header. Owns the alert-rule state +
 * the hits log + the rules-panel drawer. Pulses + badges when there
 * are unread hits; opens a drawer that lists recent hits and lets the
 * user manage rules.
 */
export function NotificationBell({ events }: Props) {
  const [rules, setRules] = useState<AlertRule[]>(() => loadRules());
  const [hits, setHits] = useState<AlertHit[]>(() => loadHits());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"hits" | "rules">("hits");
  const [permission, setPermission] = useState(notificationPermission());

  // Evaluate rules against each new event.
  const lastSeenIdRef = useRef<number>(0);
  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1]!;
    if (latest.event_id <= lastSeenIdRef.current) return;
    lastSeenIdRef.current = latest.event_id;

    const recent = events.slice(-RECENT_WINDOW);
    const newHits: AlertHit[] = [];
    for (const rule of rules) {
      const hit = evaluate(rule, recent, latest);
      if (hit) {
        newHits.push(hit);
        fireDesktopNotification(hit, rule);
      }
    }
    if (newHits.length > 0) {
      setHits((prev) => {
        const next = [...prev, ...newHits].slice(-100);
        saveHits(next);
        return next;
      });
    }
  }, [events, rules]);

  // Persist rules whenever they change.
  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  const unread = hits.filter((h) => !h.read).length;

  function markAllRead() {
    setHits((prev) => {
      const next = prev.map((h) => ({ ...h, read: true }));
      saveHits(next);
      return next;
    });
  }

  function clearHits() {
    setHits(() => {
      saveHits([]);
      return [];
    });
  }

  async function enableDesktop() {
    const next = await requestNotificationPermission();
    setPermission(next);
  }

  return (
    <div className="bell-container">
      <button
        type="button"
        className={`bell-button ${unread > 0 ? "bell-button-armed" : ""}`}
        aria-label={`Notifications (${unread} unread)`}
        onClick={() => {
          setOpen(true);
          setView("hits");
        }}
      >
        <Bell className="bell-icon" />
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="bell-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="bell-drawer glass-card"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
            >
              <header className="bell-drawer-head">
                <h3>Signals</h3>
                <button className="bell-close" onClick={() => setOpen(false)} aria-label="close">
                  <X className="icon-sm" />
                </button>
              </header>

              <div className="bell-tabs">
                <button
                  className={`bell-tab ${view === "hits" ? "bell-tab-active" : ""}`}
                  onClick={() => setView("hits")}
                >
                  Recent hits {hits.length > 0 && <span className="bell-tab-count">{hits.length}</span>}
                </button>
                <button
                  className={`bell-tab ${view === "rules" ? "bell-tab-active" : ""}`}
                  onClick={() => setView("rules")}
                >
                  <Settings className="icon-sm" /> Rules
                </button>
              </div>

              {view === "hits" && (
                <HitsList
                  hits={hits}
                  onMarkAllRead={markAllRead}
                  onClear={clearHits}
                  permission={permission}
                  onEnableDesktop={enableDesktop}
                />
              )}

              {view === "rules" && <AlertRulesPanel rules={rules} onChange={setRules} />}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function HitsList({
  hits,
  onMarkAllRead,
  onClear,
  permission,
  onEnableDesktop,
}: {
  hits: AlertHit[];
  onMarkAllRead: () => void;
  onClear: () => void;
  permission: string;
  onEnableDesktop: () => void;
}) {
  const reversed = [...hits].reverse();
  return (
    <div className="bell-hits">
      <div className="bell-hits-controls">
        <button className="bell-mini-btn" onClick={onMarkAllRead} disabled={hits.length === 0}>
          mark all read
        </button>
        <button className="bell-mini-btn bell-mini-btn-danger" onClick={onClear} disabled={hits.length === 0}>
          clear
        </button>
        {permission === "default" && (
          <button className="bell-mini-btn bell-mini-btn-primary" onClick={onEnableDesktop}>
            enable desktop alerts
          </button>
        )}
        {permission === "denied" && (
          <span className="bell-perm-denied">desktop alerts blocked in browser settings</span>
        )}
        {permission === "granted" && (
          <span className="bell-perm-granted">desktop alerts enabled</span>
        )}
      </div>

      {reversed.length === 0 ? (
        <div className="bell-empty">
          <BellOff className="bell-empty-icon" />
          <p>No signals yet. Rules fire only on incoming events.</p>
        </div>
      ) : (
        <ul className="bell-hit-list">
          {reversed.map((h) => (
            <li key={h.id} className={`bell-hit sev-${h.severity} ${!h.read ? "bell-hit-unread" : ""}`}>
              <div className="bell-hit-head">
                <span className="bell-hit-label">{h.rule_label}</span>
                <span className="bell-hit-when">{formatRelative(h.at)}</span>
              </div>
              <div className="bell-hit-msg">{h.message}</div>
              <div className="bell-hit-foot">event #{h.trigger_event_id}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const delta = Date.now() - then;
  if (delta < 1_000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1_000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(then).toLocaleString();
}

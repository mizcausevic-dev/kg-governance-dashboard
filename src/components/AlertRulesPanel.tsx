import type { AlertRule } from "../lib/alert-rules";

interface Props {
  rules: AlertRule[];
  onChange: (next: AlertRule[]) => void;
}

/**
 * Rules editor. Minimal by design — toggle enabled/desktop, edit label,
 * tweak threshold + window for threshold-shape rules. Regex predicates
 * are not editable in v0.2.0 (the default set covers the high-value
 * cases). Future revs can add an "advanced rule" form.
 */
export function AlertRulesPanel({ rules, onChange }: Props) {
  function update(id: string, patch: Partial<AlertRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="rules-panel">
      <p className="rules-blurb">
        Rules evaluate against every incoming event. <strong>match</strong>{" "}
        fires on any matching kind; <strong>threshold</strong> fires once N
        matching events arrive within a rolling window. Stored locally in your
        browser — no auth, no backend.
      </p>
      <ul className="rules-list">
        {rules.map((r) => (
          <li key={r.id} className={`rules-row sev-${r.severity}`}>
            <div className="rules-row-head">
              <label className="rules-toggle">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => update(r.id, { enabled: e.target.checked })}
                />
                <span className="rules-row-label">{r.label}</span>
              </label>
              <span className="rules-shape">{r.shape}</span>
            </div>
            <div className="rules-row-body">
              <code className="rules-kinds">
                kinds: {r.kinds.length === 0 ? "*" : r.kinds.join(", ")}
              </code>
              {r.shape === "threshold" && (
                <div className="rules-threshold-controls">
                  <label>
                    threshold
                    <input
                      type="number"
                      min={1}
                      value={r.threshold ?? 1}
                      onChange={(e) =>
                        update(r.id, { threshold: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </label>
                  <label>
                    window (s)
                    <input
                      type="number"
                      min={5}
                      value={r.window_seconds ?? 60}
                      onChange={(e) =>
                        update(r.id, {
                          window_seconds: Math.max(5, Number(e.target.value) || 60),
                        })
                      }
                    />
                  </label>
                </div>
              )}
              <label className="rules-desktop">
                <input
                  type="checkbox"
                  checked={r.desktop}
                  onChange={(e) => update(r.id, { desktop: e.target.checked })}
                />
                <span>desktop notification</span>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

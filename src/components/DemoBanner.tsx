import { isLive } from "../lib/audit-stream";

/**
 * Banner shown when AUDIT_STREAM_URL is unset / placeholder. Lets the
 * visitor know they're looking at a synthetic stream, not a live one.
 */
export function DemoBanner() {
  if (isLive()) return null;
  return (
    <div className="demo-banner">
      <strong>Demo mode.</strong> No <code>AUDIT_STREAM_URL</code> configured — this dashboard is
      currently rendering a synthetic event stream so you can see what it does. Edit{" "}
      <code>/config.js</code> on the deployed site (or the repo) to point at your live{" "}
      <a
        href="https://github.com/mizcausevic-dev/audit-stream-py"
        target="_blank"
        rel="noreferrer"
      >
        audit-stream-py
      </a>{" "}
      instance, no rebuild required.
    </div>
  );
}

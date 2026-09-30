import { Info } from "lucide-react";
import type { StreamMode } from "../lib/audit-stream";

/**
 * Banner shown when AUDIT_STREAM_URL is unset / placeholder. Lets the
 * visitor know they're looking at a synthetic stream, not a live one.
 */
export function DemoBanner({ mode }: { mode: StreamMode }) {
  if (mode === "live") return null;
  return (
    <div className="demo-banner" role={mode === "invalid" ? "alert" : undefined}>
      <Info className="demo-banner-icon" />
      <span>
        {mode === "invalid" ? (
          <><strong>Configuration error.</strong> No events are shown. Set <code>AUDIT_STREAM_URL</code>
          to a same-origin HTTPS gateway path in <code>/config.js</code>. Loopback HTTP is for local development.</>
        ) : (
          <><strong>Demo mode.</strong> These events are synthetic. Live use requires an
          authenticated, redacted, same-origin audit-stream gateway.</>
        )}
      </span>
    </div>
  );
}

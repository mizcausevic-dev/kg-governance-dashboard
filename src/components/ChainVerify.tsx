import { useState } from "react";
import { isLive, verifyChain } from "../lib/audit-stream";
import type { ChainVerifyResult } from "../lib/types";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; result: ChainVerifyResult }
  | { kind: "err"; message: string };

/**
 * Single "verify the chain" button that calls `GET /verify` on the
 * live audit-stream server and reports the result inline. The
 * canonical compliance answer — much stronger than client-side
 * verification because it covers the FULL server-side history.
 *
 * In demo mode the button is disabled with an explainer.
 */
export function ChainVerify() {
  const live = isLive();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run() {
    setState({ kind: "running" });
    try {
      const result = await verifyChain();
      setState({ kind: "ok", result });
    } catch (err) {
      setState({
        kind: "err",
        message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }
  }

  return (
    <section className="chain-verify">
      <div className="chain-verify-head">
        <div>
          <h3>Verify the chain</h3>
          <p>
            Walks the audit-stream-py hash chain end-to-end and confirms every event's{" "}
            <code>prev_hash</code> + canonical-hash link is intact. The compliance answer to{" "}
            <em>"has anyone tampered with the governance log?"</em>
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!live || state.kind === "running"}
          className="primary-button"
        >
          {state.kind === "running" ? "Verifying…" : "GET /verify"}
        </button>
      </div>

      {!live && (
        <div className="chain-verify-demo">
          Disabled in demo mode. Configure <code>AUDIT_STREAM_URL</code> in{" "}
          <code>/config.js</code> to point this dashboard at your audit-stream-py instance.
        </div>
      )}

      {state.kind === "ok" && <ChainVerifyResultBlock result={state.result} />}
      {state.kind === "err" && <div className="chain-verify-err">{state.message}</div>}
    </section>
  );
}

function ChainVerifyResultBlock({ result }: { result: ChainVerifyResult }) {
  return (
    <div className={`chain-verify-result ${result.valid ? "ok" : "broken"}`}>
      <div className="chain-verify-headline">
        {result.valid ? (
          <>
            <strong>✓ chain valid</strong> — {result.checked.toLocaleString()} events checked
          </>
        ) : (
          <>
            <strong>✗ chain broken</strong> at event #{result.first_break_at}
          </>
        )}
      </div>
      {result.reason && <div className="chain-verify-reason">{result.reason}</div>}
    </div>
  );
}

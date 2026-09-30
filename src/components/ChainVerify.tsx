import { useState } from "react";
import { getAuditStreamMode, verifyChain } from "../lib/audit-stream";
import type { ChainVerifyResult } from "../lib/types";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; result: ChainVerifyResult }
  | { kind: "err"; message: string };

/**
 * Single "verify the chain" button that calls `GET /verify` on the
 * live audit-stream server and reports the result inline. The
 * Checks internal consistency of the server's current chain. This is not
 * independent proof against a privileged rewrite or deleted tail.
 *
 * In demo mode the button is disabled with an explainer.
 */
export function ChainVerify() {
  const mode = getAuditStreamMode();
  const live = mode === "live";
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
            Asks the configured server to check its current hash chain for
            broken links or altered stored event hashes. A valid result does not
            prove the server history is complete or independently authentic.
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
          {mode === "invalid" ? "Disabled: the configured stream URL is invalid." :
            <>Disabled in demo mode. Configure <code>AUDIT_STREAM_URL</code> in{" "}
            <code>/config.js</code> to use an authenticated same-origin gateway.</>}
        </div>
      )}

      {state.kind === "ok" && <ChainVerifyResultBlock result={state.result} />}
      {state.kind === "err" && <div className="chain-verify-err">{state.message}</div>}
    </section>
  );
}

function ChainVerifyResultBlock({ result }: { result: ChainVerifyResult }) {
  return (
    <div role="status" className={`chain-verify-result ${result.valid ? "ok" : "broken"}`}>
      <div className="chain-verify-headline">
        {result.valid ? (
          <>
            <strong>✓ stored chain internally consistent</strong> — {result.checked.toLocaleString()} events checked
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

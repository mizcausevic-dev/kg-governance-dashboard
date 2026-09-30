import { motion } from "motion/react";
import { ChainVerify } from "./ChainVerify";

/** Verify tab — chain verifier plus an explainer aimed at procurement
 * reviewers / auditors. */
export function VerifyTab() {
  return (
    <motion.div
      className="verify-tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ChainVerify />

      <article className="verify-explainer glass-card">
        <h3>What "verify the chain" actually proves</h3>
        <p>
          <code>audit-stream-py</code> stores every governance event in a
          hash-chained ledger: each event's <code>hash</code> is the SHA-256 of
          its canonical JSON, and the <code>prev_hash</code> of event <em>n</em>{" "}
          must equal the <code>hash</code> of event <em>n − 1</em>. Genesis
          event's <code>prev_hash</code> is 64 zeros.
        </p>
        <p>
          This catches broken links and changes that were not followed by
          recomputing the chain. A party able to rewrite the full log can
          recompute hashes, and a deleted tail may leave a consistent prefix.
          Independent tamper evidence needs a separately protected checkpoint,
          signature, or external witness plus retention controls.
        </p>
        <p>
          This dashboard's <em>Verify</em> button delegates to{" "}
          <code>GET /verify</code> on the live audit-stream server — it answers
          for the <strong>history currently held by that server</strong>, not
          just the events in this browser's memory. The dashboard does not
          verify the server's response independently.
        </p>
        <h4>Crosswalks</h4>
        <ul>
          <li>
            <strong>NIST AI RMF · MEASURE 2.4</strong> — Monitoring the behavior
            of an AI system and its components in production. Some operational
            events can prompt a reviewer to inspect this outcome.
          </li>
          <li>
            <strong>NIST AI RMF · MEASURE 2.7</strong> — Evaluating and documenting
            AI system security and resilience. An attestation failure can
            prompt further investigation.
          </li>
          <li>
            <strong>NIST AI RMF · GOVERN 4.3</strong> — Practices enabling
            testing, incident identification, and information sharing.
            Correlation events are a review lead, not evidence of a complete process.
          </li>
        </ul>
        <p>
          These are review topics, not NIST conformance findings. See the{" "}
          <a href="https://airc.nist.gov/airmf-resources/airmf/5-sec-core/" target="_blank" rel="noreferrer">
            official NIST AI RMF Core
          </a>{" "}
          for the full outcomes.
        </p>
      </article>
    </motion.div>
  );
}

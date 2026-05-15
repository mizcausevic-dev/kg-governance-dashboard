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
          Walking the chain end-to-end and confirming every link holds is the
          canonical compliance answer to <em>"has anyone tampered with the
          governance log?"</em> If a single event was edited, deleted, or
          inserted after the fact, the very next event's <code>prev_hash</code>{" "}
          would no longer match and the walk would fail at exactly that
          position.
        </p>
        <p>
          This dashboard's <em>Verify</em> button delegates to{" "}
          <code>GET /verify</code> on the live audit-stream server — it answers
          for the <strong>full server-side history</strong>, not just the
          events that happened to be in this browser's memory.
        </p>
        <h4>Crosswalks</h4>
        <ul>
          <li>
            <strong>NIST AI RMF · MAP 2.2</strong> — AI system documentation.
            A tamper-evident log of every Decision Card drafted, every policy
            bundle deployed, every attestation verified <em>is</em> the
            documentation.
          </li>
          <li>
            <strong>NIST AI RMF · MEASURE 2.7</strong> — Operational measurement
            + monitoring. Chain integrity is the evidence that monitoring is
            real, not retrospective.
          </li>
          <li>
            <strong>NIST AI RMF · MANAGE 2.2</strong> — Response to detected
            issues. If the chain ever breaks, you have a real incident on your
            hands, not a paperwork gap.
          </li>
        </ul>
      </article>
    </motion.div>
  );
}

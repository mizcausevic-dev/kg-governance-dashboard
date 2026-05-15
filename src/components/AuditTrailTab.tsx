import { motion } from "motion/react";
import { Timeline } from "./Timeline";
import { VendorFilter } from "./VendorFilter";
import type { GovernanceEvent } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
  filter: string;
  onFilter: (next: string) => void;
}

/** Full-page audit trail: vendor filter rail + scrolling timeline. */
export function AuditTrailTab({ events, filter, onFilter }: Props) {
  return (
    <motion.div
      className="audit-trail-tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <aside className="audit-trail-rail">
        <VendorFilter value={filter} onChange={onFilter} />
        <div className="audit-trail-rail-note glass-card">
          <h4>How to read it</h4>
          <p>
            Newest at top. Severity tints the left border — <strong>emerald</strong> for healthy
            ops, <strong>amber</strong> for warnings, <strong>red</strong> for failures. Click any
            row's <code>payload</code> caret to inspect the full body. RMF chips link each
            governance moment to a NIST AI RMF subcategory.
          </p>
        </div>
      </aside>
      <section className="audit-trail-feed">
        <Timeline events={events} vendorFilter={filter} />
      </section>
    </motion.div>
  );
}

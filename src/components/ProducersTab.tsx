import { useMemo } from "react";
import { motion } from "motion/react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lookup } from "../lib/rmf-citations";
import { PRODUCERS } from "../lib/types";
import type { GovernanceEvent, Producer } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
}

const SEVERITY_FILL: Record<string, string> = {
  ok: "#34d399",
  info: "#818cf8",
  warn: "#fbbf24",
  error: "#f87171",
};

/**
 * Producers tab — one large card per producer, with full per-kind
 * breakdown (mini bar chart) + last-seen event preview.
 */
export function ProducersTab({ events }: Props) {
  return (
    <div className="producers-tab">
      {PRODUCERS.map((p, i) => (
        <motion.div
          key={p.source}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
        >
          <ProducerLargeCard producer={p} events={events} />
        </motion.div>
      ))}
    </div>
  );
}

function ProducerLargeCard({
  producer,
  events,
}: {
  producer: Producer;
  events: readonly GovernanceEvent[];
}) {
  const { perKind, total, last } = useMemo(() => {
    const counts = new Map<string, number>(producer.kinds.map((k) => [k, 0]));
    let t = 0;
    let l: GovernanceEvent | null = null;
    for (const e of events) {
      if (e.source !== producer.source) continue;
      t++;
      l = e;
      if (counts.has(e.kind)) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    }
    return {
      perKind: producer.kinds.map((k) => ({
        kind: k,
        count: counts.get(k) ?? 0,
        severity: lookup(k).severity,
      })),
      total: t,
      last: l,
    };
  }, [events, producer]);

  return (
    <article className={`producer-large lang-${producer.language.toLowerCase()}`}>
      <header className="producer-large-head">
        <div>
          <h3>{producer.display}</h3>
          <span className="producer-large-meta">
            {producer.language} · {producer.shape}
          </span>
        </div>
        <div className="producer-large-total">
          <span className="producer-large-total-value">{total.toLocaleString()}</span>
          <span className="producer-large-total-label">events</span>
        </div>
      </header>

      <div className="producer-large-chart">
        <ResponsiveContainer width="100%" height={80 + producer.kinds.length * 18}>
          <BarChart data={perKind} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="kind"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.6)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
              }}
              width={210}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                color: "#fff",
              }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={12}>
              {perKind.map((d) => (
                <Cell key={d.kind} fill={SEVERITY_FILL[d.severity] ?? SEVERITY_FILL.info} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {last && (
        <footer className={`producer-large-last sev-${lookup(last.kind).severity}`}>
          last: <code>{last.kind}</code> · #{last.event_id}
        </footer>
      )}
    </article>
  );
}

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import {
  eventsPerHour,
  kindDistribution,
} from "../lib/chart-utils";
import { lookup } from "../lib/rmf-citations";
import type { GovernanceEvent } from "../lib/types";

interface Props {
  events: readonly GovernanceEvent[];
}

const SEVERITY_FILL: Record<string, string> = {
  ok: "#34d399",
  info: "#818cf8",
  warn: "#fbbf24",
  error: "#f87171",
};

/** Overview tab: 4 KPI cards across the top + events/hour area chart +
 * top-10 kind distribution bar chart. */
export function OverviewTab({ events }: Props) {
  const kpis = useMemo(() => computeKpis(events), [events]);
  const hourly = useMemo(() => eventsPerHour(events, 24), [events]);
  const distribution = useMemo(() => kindDistribution(events, 10), [events]);

  return (
    <div className="overview">
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="kpi-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <div className="kpi-card-head">
              <span className="kpi-label">{kpi.label}</span>
              <kpi.Icon className={`kpi-icon ${kpi.tone}`} />
            </div>
            <div className="kpi-value">{kpi.value.toLocaleString()}</div>
            <div className="kpi-foot">{kpi.note}</div>
          </motion.div>
        ))}
      </div>

      <div className="chart-grid">
        <motion.div
          className="chart-panel chart-panel-wide"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <div className="chart-panel-head">
            <h3>Events per hour</h3>
            <span className="chart-panel-tag">24h · stacked by severity</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="g-ok" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_FILL.ok} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={SEVERITY_FILL.ok} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-info" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_FILL.info} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={SEVERITY_FILL.info} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-warn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_FILL.warn} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={SEVERITY_FILL.warn} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-error" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_FILL.error} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={SEVERITY_FILL.error} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={chartTick()} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={chartTick()} width={32} />
                <Tooltip contentStyle={tooltipStyle()} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                <Area type="monotone" stackId="1" dataKey="ok" stroke={SEVERITY_FILL.ok} fill="url(#g-ok)" />
                <Area type="monotone" stackId="1" dataKey="info" stroke={SEVERITY_FILL.info} fill="url(#g-info)" />
                <Area type="monotone" stackId="1" dataKey="warn" stroke={SEVERITY_FILL.warn} fill="url(#g-warn)" />
                <Area type="monotone" stackId="1" dataKey="error" stroke={SEVERITY_FILL.error} fill="url(#g-error)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="chart-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.3 }}
        >
          <div className="chart-panel-head">
            <h3>Top event kinds</h3>
            <span className="chart-panel-tag">all sources</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={chartTick()} />
                <YAxis
                  type="category"
                  dataKey="kind"
                  axisLine={false}
                  tickLine={false}
                  tick={chartTick()}
                  width={160}
                />
                <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distribution.map((d) => (
                    <Cell key={d.kind} fill={SEVERITY_FILL[d.severity] ?? SEVERITY_FILL.info} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface Kpi {
  label: string;
  value: number;
  note: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

function computeKpis(events: readonly GovernanceEvent[]): Kpi[] {
  let ok = 0;
  let warn = 0;
  let error = 0;
  let total = 0;
  for (const e of events) {
    total++;
    const sev = lookup(e.kind).severity;
    if (sev === "ok") ok++;
    else if (sev === "warn") warn++;
    else if (sev === "error") error++;
  }
  return [
    {
      label: "Total events",
      value: total,
      note: "in client memory · last 500",
      Icon: Activity,
      tone: "tone-info",
    },
    {
      label: "Healthy",
      value: ok,
      note: "ok-severity emissions",
      Icon: CheckCircle2,
      tone: "tone-ok",
    },
    {
      label: "Warnings",
      value: warn,
      note: "drift · burn · deny · breaker-open",
      Icon: AlertTriangle,
      tone: "tone-warn",
    },
    {
      label: "Errors",
      value: error,
      note: "*_failed · validity flipped",
      Icon: ShieldAlert,
      tone: "tone-error",
    },
  ];
}

function chartTick() {
  return {
    fill: "rgba(255,255,255,0.45)",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 10,
  } as const;
}

function tooltipStyle() {
  return {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    color: "#fff",
  } as const;
}

// Hint for the icon prop type — exports a tiny alias for the wide Recharts
// import gates above.
type IconType = typeof TrendingUp;
export const _IconType: IconType | null = null;

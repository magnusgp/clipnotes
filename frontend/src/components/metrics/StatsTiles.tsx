import { memo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "../Card";
import type { MetricsResponse } from "../../types/metrics";
import { fadeInUp, staggerContainer } from "../../utils/motion";

type StatDescriptor = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "warning";
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatLatency(valueMs: number): { display: string; tone: "default" | "warning" } {
  if (valueMs <= 0) {
    return { display: "0 ms", tone: "default" };
  }

  if (valueMs >= 1000) {
    const seconds = valueMs / 1000;
    return {
      display: `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`,
      tone: seconds >= 6 ? "warning" : "default",
    };
  }

  return { display: `${Math.round(valueMs)} ms`, tone: valueMs >= 800 ? "warning" : "default" };
}

interface StatsTilesProps {
  metrics: MetricsResponse;
}

export const StatsTiles = memo(function StatsTiles({ metrics }: StatsTilesProps) {
  const latency = formatLatency(metrics.avg_latency_ms);
  const errorRate = typeof metrics.error_rate === "number" ? metrics.error_rate : null;

  const stats: StatDescriptor[] = [
    {
      id: "requests",
      label: "Requests today",
      value: formatNumber(metrics.requests_today),
      helper: "API calls counted via middleware",
    },
    {
      id: "clips",
      label: "Clips analysed today",
      value: formatNumber(metrics.clips_today),
      helper: "Analyses completed in UTC",
    },
    {
      id: "total-clips",
      label: "Lifetime clips",
      value: formatNumber(metrics.total_clips),
      helper: "Unique uploads recorded",
    },
    {
      id: "total-analyses",
      label: "Lifetime analyses",
      value: formatNumber(metrics.total_analyses),
      helper: "Total analyses generated",
    },
    {
      id: "avg-latency",
      label: "Average latency",
      value: latency.display,
      helper: "Rolling window based on filter",
      tone: latency.tone,
    },
  ];

  const showErrorRate = errorRate !== null;

  return (
    <Card className="bg-surface-glass/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Usage snapshot</CardTitle>
        <p className="text-sm text-text-secondary/80">Aggregated in real time from API counters and analyses.</p>
      </CardHeader>
      <CardContent>
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {stats.map((stat) => (
            <motion.div key={stat.id} variants={fadeInUp} className="rounded-xl border border-border-glass/60 bg-surface-panel/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-secondary/70">{stat.label}</p>
              <p
                className={`mt-2 text-2xl font-semibold ${stat.tone === "warning" ? "text-amber-300" : "text-text-primary"}`}
              >
                {stat.value}
              </p>
              {stat.helper ? <p className="text-xs text-text-secondary/60">{stat.helper}</p> : null}
            </motion.div>
          ))}
          {showErrorRate ? (
            <motion.div variants={fadeInUp} className="rounded-xl border border-border-glass/60 bg-surface-panel/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-secondary/70">Error rate</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{(errorRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-text-secondary/60">Failures in window / total analyses</p>
            </motion.div>
          ) : null}
        </motion.div>
      </CardContent>
    </Card>
  );
});

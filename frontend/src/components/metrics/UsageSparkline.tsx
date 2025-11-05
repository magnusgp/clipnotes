import { memo, useMemo } from "react";
import { motion } from "framer-motion";

import type { MetricsDailyBucket, MetricsHourlyBucket } from "../../types/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "../Card";
import { fadeInUp } from "../../utils/motion";

interface UsageSparklineProps {
  hourly: MetricsHourlyBucket[];
  daily: MetricsDailyBucket[];
}

function useNormalizedSeries(series: MetricsHourlyBucket[]) {
  return useMemo(() => {
    if (!series.length) {
      return [];
    }
    const maxRequests = Math.max(...series.map((bucket) => bucket.requests), 1);
    return series.map((bucket) => ({
      hour: bucket.hour,
      requests: bucket.requests,
      height: Math.max(8, Math.round((bucket.requests / maxRequests) * 100)),
    }));
  }, [series]);
}

function useDailySummary(series: MetricsDailyBucket[]) {
  return useMemo(() => {
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-7);
  }, [series]);
}

export const UsageSparkline = memo(function UsageSparkline({ hourly, daily }: UsageSparklineProps) {
  const hourlySeries = useNormalizedSeries(hourly);
  const dailySeries = useDailySummary(daily);
  const hourlyLabel = hourlySeries.length ? `Last ${hourlySeries.length} hours` : "Hourly activity";

  return (
    <Card className="bg-surface-glass/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Traffic cadence</CardTitle>
        <p className="text-sm text-text-secondary/80">Rolling activity across the last few hours and days.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary/70">{hourlyLabel}</p>
          <div className="mt-3 flex h-28 items-end gap-2">
            {hourlySeries.length ? (
              hourlySeries.map((bucket) => (
                <motion.div
                  key={bucket.hour}
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  className="relative flex-1"
                >
                  <div
                    className="rounded-t-lg bg-gradient-to-t from-accent-primary/40 via-accent-primary/60 to-accent-primary/80"
                    style={{ height: `${bucket.height}%` }}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {new Date(bucket.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: {bucket.requests}
                    {" "}
                    requests
                  </span>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-text-secondary/70">No requests recorded in this window.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-glass/60 bg-surface-panel/60">
          <table className="min-w-full divide-y divide-border-glass/40 text-sm">
            <thead className="bg-surface-panel/80 text-left text-xs uppercase tracking-wide text-text-secondary/70">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Requests</th>
                <th className="px-4 py-2">Analyses</th>
              </tr>
            </thead>
            <tbody>
              {dailySeries.length ? (
                dailySeries.map((bucket) => (
                  <tr key={bucket.date} className="odd:bg-surface-panel/40">
                    <td className="px-4 py-2 text-text-primary">{new Date(bucket.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-text-secondary/80">{bucket.requests}</td>
                    <td className="px-4 py-2 text-text-secondary/80">{bucket.analyses}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-text-secondary/70">
                    No daily aggregates available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

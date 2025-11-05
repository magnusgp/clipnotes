import { useMemo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { StatsTiles } from "../components/metrics/StatsTiles";
import { UsageSparkline } from "../components/metrics/UsageSparkline";
import { useMetrics } from "../hooks/useMetrics";
import { isFeatureEnabled, useFeatureFlags } from "../flags";
import { fadeInUp } from "../utils/motion";

function LatencyWarning() {
  return (
    <Card className="border-amber-300/70 bg-amber-50/95 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-amber-800 dark:text-amber-100">Latency threshold exceeded</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-amber-800/90 dark:text-amber-100/85">
          Average response times are exceeding the configured warning threshold. Investigate Hafnia performance or
          reduce concurrent uploads to restore expected latency.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="bg-surface-glass/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Loading metrics…</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary/80">Fetching the latest usage snapshot from the API.</p>
      </CardContent>
    </Card>
  );
}

export default function Metrics() {
  const { flags, status: flagStatus } = useFeatureFlags();
  const graphEnabled = isFeatureEnabled(flags, "ENABLE_GRAPH_VIEW", true);

  const { data, isLoading, isError, error, refetch } = useMetrics({ enabled: graphEnabled });

  const generatedAt = useMemo(() => {
    if (!data) {
      return null;
    }
    return new Date(data.generated_at).toLocaleString();
  }, [data]);

  if (!graphEnabled && flagStatus === "ready") {
    return (
      <section className="space-y-6">
        <Card className="bg-surface-glass/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Metrics disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary/80">
              The metrics dashboard is hidden for this environment. Enable the <strong>ENABLE_GRAPH_VIEW</strong> flag in
              settings to surface usage analytics.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-6">
        <Card className="border-rose-400/40 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-rose-200">Unable to load metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-rose-100/90">{error?.message ?? "An unexpected error occurred."}</p>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="inline-flex items-center rounded-md bg-rose-500/80 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/80 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
            >
              Retry now
            </button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Usage &amp; Health</h1>
          <p className="text-sm text-text-secondary/80">
            Monitor request cadence, clip throughput, and latency warnings for demo readiness.
          </p>
          {generatedAt ? (
            <p className="text-xs text-text-secondary/70">Snapshot generated at {generatedAt}</p>
          ) : null}
        </div>
      </motion.div>

      {isLoading && !data ? <LoadingState /> : null}

      {data ? (
        <div className="space-y-8">
          {data.latency_flag ? <LatencyWarning /> : null}
          <StatsTiles metrics={data} />
          <UsageSparkline hourly={data.per_hour} daily={data.per_day} />
        </div>
      ) : null}
    </section>
  );
}

import { useMemo } from "react";
import { useParams } from "react-router-dom";

import InsightSummaryCard from "../components/insights/InsightSummaryCard";
import InsightTrendChart from "../components/insights/InsightTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useInsightShare } from "../hooks/useInsightShare";
import type { InsightWindow } from "../types/insights";

function describeWindow(window: InsightWindow) {
  return window === "7d" ? "Last 7 days" : "Last 24 hours";
}

export default function InsightsShare() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const {
    data,
    status,
    error,
    isLoading,
    isError,
    refetch,
  } = useInsightShare({ token, enabled: Boolean(token) });

  const headline = useMemo(() => {
    if (!data) {
      return "Shared insight snapshot";
    }
    return `${describeWindow(data.window)} insight snapshot`;
  }, [data]);

  if (!token) {
    return (
      <section className="space-y-6">
  <Card interactive={false} className="border-rose-400/40 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-rose-400">Missing share token</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-rose-400/90">
            <p>The link you followed does not include a share token. Please request a new link from the ClipNotes team.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">{headline}</h1>
        <p className="text-sm text-text-secondary/80">
          Read-only view of the ClipNotes Insight Layer. Data refreshes automatically based on the cache policy.
        </p>
      </header>

      {isError && !data ? (
        <Card interactive={false} className="border-rose-400/40 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-rose-400">Unable to load insight snapshot</CardTitle>
          </CardHeader> 
          <CardContent className="space-y-3 text-sm text-rose-400/90">
            <p>{error?.message ?? "An unexpected error occurred while loading the insight snapshot."}</p>
            <button
              type="button"
              onClick={() => {
                void refetch(token);
              }}
              className="inline-flex items-center rounded-md bg-rose-500/80 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/80 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
            >
              Retry now
            </button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <Card interactive={false} className="bg-surface-glass/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Loading shared insight snapshot...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary/80">
              Fetching the latest cached insight snapshot. Hang tight for the summary and chart data.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)]">
          <InsightSummaryCard
            summary={data.summary}
            summarySource={data.summary_source}
            generatedAt={data.generated_at}
            cacheExpiresAt={data.cache_expires_at}
            severityTotals={data.severity_totals}
            topLabels={data.top_labels}
            delta={data.delta}
            window={data.window}
            isLoading={status === "loading"}
          />
          <InsightTrendChart window={data.window} series={data.series} isLoading={status === "loading"} />
        </div>
      ) : null}
    </section>
  );
}

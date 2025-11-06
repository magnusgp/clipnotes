import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";

import InsightSummaryCard from "../components/insights/InsightSummaryCard";
import InsightTrendChart from "../components/insights/InsightTrendChart";
import InsightsToolbar from "../components/insights/InsightsToolbar";
import ShareBanner from "../components/insights/ShareBanner";
import InsightsReportDialog from "../components/insights/InsightsReportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useInsights } from "../hooks/useInsights";
import { useInsightShare } from "../hooks/useInsightShare";
import { useToast } from "../components/toast/ToastProvider";
import type { InsightShareResponse, InsightWindow } from "../types/insights";
import { fadeInUp } from "../utils/motion";

function describeWindow(window: InsightWindow) {
  return window === "7d" ? "Last 7 days" : "Last 24 hours";
}

export default function Insights() {
  const { push } = useToast();
  const [share, setShare] = useState<InsightShareResponse | null>(null);
  const {
    window: activeWindow,
    data,
    isLoading,
    isError,
    error,
    isRegenerating,
    setWindow,
    regenerate,
    refetch,
  } = useInsights();
  const { createShare, isCreating: isCreatingShare } = useInsightShare();

  const handleRegenerate = useCallback(async () => {
    try {
      const payload = await regenerate();
      if (!payload) {
        return;
      }
      const windowLabel = describeWindow(payload.window);
      push({
        title: "Insights updated",
        description: `${windowLabel} snapshot refreshed.`,
        variant: "success",
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to regenerate insights.";
      push({
        title: "Refresh failed",
        description: message,
        variant: "error",
      });
    }
  }, [regenerate, push]);

  const handleCreateShare = useCallback(
    async (windowParam: InsightWindow) => {
      try {
        const response = await createShare(windowParam);
        setShare(response);
        push({
          title: "Share link generated",
          description: "Copy the link and share it with stakeholders.",
          variant: "success",
        });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Unable to generate share link.";
        push({
          title: "Share link failed",
          description: message,
          variant: "error",
        });
      }
    },
    [createShare, push],
  );

  const isInitialLoading = isLoading && !data;
  const isRefreshing = (isLoading && Boolean(data)) || isRegenerating;
  const windowDescription = useMemo(() => describeWindow(activeWindow), [activeWindow]);

  return (
    <section className="space-y-8">
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-text-primary">Insights</h1>
          <p className="text-sm text-text-secondary/80">
            Review aggregated clip activity, severity mix, and narrative highlights for quicker escalation decisions.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary/70">
            <span>Active window: {windowDescription}</span>
            {isRefreshing ? <span>Updating snapshot...</span> : null}
            {isError && data ? <span>Showing cached snapshot due to refresh error.</span> : null}
          </div>
        </div>
      </motion.div>

      <InsightsToolbar
        window={activeWindow}
        onWindowChange={setWindow}
        onRegenerate={handleRegenerate}
        isLoading={isLoading}
        isRegenerating={isRegenerating}
        generatedAt={data?.generated_at ?? null}
        cacheExpiresAt={data?.cache_expires_at ?? null}
      />

      <ShareBanner
        window={activeWindow}
        share={share}
        isCreating={isCreatingShare}
        onCreateShare={handleCreateShare}
      />

      <InsightsReportDialog insight={data ?? null} isLoading={isInitialLoading || isRefreshing} />

      {isError && !data ? (
        <Card className="border-rose-400/40 bg-rose-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-rose-400">Unable to load insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-rose-400/90">
            <p>{error?.message ?? "An unexpected error occurred while fetching the insight snapshot."}</p>
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
      ) : null}

      {isInitialLoading ? (
        <Card className="bg-surface-glass/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Loading insight snapshot...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary/80">
              Fetching aggregated clip data and summary. Cached responses will display instantly on subsequent visits.
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
            isLoading={isRefreshing}
          />
          <InsightTrendChart window={data.window} series={data.series} isLoading={isRefreshing} />
        </div>
      ) : null}
    </section>
  );
}

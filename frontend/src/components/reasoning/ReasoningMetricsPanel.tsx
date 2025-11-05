import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Card";
import AutoCharts from "./AutoCharts";
import GraphVisualizer from "./GraphVisualizer";
import type { ClipListItem } from "../../hooks/useClips";
import { useReasoningMetrics } from "../../hooks/useReasoningMetrics";
import { cn } from "../../utils/cn";

interface ReasoningMetricsPanelProps {
  clips: ClipListItem[];
  isRefreshing: boolean;
  onRefreshClips: () => void | Promise<void>;
  error?: string;
  className?: string;
}

function ReasoningMetricsPanel({ clips, isRefreshing, onRefreshClips, error, className }: ReasoningMetricsPanelProps) {
  const analyzedClips = useMemo<ClipListItem[]>(
    () => clips.filter((clip) => clip.status === "ready" || clip.status === "completed"),
    [clips],
  );
  const [metricsClipId, setMetricsClipId] = useState<string>(() => analyzedClips[0]?.clip_id ?? "");

  useEffect(() => {
    if (analyzedClips.length === 0) {
      setMetricsClipId("");
      return;
    }

    const exists = analyzedClips.some((clip) => clip.clip_id === metricsClipId);
    if (!exists) {
      setMetricsClipId(analyzedClips[0]?.clip_id ?? "");
    }
  }, [analyzedClips, metricsClipId]);

  const {
    data: metricsData,
    error: metricsQueryError,
    isLoading,
    isFetching,
    refetch,
  } = useReasoningMetrics(metricsClipId);

  const metricsError = metricsQueryError?.message ?? null;
  const analyzedCount = analyzedClips.length;
  const isBusy = isRefreshing || isLoading || isFetching;

  return (
    <Card interactive={false} surface="glass" className={cn("space-y-0", className)}>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-primary/80">Metrics &amp; Graphs</p>
            <CardTitle className="text-2xl">Visualize clip insights</CardTitle>
            <CardDescription className="text-base text-text-secondary/90">
              Review chart summaries and interaction graphs derived from the latest analysis run for each clip.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 text-sm lg:w-72">
            <label className="font-semibold text-text-secondary" htmlFor="metrics-clip-select">
              Choose a clip
            </label>
            <select
              id="metrics-clip-select"
              className="rounded-lg border border-border-glass/75 bg-surface-glass/70 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={metricsClipId}
              onChange={(event) => setMetricsClipId(event.target.value)}
              disabled={analyzedClips.length === 0}
            >
              <option value="" disabled={analyzedClips.length > 0}>
                {analyzedClips.length > 0 ? "Select a clip" : "No analyzed clips available"}
              </option>
              {analyzedClips.map((clip) => (
                <option key={clip.clip_id} value={clip.clip_id}>
                  {clip.filename}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-border-glass/80 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-accent-primary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 focus:ring-offset-surface-glass"
              onClick={() => {
                void onRefreshClips();
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing clips…" : "Refresh clips"}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary/70">
          {analyzedCount
            ? `Showing metrics for ${analyzedCount} analyzed clip${analyzedCount === 1 ? "" : "s"}.`
            : "Run an analysis to unlock clip metrics."}
        </p>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {analyzedClips.length === 0 ? (
          <p className="text-sm text-text-secondary/75">
            Metrics become available once a clip analysis is complete. Upload and process a clip to see trends and relationships here.
          </p>
        ) : (
          <div className="space-y-4">
            {isBusy ? (
              <p className="text-sm text-text-secondary/70" role="status">
                Loading metrics…
              </p>
            ) : null}

            {metricsError ? (
              <div className="space-y-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 dark:bg-rose-500/15">
                <p className="text-sm text-rose-600 dark:text-rose-200" role="alert">
                  {metricsError}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-rose-400/70 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/20"
                    onClick={() => {
                      void refetch();
                    }}
                  >
                    Try again
                  </button>
                  <span className="text-xs text-text-secondary/70">
                    If the issue persists, refresh clips to ensure the latest analysis is available.
                  </span>
                </div>
              </div>
            ) : null}

            {metricsData ? (
              <div className="space-y-6">
                <AutoCharts metrics={metricsData} />
                <GraphVisualizer graph={metricsData.object_graph} />
              </div>
            ) : (
              <p className="text-sm text-text-secondary/75">
                Select a clip to load its latest metrics and object graph.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReasoningMetricsPanel;

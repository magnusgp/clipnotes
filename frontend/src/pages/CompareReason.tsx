import { useEffect, useMemo, useState } from "react";

import AutoCharts from "../components/reasoning/AutoCharts";
import CompareForm from "../components/reasoning/CompareForm";
import GraphVisualizer from "../components/reasoning/GraphVisualizer";
import type { ClipListItem } from "../hooks/useClips";
import { useReasoningMetrics } from "../hooks/useReasoningMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";

export interface CompareReasonProps {
  clips: ClipListItem[];
  onRefreshClips: () => void | Promise<void>;
  isRefreshing: boolean;
  error?: string;
}

function CompareReason({ clips, onRefreshClips, isRefreshing, error }: CompareReasonProps) {
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
    isLoading: isMetricsLoading,
    isFetching: isMetricsFetching,
    refetch: refetchMetrics,
  } = useReasoningMetrics(metricsClipId);
  const metricsError = metricsQueryError?.message ?? null;

  const analyzedCount = analyzedClips.length;

  return (
    <section className="space-y-8">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Compare &amp; Reason</p>
              <CardTitle className="text-3xl">Ask comparative questions across clips</CardTitle>
              <CardDescription className="max-w-2xl text-base text-text-secondary/90">
                Pick two analyzed clips, pose a question, and review the answer with evidence overlays and metrics.
              </CardDescription>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/25 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void onRefreshClips();
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh clips"}
            </button>
          </div>
          <p className="text-xs text-text-secondary/70">
            {analyzedCount >= 2
              ? `Ready to compare ${analyzedCount} analyzed clip${analyzedCount === 1 ? "" : "s"}.`
              : "Need at least two completed analyses before you can run a comparison."}
          </p>
          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <CompareForm clips={clips} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Metrics &amp; Graphs</p>
              <CardTitle className="text-2xl">Visualize clip insights</CardTitle>
              <CardDescription className="text-base text-text-secondary/90">
                Review chart summaries and interaction graphs derived from the latest analysis of each clip.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 text-sm md:w-72">
              <label className="font-semibold text-text-secondary" htmlFor="metrics-clip-select">
                Choose a clip
              </label>
              <select
                id="metrics-clip-select"
                className="rounded-lg border border-border-glass bg-surface-canvas/60 px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {analyzedClips.length === 0 ? (
            <p className="text-sm text-text-secondary/70">
              Metrics become available after an analysis finishes. Trigger analysis for at least one clip to unlock this section.
            </p>
          ) : (
            <div className="space-y-4">
              {isMetricsLoading || isMetricsFetching ? (
                <p className="text-sm text-text-secondary/70" role="status">
                  Loading metrics…
                </p>
              ) : null}

              {metricsError ? (
                <div className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4">
                  <p className="text-sm text-rose-200" role="alert">
                    {metricsError}
                  </p>
                  <button
                    type="button"
                    className="inline-flex w-fit items-center justify-center rounded-full border border-rose-400/70 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                    onClick={() => {
                      void refetchMetrics();
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {metricsData ? (
                <div className="space-y-6">
                  <AutoCharts metrics={metricsData} />
                  <GraphVisualizer graph={metricsData.object_graph} />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default CompareReason;

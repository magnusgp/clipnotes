import { useEffect, useMemo, useState } from "react";

import AutoCharts from "../components/reasoning/AutoCharts";
import CompareForm from "../components/reasoning/CompareForm";
import GraphVisualizer from "../components/reasoning/GraphVisualizer";
import type { ClipListItem } from "../hooks/useClips";
import { useReasoningMetrics } from "../hooks/useReasoningMetrics";

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
    <section className="space-y-6">
      <header className="space-y-3 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 shadow-xl shadow-emerald-900/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wide text-emerald-400">Compare &amp; Reason</p>
            <h1 className="text-3xl font-semibold text-slate-100">Ask comparative questions across clips</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Pick two analyzed clips, pose a question, and review the answer with evidence overlays and metrics.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            onClick={() => {
              void onRefreshClips();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing…" : "Refresh clips"}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {analyzedCount >= 2
            ? `Ready to compare ${analyzedCount} analyzed clip${analyzedCount === 1 ? "" : "s"}.`
            : "Need at least two completed analyses before you can run a comparison."}
        </p>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </header>

      <CompareForm clips={clips} />

      <section className="space-y-4 rounded-3xl border border-slate-800/60 bg-slate-900/40 p-6 shadow">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Metrics &amp; Graphs</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Visualize clip insights</h2>
              <p className="text-sm text-slate-300">
                Review chart summaries and interaction graphs derived from the latest analysis of each clip.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-200 md:w-72">
              <label className="font-medium" htmlFor="metrics-clip-select">
                Choose a clip
              </label>
              <select
                id="metrics-clip-select"
                className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
        </header>

        {analyzedClips.length === 0 ? (
          <p className="text-sm text-slate-400">
            Metrics become available after an analysis finishes. Trigger analysis for at least one clip to unlock this section.
          </p>
        ) : (
          <div className="space-y-4">
            {isMetricsLoading || isMetricsFetching ? (
              <p className="text-sm text-slate-400" role="status">
                Loading metrics…
              </p>
            ) : null}

            {metricsError ? (
              <div className="space-y-2 rounded-lg border border-rose-900/60 bg-rose-900/20 p-4">
                <p className="text-sm text-rose-200" role="alert">
                  {metricsError}
                </p>
                <button
                  type="button"
                  className="inline-flex w-fit items-center justify-center rounded-md border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 focus:ring-offset-slate-950"
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
      </section>
    </section>
  );
}

export default CompareReason;

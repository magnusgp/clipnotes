import { useMemo } from "react";

import CompareForm from "../components/reasoning/CompareForm";
import type { ClipListItem } from "../hooks/useClips";
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
    </section>
  );
}

export default CompareReason;

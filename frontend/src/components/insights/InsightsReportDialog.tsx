import { useMemo, useState } from "react";

import type { InsightResponse } from "../../types/insights";
import { useToast } from "../toast/ToastProvider";
import { cn } from "../../utils/cn";
import { formatTimestampLabel, openInsightReportWindow } from "../../utils/insightsReport";

interface InsightsReportDialogProps {
  insight: InsightResponse | null;
  isLoading: boolean;
}

function buildSummaryPreview(summary: string | undefined): string {
  if (!summary) {
    return "Snapshot summary unavailable.";
  }
  if (summary.length <= 120) {
    return summary;
  }
  return `${summary.slice(0, 117)}...`;
}

function buildTopFocusLabel(insight: InsightResponse | null): string {
  if (!insight?.top_labels?.length) {
    return "No high-signal labels captured yet.";
  }
  const topLabel = insight.top_labels[0];
  const severity = topLabel.avg_severity !== null && topLabel.avg_severity !== undefined
    ? `avg severity ${topLabel.avg_severity.toFixed(1)}`
    : "severity pending";
  return `${topLabel.label} (${topLabel.count} mentions, ${severity})`;
}

export function InsightsReportDialog({ insight, isLoading }: InsightsReportDialogProps) {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const summaryPreview = useMemo(() => buildSummaryPreview(insight?.summary), [insight?.summary]);
  const generatedLabel = useMemo(() => formatTimestampLabel(insight?.generated_at), [insight?.generated_at]);
  const cacheRefreshLabel = useMemo(() => formatTimestampLabel(insight?.cache_expires_at), [insight?.cache_expires_at]);
  const focusPreview = useMemo(() => buildTopFocusLabel(insight), [insight]);
  const isDisabled = isLoading || !insight || isExporting;

  return (
    <section className="rounded-3xl border border-border-glass/70 bg-surface-glass/80 p-6 shadow-glass">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-primary/75">Stakeholder report</p>
            <h2 className="text-xl font-semibold text-text-primary">Download printable insight summary</h2>
            <p className="text-sm leading-6 text-text-secondary/80">
              Open a dedicated report view optimised for printing or PDF export so you can brief stakeholders without navigating the dashboard.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs text-text-secondary/70 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-glass/60 bg-surface-panel/60 p-3">
              <dt className="font-semibold uppercase tracking-[0.12em] text-text-secondary/60">Generated</dt>
              <dd className="mt-1 text-sm text-text-primary/85">{generatedLabel ?? "Pending"}</dd>
            </div>
            <div className="rounded-2xl border border-border-glass/60 bg-surface-panel/60 p-3">
              <dt className="font-semibold uppercase tracking-[0.12em] text-text-secondary/60">Cache refresh</dt>
              <dd className="mt-1 text-sm text-text-primary/85">{cacheRefreshLabel ?? "Refresh scheduled"}</dd>
            </div>
            <div className="rounded-2xl border border-border-glass/60 bg-surface-panel/60 p-3">
              <dt className="font-semibold uppercase tracking-[0.12em] text-text-secondary/60">Top focus</dt>
              <dd className="mt-1 text-sm text-text-primary/85">{focusPreview}</dd>
            </div>
          </dl>
          <div className="rounded-2xl border border-border-glass/70 bg-surface-panel/70 p-4 text-sm text-text-secondary/80">
            <p className="font-semibold text-text-primary/90">Summary preview</p>
            <p className="mt-2 leading-6">{summaryPreview}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[22rem]">
          <button
            type="button"
            onClick={() => {
              if (!insight || isDisabled) {
                return;
              }
              setIsExporting(true);
              try {
                openInsightReportWindow(insight);
                toast.push({
                  title: "Report ready",
                  description: "A new browser tab just opened with the stakeholder report.",
                  variant: "success",
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Unable to open report window.";
                toast.push({
                  title: "Export failed",
                  description: message,
                  variant: "error",
                });
              } finally {
                setIsExporting(false);
              }
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-accent-primary/40 px-5 py-2.5 text-sm font-semibold transition",
              isDisabled
                ? "bg-accent-primary/15 text-accent-primary/60"
                : "bg-accent-primary/25 text-accent-primary hover:bg-accent-primary/35",
            )}
            disabled={isDisabled}
          >
            {isExporting ? "Preparing report..." : "Download stakeholder report"}
          </button>
          <p className="text-xs leading-5 text-text-secondary/70">
            The report opens in a new browser tab. Use your browser print dialog to save it as PDF or send it to stakeholders.
          </p>
        </div>
      </div>
    </section>
  );
}

export default InsightsReportDialog;

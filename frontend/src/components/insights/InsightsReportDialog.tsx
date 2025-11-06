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
    <section className="rounded-2xl border border-border-glass/60 bg-surface-panel/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-text-secondary/70">Stakeholder report</p>
          <h2 className="text-lg font-semibold text-text-primary">Download printable insight summary</h2>
          <p className="text-sm text-text-secondary/80">
            Open a dedicated report window optimised for printing or PDF export so you can brief stakeholders without dashboard access.
          </p>
          <dl className="grid grid-cols-1 gap-2 text-xs text-text-secondary/70 sm:grid-cols-2">
            <div>
              <dt className="font-semibold uppercase tracking-[0.12em] text-text-secondary/60">Generated</dt>
              <dd>{generatedLabel ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-[0.12em] text-text-secondary/60">Cache refresh</dt>
              <dd>{cacheRefreshLabel ?? "Refresh scheduled"}</dd>
            </div>
          </dl>
          <div className="rounded-xl border border-border-glass/50 bg-surface-glass/40 p-3 text-sm text-text-secondary/80">
            <p className="font-semibold text-text-primary/90">Summary preview</p>
            <p>{summaryPreview}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-secondary/60">Top focus</p>
            <p className="text-sm">{focusPreview}</p>
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
              "inline-flex items-center justify-center rounded-full border border-border-glass/70 px-4 py-2 text-sm font-semibold transition",
              "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30",
              isDisabled && "opacity-70",
            )}
            disabled={isDisabled}
          >
            {isExporting ? "Preparing report..." : "Download stakeholder report"}
          </button>
          <p className="text-xs text-text-secondary/70">
            The report opens in a new browser tab. Use your browser print dialog to save it as PDF or send it to stakeholders.
          </p>
        </div>
      </div>
    </section>
  );
}

export default InsightsReportDialog;

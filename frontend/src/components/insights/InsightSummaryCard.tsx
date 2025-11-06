import { memo, useMemo } from "react";
import clsx from "clsx";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../Card";
import type { InsightSeverityTotals, InsightTopLabel, InsightWindow } from "../../types/insights";

interface InsightSummaryCardProps {
  summary: string | null;
  summarySource: "hafnia" | "fallback";
  generatedAt: string | null;
  cacheExpiresAt?: string | null;
  severityTotals: InsightSeverityTotals;
  topLabels: InsightTopLabel[];
  delta?: Record<string, number> | null;
  window: InsightWindow;
  isLoading?: boolean;
}

type SeverityKey = keyof InsightSeverityTotals;

type DeltaKey = "analyses" | "high_severity";

const SEVERITY_ORDER: SeverityKey[] = ["high", "medium", "low"];

const WINDOW_COPY: Record<InsightWindow, { title: string; description: string }> = {
  "24h": {
    title: "Last 24 hours",
    description: "Hourly activity across the most recent day.",
  },
  "7d": {
    title: "Last 7 days",
    description: "Daily insight mix across the past week.",
  },
};

const SEVERITY_CARD_CLASSES: Record<SeverityKey, string> = {
  high: "border-rose-500/45 bg-rose-500/15 text-rose-600 dark:text-rose-100",
  medium: "border-amber-400/45 bg-amber-400/15 text-amber-600 dark:text-amber-100",
  low: "border-emerald-400/50 bg-emerald-400/15 text-emerald-600 dark:text-emerald-100",
};

const SEVERITY_LABELS: Record<SeverityKey, string> = {
  high: "High severity moments",
  medium: "Medium severity moments",
  low: "Low severity moments",
};

const SEVERITY_DOT_CLASSES: Record<SeverityKey, string> = {
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

const MIXED_DOT_CLASS = "bg-accent-primary/60";

const SOURCE_LABELS: Record<"hafnia" | "fallback", string> = {
  hafnia: "Hafnia narrative",
  fallback: "Fallback summary",
};

const SOURCE_CLASSES: Record<"hafnia" | "fallback", string> = {
  hafnia: "bg-accent-primary/15 text-accent-primary",
  fallback: "bg-surface-panel/70 text-text-secondary",
};

const DELTA_LABELS: Record<DeltaKey, string> = {
  analyses: "Analyses vs prior window",
  high_severity: "High-severity analyses vs prior",
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function parseSummary(summary: string | null) {
  if (!summary) {
    return [] as string[];
  }
  return summary
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function pickTopLabels(labels: InsightTopLabel[]) {
  return labels.slice(0, 5);
}

function describeAverageSeverity(value: number | null) {
  if (value == null) {
    return "Mixed";
  }
  if (value < 0.5) {
    return "Mostly low";
  }
  if (value < 1.5) {
    return "Mostly medium";
  }
  return "Mostly high";
}

function formatDeltaValue(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return `${value}`;
}

function deltaClassName(value: number) {
  if (value > 0) {
    return "text-emerald-400";
  }
  if (value < 0) {
    return "text-rose-400";
  }
  return "text-text-secondary";
}

function resolveDotClass(avg: number | null) {
  if (avg == null) {
    return MIXED_DOT_CLASS;
  }
  if (avg < 0.5) {
    return SEVERITY_DOT_CLASSES.low;
  }
  if (avg < 1.5) {
    return SEVERITY_DOT_CLASSES.medium;
  }
  return SEVERITY_DOT_CLASSES.high;
}

export const InsightSummaryCard = memo(function InsightSummaryCard({
  summary,
  summarySource,
  generatedAt,
  cacheExpiresAt,
  severityTotals,
  topLabels,
  delta,
  window,
  isLoading = false,
}: InsightSummaryCardProps) {
  const summaryParagraphs = useMemo(() => parseSummary(summary), [summary]);
  const generatedAtLabel = useMemo(() => formatTimestamp(generatedAt), [generatedAt]);
  const cacheExpiresLabel = useMemo(() => formatTimestamp(cacheExpiresAt), [cacheExpiresAt]);
  const selectedLabels = useMemo(() => pickTopLabels(topLabels), [topLabels]);
  const windowCopy = WINDOW_COPY[window];

  const severityEntries = useMemo(
    () =>
      SEVERITY_ORDER.map((key) => ({
        key,
        label: SEVERITY_LABELS[key],
        value: severityTotals[key],
      })),
    [severityTotals],
  );

  const deltaEntries = useMemo(() => {
    if (!delta) {
      return [] as Array<{ key: DeltaKey; value: number }>;
    }
    return (Object.keys(DELTA_LABELS) as DeltaKey[])
      .filter((key) => typeof delta[key] === "number")
      .map((key) => ({ key, value: Number(delta[key]) }));
  }, [delta]);

  return (
    <Card interactive={false} surface="glass">
      <CardHeader className="gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-text-secondary/70">Narrative summary</p>
          <CardTitle className="text-2xl">{windowCopy.title}</CardTitle>
          <CardDescription className="text-sm text-text-secondary/85">{windowCopy.description}</CardDescription>
        </div>
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
            SOURCE_CLASSES[summarySource],
          )}
        >
          {SOURCE_LABELS[summarySource]}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && !summaryParagraphs.length ? (
          <p className="text-sm text-text-secondary/75">Loading summary…</p>
        ) : null}

        {!isLoading && !summaryParagraphs.length ? (
          <p className="text-sm text-text-secondary/80">
            No summary ready for this window yet. The deterministic fallback will appear once analytics complete.
          </p>
        ) : null}

        {summaryParagraphs.length ? (
          <div className="space-y-3 text-sm text-text-secondary/90">
            {summaryParagraphs.map((paragraph, index) => (
              <p key={`summary-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {severityEntries.map((entry) => (
            <div
              key={entry.key}
              className={clsx(
                "rounded-xl border px-4 py-3 text-sm shadow-inner",
                SEVERITY_CARD_CLASSES[entry.key],
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-inherit">{entry.label}</span>
                <span className="text-lg font-semibold text-inherit">{entry.value}</span>
              </div>
            </div>
          ))}
        </div>

        {deltaEntries.length ? (
          <div className="rounded-2xl border border-border-glass/60 bg-surface-glass/60 p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary/70">Period deltas</h3>
            <ul className="mt-2 space-y-1">
              {deltaEntries.map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-4">
                  <span className="text-text-secondary/85">{DELTA_LABELS[entry.key]}</span>
                  <span className={clsx("font-semibold", deltaClassName(entry.value))}>{formatDeltaValue(entry.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {selectedLabels.length ? (
          <div className="rounded-2xl border border-border-glass/60 bg-surface-panel/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary/70">Top labels</h3>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary/85">
              {selectedLabels.map((label) => (
                <li key={label.label} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary">{label.label}</span>
                    <span className="text-xs text-text-secondary/70">{describeAverageSeverity(label.avg_severity)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx("h-2.5 w-2.5 rounded-full", resolveDotClass(label.avg_severity))}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-text-primary">{label.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-xs text-text-secondary/70 sm:flex-row sm:items-center sm:justify-between">
        {generatedAtLabel ? <span>Generated at {generatedAtLabel}</span> : <span>Awaiting first snapshot…</span>}
        {cacheExpiresLabel ? <span>Cache expires at {cacheExpiresLabel}</span> : null}
      </CardFooter>
    </Card>
  );
});

export default InsightSummaryCard;

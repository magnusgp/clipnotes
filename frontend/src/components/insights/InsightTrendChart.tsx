import { memo, useId, useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Card";
import type { InsightSeriesBucket, InsightSeverityTotals, InsightWindow } from "../../types/insights";
import { useTheme } from "../../theme/ThemeProvider";
import { gentleSpring } from "../../utils/motion";

type SeverityKey = keyof InsightSeverityTotals;

interface InsightTrendChartProps {
  window: InsightWindow;
  series: InsightSeriesBucket[];
  isLoading?: boolean;
}

interface NormalizedBucket {
  id: string;
  label: string;
  tick: string;
  total: number;
  segments: Array<{
    severity: SeverityKey;
    value: number;
    height: number;
  }>;
}

const WINDOW_DESCRIPTIONS: Record<InsightWindow, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
};

const SEVERITY_ORDER: SeverityKey[] = ["low", "medium", "high"];

const SEVERITY_LABELS: Record<SeverityKey, string> = {
  low: "Low severity",
  medium: "Medium severity",
  high: "High severity",
};

const SEVERITY_CLASSES: Record<SeverityKey, string> = {
  low: "bg-emerald-400/80",
  medium: "bg-amber-400/80",
  high: "bg-rose-500/80",
};

const SEVERITY_DOT_CLASSES: Record<SeverityKey, string> = {
  low: "bg-emerald-400/80",
  medium: "bg-amber-400/80",
  high: "bg-rose-400/80",
};

function formatBucketLabel(bucketStart: string, window: InsightWindow) {
  const date = new Date(bucketStart);
  if (Number.isNaN(date.getTime())) {
    return "Unknown bucket";
  }
  if (window === "24h") {
    return date.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatBucketTick(bucketStart: string, window: InsightWindow) {
  const date = new Date(bucketStart);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  if (window === "24h") {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatBucketDescription(bucket: InsightSeriesBucket, window: InsightWindow) {
  const label = formatBucketLabel(bucket.bucket_start, window);
  const { total, severity } = bucket;
  const parts = [
    `${label}: ${total} analysis${total === 1 ? "" : "es"}`,
    `high ${severity.high}`,
    `medium ${severity.medium}`,
    `low ${severity.low}`,
  ];
  return parts.join(", ");
}

function shouldShowTick(index: number, total: number) {
  if (total <= 8) {
    return true;
  }
  const step = Math.ceil(total / 6);
  return index % step === 0 || index === total - 1;
}

function useNormalizedSeries(series: InsightSeriesBucket[], window: InsightWindow): NormalizedBucket[] {
  return useMemo(() => {
    if (!series.length) {
      return [];
    }
    const maxTotal = Math.max(...series.map((bucket) => bucket.total), 1);

    return series.map((bucket) => {
      const id = bucket.bucket_start;
      const label = formatBucketLabel(bucket.bucket_start, window);
      const tick = formatBucketTick(bucket.bucket_start, window);

      const segments = SEVERITY_ORDER.map((severity) => {
        const value = bucket.severity[severity];
        const height = maxTotal > 0 ? (value / maxTotal) * 100 : 0;
        return { severity, value, height };
      });

      return {
        id,
        label,
        tick,
        total: bucket.total,
        segments,
      } satisfies NormalizedBucket;
    });
  }, [series, window]);
}

export const InsightTrendChart = memo(function InsightTrendChart({ window, series, isLoading = false }: InsightTrendChartProps) {
  const normalized = useNormalizedSeries(series, window);
  const chartDescriptionId = useId();
  const { prefersReducedMotion } = useTheme();

  return (
    <Card interactive={false} surface="glass">
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-text-secondary/70">Trend chart</p>
          <CardTitle className="text-2xl">Timeline overview</CardTitle>
          <CardDescription className="text-sm text-text-secondary/85">
            Severity mix across the {WINDOW_DESCRIPTIONS[window]}.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading && !normalized.length ? (
          <p className="text-sm text-text-secondary/75">Loading insight histogram…</p>
        ) : null}

        {!isLoading && !normalized.length ? (
          <p className="text-sm text-text-secondary/80">
            No chart data available for this window yet. Once clips are analyzed, the stacked chart will reflect their
            severity mix.
          </p>
        ) : null}

        {normalized.length ? (
          <div className="space-y-4">
            <div
              role="img"
              aria-label={`Stacked bar chart showing severity counts over the ${WINDOW_DESCRIPTIONS[window]}`}
              aria-describedby={chartDescriptionId}
              className="flex h-56 items-end gap-2 rounded-2xl border border-border-glass/60 bg-surface-glass/50 px-4 py-5"
            >
              {normalized.map((bucket, index) => {
                const bucketTitle = `${bucket.label} — ${bucket.total} analysis${bucket.total === 1 ? "" : "es"}`;
                return (
                  <div
                    key={bucket.id}
                    className="flex h-full flex-1 flex-col justify-end gap-[2px]"
                    title={bucketTitle}
                  >
                    <span className="sr-only">{formatBucketDescription(series[index], window)}</span>
                    {bucket.segments.map((segment) => {
                      if (segment.value === 0) {
                        return null;
                      }
                      const motionProps = prefersReducedMotion
                        ? {}
                        : {
                            initial: { scaleY: 0 },
                            animate: {
                              scaleY: 1,
                              transition: gentleSpring,
                            },
                          };
                      return (
                        <motion.div
                          key={`${bucket.id}-${segment.severity}`}
                          className={clsx(
                            "w-full origin-bottom rounded-md",
                            SEVERITY_CLASSES[segment.severity],
                          )}
                          style={{ height: `${segment.height}%` }}
                          {...motionProps}
                        >
                          <span className="sr-only">
                            {SEVERITY_LABELS[segment.severity]}: {segment.value}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <ol className="flex justify-between gap-2 text-[0.65rem] uppercase tracking-wide text-text-secondary/60">
              {normalized.map((bucket, index) => (
                <li key={`${bucket.id}-tick`} className="flex-1 text-center">
                  {shouldShowTick(index, normalized.length) ? bucket.tick : "\u00a0"}
                </li>
              ))}
            </ol>

            <dl id={chartDescriptionId} className="sr-only">
              {series.map((bucket) => (
                <div key={`desc-${bucket.bucket_start}`}>
                  <dt>{formatBucketLabel(bucket.bucket_start, window)}</dt>
                  <dd>
                    {formatBucketDescription(bucket, window)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary/90">
              {SEVERITY_ORDER.map((severity) => (
                <div key={severity} className="flex items-center gap-2">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", SEVERITY_DOT_CLASSES[severity])} aria-hidden />
                  <span className="text-text-primary/90 dark:text-text-primary">{SEVERITY_LABELS[severity]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

export default InsightTrendChart;

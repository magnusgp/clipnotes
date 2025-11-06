import { useId } from "react";
import clsx from "clsx";

import type { AnalysisMoment } from "../hooks/useAnalyze";

interface TimelineProps {
  moments: AnalysisMoment[];
  totalDuration?: number;
  clipLabel?: string;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

const SEVERITY_STYLES: Record<AnalysisMoment["severity"], string> = {
  low: "bg-emerald-500/80 hover:bg-emerald-400 border-emerald-300/40",
  medium: "bg-amber-400/80 hover:bg-amber-300 border-amber-200/50",
  high: "bg-rose-500/80 hover:bg-rose-400 border-rose-200/50",
};

const SEVERITY_LABELS: Record<AnalysisMoment["severity"], string> = {
  low: "Low impact",
  medium: "Medium impact",
  high: "High impact",
};

const SEVERITIES: AnalysisMoment["severity"][] = ["low", "medium", "high"];

function normalizeDuration(moments: AnalysisMoment[], totalDuration?: number) {
  const maxEnd = moments.reduce((acc, moment) => Math.max(acc, moment.end_s), 0);
  const candidate = totalDuration ?? maxEnd;
  return candidate <= 0 ? 1 : candidate;
}

export function Timeline({ moments, totalDuration, clipLabel }: TimelineProps) {
  const safeDuration = normalizeDuration(moments, totalDuration);
  const accessibleClipLabel = clipLabel ?? "clip";
  const descriptionId = useId();

  if (!moments.length) {
    return (
      <section className="space-y-2" aria-live="polite">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Timeline</h3>
        <p className="text-sm text-text-secondary/80">No timeline data available for this clip yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label={`Analysis timeline for ${accessibleClipLabel}`}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Timeline</h2>
        <span className="text-xs text-text-secondary/75">{accessibleClipLabel}</span>
      </header>
      <figure className="space-y-3">
        <div
          role="img"
          aria-label={`Timeline overview for ${accessibleClipLabel}`}
          aria-describedby={descriptionId}
          className="relative h-6 w-full overflow-hidden rounded-full border border-border-glass/80 bg-surface-glass/70 dark:border-slate-800 dark:bg-slate-900/80"
        >
          {moments.map((moment, index) => {
            const startPercent = Math.max(moment.start_s, 0) / safeDuration * 100;
            const widthPercent = Math.max(moment.end_s - moment.start_s, 0) / safeDuration * 100;
            const severity = moment.severity;
            const title = `${moment.label} • ${formatSeconds(moment.start_s)} → ${formatSeconds(moment.end_s)} (${severity})`;

            return (
              <div
                key={`${moment.label}-${index}`}
                data-testid="timeline-segment"
                data-severity={severity}
                className={clsx(
                  "absolute top-0 bottom-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                  SEVERITY_STYLES[severity],
                )}
                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                title={title}
                aria-hidden="true"
              />
            );
          })}
        </div>
        <ul id={descriptionId} className="sr-only">
          {moments.map((moment, index) => (
            <li key={`${moment.label}-description-${index}`}>
              {`${moment.label}: ${formatSeconds(moment.start_s)} to ${formatSeconds(moment.end_s)} (${SEVERITY_LABELS[moment.severity]})`}
            </li>
          ))}
        </ul>
        <figcaption>
          <p className="text-xs font-medium text-text-secondary/80">Legend</p>
          <ul className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary/85">
            {SEVERITIES.map((severity) => (
              <li key={severity} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={clsx("h-2.5 w-2.5 rounded-full", {
                    "bg-emerald-400": severity === "low",
                    "bg-amber-300": severity === "medium",
                    "bg-rose-400": severity === "high",
                  })}
                />
                <span className="text-text-primary/90 dark:text-text-primary">{SEVERITY_LABELS[severity]}</span>
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
    </section>
  );
}

export default Timeline;

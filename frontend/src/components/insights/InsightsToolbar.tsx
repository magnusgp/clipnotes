import { useMemo } from "react";

import type { InsightWindow } from "../../types/insights";
import { cn } from "../../utils/cn";

interface InsightsToolbarProps {
  window: InsightWindow;
  onWindowChange: (value: InsightWindow) => void;
  onRegenerate: () => void | Promise<void>;
  isLoading?: boolean;
  isRegenerating?: boolean;
  generatedAt?: string | null;
  cacheExpiresAt?: string | null;
}

const WINDOW_OPTIONS: Array<{ value: InsightWindow; label: string; description: string }> = [
  { value: "24h", label: "24 hours", description: "Hourly trend" },
  { value: "7d", label: "7 days", description: "Daily trend" },
];

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function InsightsToolbar({
  window,
  onWindowChange,
  onRegenerate,
  isLoading = false,
  isRegenerating = false,
  generatedAt,
  cacheExpiresAt,
}: InsightsToolbarProps) {
  const generatedLabel = useMemo(() => formatTimestamp(generatedAt), [generatedAt]);
  const expiresLabel = useMemo(() => formatTimestamp(cacheExpiresAt), [cacheExpiresAt]);

  return (
    <section className="rounded-2xl border border-border-glass/60 bg-surface-glass/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-text-secondary/70">Window</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-glass/70 bg-surface-panel/60 p-1 text-sm font-medium">
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
                  option.value === window
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
                onClick={() => {
                  if (option.value !== window) {
                    onWindowChange(option.value);
                  }
                }}
                disabled={isLoading || isRegenerating}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary/70">
            {WINDOW_OPTIONS.find((option) => option.value === window)?.description ?? "Window overview"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col text-xs text-text-secondary/70">
            {generatedLabel ? <span>Generated at {generatedLabel}</span> : <span>Awaiting first snapshot...</span>}
            {expiresLabel ? <span>Cache expires at {expiresLabel}</span> : <span>Cache refreshes on demand.</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              void onRegenerate();
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-border-glass/70 px-4 py-2 text-sm font-semibold transition",
              isRegenerating
                ? "bg-accent-primary/30 text-accent-primary"
                : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30",
              (isLoading || isRegenerating) && "opacity-70",
            )}
            disabled={isLoading || isRegenerating}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default InsightsToolbar;

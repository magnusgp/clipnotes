import type { AnalyzeStatus } from "../hooks/useAnalyze";
import { Card } from "./Card";
import { cn } from "../utils/cn";

interface StatusBannerProps {
  status: AnalyzeStatus;
  fileName?: string;
  pendingFileName?: string;
  error?: string;
  remediation?: string;
  statusChangedAt?: string;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface ToneDefinition {
  container: string;
  title: string;
  body: string;
  meta: string;
  remediation: string;
  spinner: string;
}

const BASE_TONE: ToneDefinition = {
  container: "border-border-glass bg-surface-panel text-text-secondary",
  title: "text-text-primary",
  body: "text-text-secondary/90",
  meta: "text-text-secondary/70",
  remediation: "text-text-secondary/85",
  spinner: "border-text-secondary/60 border-t-transparent",
};

function getTone(status: AnalyzeStatus): ToneDefinition {
  switch (status) {
    case "loading":
      return {
        ...BASE_TONE,
        container: "border-border-glass/80 bg-surface-panel/95 text-text-secondary",
        spinner: "border-text-secondary/70 border-t-transparent",
      };
    case "uploading":
      return {
        ...BASE_TONE,
        container: "border-accent-primary/40 bg-accent-primary/10 text-text-secondary",
        title: "text-text-accent",
        body: "text-text-accent/85",
        meta: "text-text-accent/70",
        remediation: "text-text-accent/80",
        spinner: "border-accent-primary/80 border-t-transparent",
      };
    case "success":
      return {
        ...BASE_TONE,
        container: "border-accent-secondary/40 bg-accent-secondary/10 text-text-secondary",
        title: "text-text-accent",
        meta: "text-text-accent/70",
        spinner: "border-accent-secondary/70 border-t-transparent",
      };
    case "error":
      return {
        ...BASE_TONE,
        container: "border-rose-500/60 bg-rose-100/70 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-100",
        title: "text-rose-700 dark:text-rose-100",
        body: "text-rose-700/90 dark:text-rose-100/85",
        meta: "text-rose-600/80 dark:text-rose-200/70",
        remediation: "text-rose-600/90 dark:text-rose-100/80",
        spinner: "border-rose-500/80 border-t-transparent",
      };
    default:
      return { ...BASE_TONE };
  }
}

function StatusBanner({
  status,
  fileName,
  pendingFileName,
  error,
  remediation,
  statusChangedAt,
}: StatusBannerProps) {
  const formattedTimestamp = statusChangedAt ? formatTimestamp(statusChangedAt) : null;

  let title = "Ready to analyze";
  let message: string | null = "Upload an MP4 or MKV under 100 MB to get started.";
  const tone = getTone(status);

  switch (status) {
    case "loading":
      title = "Loading clip details";
      message = "Retrieving the stored summary and timeline for this clip.";
      break;
    case "uploading": {
      const label = pendingFileName ?? "your clip";
      title = `Processing ${label}`;
      message = "Sending your clip to Hafnia. Hang tight for a moment.";
      break;
    }
    case "success": {
      const label = fileName ?? "the clip";
      title = `Summary ready for ${label}`;
      message = "Review the highlights and structured insights below.";
      break;
    }
    case "error":
      title = "Hafnia request failed";
      message = error ?? "We ran into an unexpected issue.";
      break;
    default:
      break;
  }

  return (
    <Card
      interactive={false}
      className={cn("space-y-2 p-5 text-sm", tone.container)}
      data-testid="status-banner"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {(status === "uploading" || status === "loading") && (
          <span aria-hidden className={cn("h-3 w-3 animate-spin rounded-full border-2", tone.spinner)} />
        )}
        <p className={cn("font-semibold", tone.title)}>{title}</p>
      </div>
      {message ? <p className={cn("text-xs", tone.body)}>{message}</p> : null}
      {status === "error" && remediation ? (
        <p className={cn("text-xs", tone.remediation)}>Next steps: {remediation}</p>
      ) : null}
      {formattedTimestamp ? (
        <p className={cn("text-[0.65rem] uppercase tracking-wide", tone.meta)}>
          Last updated: {" "}
          <time data-testid="status-timestamp" dateTime={statusChangedAt}>
            {formattedTimestamp}
          </time>
        </p>
      ) : null}
    </Card>
  );
}

export default StatusBanner;

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
  let body: string | null = "Upload an MP4 or MKV under 100 MB to get started.";
  let toneClass = "border-border-glass bg-surface-glass text-text-secondary";

  switch (status) {
    case "loading": {
      title = "Loading clip details";
      body = "Retrieving the stored summary and timeline for this clip.";
      toneClass = "border-border-glass/80 bg-surface-glass/70 text-text-primary";
      break;
    }
    case "uploading": {
      const label = pendingFileName ?? "your clip";
      title = `Processing ${label}`;
      body = "Sending your clip to Hafnia. Hang tight for a moment.";
      toneClass = "border-accent-primary/50 bg-accent-primary/10 text-text-accent";
      break;
    }
    case "success": {
      const label = fileName ?? "the clip";
      title = `Summary ready for ${label}`;
      body = "Review the highlights and structured insights below.";
      toneClass = "border-accent-secondary/50 bg-accent-secondary/10 text-text-accent";
      break;
    }
    case "error": {
      title = "Hafnia request failed";
      body = error ?? "We ran into an unexpected issue.";
      toneClass = "border-rose-500/80 bg-rose-500/15 text-rose-100";
      break;
    }
    default:
      break;
  }

  return (
    <Card
      interactive={false}
      className={cn("p-5 text-sm", toneClass)}
      data-testid="status-banner"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {status === "uploading" || status === "loading" ? (
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <p className="font-semibold text-text-primary">{title}</p>
      </div>
      {body ? <p className="text-xs text-text-secondary/90">{body}</p> : null}
      {status === "error" && remediation ? (
        <p className="text-xs text-rose-100/80">Next steps: {remediation}</p>
      ) : null}
      {formattedTimestamp ? (
        <p className="text-[0.65rem] uppercase tracking-wide text-text-secondary/70">
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

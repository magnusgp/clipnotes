import type { AnalyzeStatus } from "../hooks/useAnalyze";

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
  let toneClass = "border-slate-800 bg-slate-900/60 text-slate-200";

  switch (status) {
    case "loading": {
      title = "Loading clip details";
      body = "Retrieving the stored summary and timeline for this clip.";
      toneClass = "border-slate-600/60 bg-slate-900/60 text-slate-100";
      break;
    }
    case "uploading": {
      const label = pendingFileName ?? "your clip";
      title = `Processing ${label}`;
      body = "Sending your clip to Hafnia. Hang tight for a moment.";
      toneClass = "border-sky-600/60 bg-sky-950/40 text-sky-100";
      break;
    }
    case "success": {
      const label = fileName ?? "the clip";
      title = `Summary ready for ${label}`;
      body = "Review the highlights and structured insights below.";
      toneClass = "border-emerald-600/70 bg-emerald-950/30 text-emerald-100";
      break;
    }
    case "error": {
      title = "Hafnia request failed";
      body = error ?? "We ran into an unexpected issue.";
      toneClass = "border-rose-600/70 bg-rose-950/40 text-rose-100";
      break;
    }
    default:
      break;
  }

  return (
    <section
      data-testid="status-banner"
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-1 rounded-lg border px-4 py-3 text-sm shadow ${toneClass}`}
    >
      <div className="flex items-center gap-2">
        {status === "uploading" || status === "loading" ? (
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <p className="font-semibold">{title}</p>
      </div>
      {body ? <p className="text-xs opacity-90">{body}</p> : null}
      {status === "error" && remediation ? (
        <p className="text-xs opacity-80">Next steps: {remediation}</p>
      ) : null}
      {formattedTimestamp ? (
        <p className="text-[0.65rem] uppercase tracking-wide text-white/70">
          Last updated: {" "}
          <time data-testid="status-timestamp" dateTime={statusChangedAt}>
            {formattedTimestamp}
          </time>
        </p>
      ) : null}
    </section>
  );
}

export default StatusBanner;

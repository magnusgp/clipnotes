import type { AnalyzeStatus, SummaryResponse } from "../hooks/useAnalyze";

interface SummaryPanelProps {
  status: AnalyzeStatus;
  summary?: SummaryResponse;
  error?: string;
  fileName?: string;
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

export function SummaryPanel({ status, summary, error, fileName }: SummaryPanelProps) {
  const isIdle = status === "idle" && !summary;
  const isLoading = status === "uploading";
  const hasSummary = Boolean(summary);
  const structured = summary?.structured_summary?.data;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Summary</h2>
          {fileName ? (
            <p className="text-xs text-slate-400">Working file: {fileName}</p>
          ) : null}
        </div>
        {summary ? (
          <span className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-300">
            {summary.summary.length} bullets
          </span>
        ) : null}
      </header>

      {isIdle ? (
        <p className="text-sm text-slate-400">
          Upload a short clip to generate actionable highlights and an optional JSON breakdown.
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          <span className="text-sm text-slate-300">Analyzing video… this can take a few seconds.</span>
        </div>
      ) : null}

      {status === "error" && error ? (
        <div
          className="mt-2 rounded-md border border-rose-600/80 bg-rose-950/50 p-4 text-sm text-rose-200"
          role="alert"
        >
          <p className="font-semibold">We couldn&apos;t analyze that clip.</p>
          <p className="mt-1 text-xs text-rose-100/80">{error}</p>
        </div>
      ) : null}

      {hasSummary ? (
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Key moments</h3>
            {summary?.summary?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-100">
                {summary.summary.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No bullet summary was returned for this clip.</p>
            )}
          </div>

          {structured ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Structured details</h3>
              <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-slate-950/70 p-4 text-xs text-slate-200">
                {JSON.stringify(structured, null, 2)}
              </pre>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-400 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-slate-300">Submission ID</dt>
              <dd className="break-all text-slate-400">{summary?.submission_id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-slate-300">Completed</dt>
              <dd>{summary ? formatTimestamp(summary.completed_at) : ""}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-slate-300">Latency</dt>
              <dd>{summary ? `${summary.latency_ms} ms` : ""}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

export default SummaryPanel;

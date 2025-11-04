import type { AnalyzeStatus, AnalysisMoment, ClipAnalysis, SummaryResponse } from "../hooks/useAnalyze";
import Timeline from "./Timeline";
import { Card } from "./Card";

function tryParseStructuredSummary(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parseCandidate = (candidate: string) => {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  };

  const direct = parseCandidate(trimmed);
  if (direct) {
    return direct;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return parseCandidate(trimmed.slice(start, end + 1));
}

function normalizeMomentsFromStructured(value: unknown): AnalysisMoment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: AnalysisMoment[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;
    const startCandidate = record.start_s ?? record.start ?? record.startSeconds;
    const endCandidate = record.end_s ?? record.end ?? record.endSeconds;
    const start = Number(startCandidate);
    const end = Number(endCandidate);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }

    const labelCandidate = record.label;
    const label = typeof labelCandidate === "string" && labelCandidate.trim() ? labelCandidate.trim() : "moment";
    const severity = normalizeSeverity(record.severity);

    normalized.push({
      start_s: start,
      end_s: end,
      label,
      severity,
    });
  }

  return normalized;
}

function normalizeSeverity(value: unknown): AnalysisMoment["severity"] {
  if (typeof value !== "string") {
    return "medium";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return "medium";
}

function extractSummaryParagraphs(
  structured: Record<string, unknown> | null,
  fallback: string | null | undefined,
): string[] {
  const summaryCandidate = typeof structured?.summary === "string" ? structured.summary : fallback ?? "";
  if (!summaryCandidate) {
    return [];
  }

  const cleaned = summaryCandidate
    .replace(/```json?/gi, "")
    .replace(/```/g, "")
    .replace(/\*\*/g, "")
    .trim();

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

interface SummaryPanelProps {
  status: AnalyzeStatus;
  summary?: SummaryResponse;
  analysis?: ClipAnalysis;
  error?: string;
  remediation?: string;
  fileName?: string;
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

export function SummaryPanel({
  status,
  summary,
  analysis,
  error,
  remediation,
  fileName,
  statusChangedAt,
}: SummaryPanelProps) {
  const isIdle = status === "idle" && !summary && !analysis;
  const hasSummary = Boolean(summary);
  const hasAnalysis = Boolean(analysis);
  const structured = summary?.structured_summary?.data;
  const showValidationTips = status === "error" && !hasSummary && !hasAnalysis;
  const lastUpdatedLabel = statusChangedAt ? formatTimestamp(statusChangedAt) : null;
  const analysisStructured = tryParseStructuredSummary(analysis?.summary ?? null);
  const derivedMoments = analysis?.moments?.length
    ? analysis.moments
    : normalizeMomentsFromStructured(analysisStructured ? analysisStructured["moments"] : undefined);
  const momentCount = derivedMoments.length;
  const highlightLabel = hasAnalysis
    ? `${momentCount} moment${momentCount === 1 ? "" : "s"}`
    : summary
      ? `${summary.summary.length} bullets`
      : null;
  const overviewParagraphs = extractSummaryParagraphs(analysisStructured, analysis?.summary);
  const formattedStructuredJson = analysisStructured ? JSON.stringify(analysisStructured, null, 2) : null;
  const isLoading = status === "uploading" || status === "loading";
  const showEmptySelection = status === "success" && !hasAnalysis && !hasSummary;
  const loadingMessage =
    status === "loading"
      ? "Loading the stored summary and timeline…"
      : "Analyzing video… this can take a few seconds.";

  return (
    <Card interactive={false} className="p-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-text-primary">Summary</h2>
          {fileName ? (
            <p className="text-xs text-text-secondary/80">Working file: {fileName}</p>
          ) : null}
        </div>
        {highlightLabel ? (
          <span className="rounded-full border border-accent-primary/50 bg-accent-primary/10 px-3 py-1 text-xs font-medium text-text-accent">
            {highlightLabel}
          </span>
        ) : null}
      </header>

      {isIdle ? (
        <p className="text-sm text-text-secondary">
          Upload a short clip to generate actionable highlights and an optional JSON breakdown.
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-text-secondary/60 border-t-transparent" />
          <span className="text-sm text-text-secondary/90">{loadingMessage}</span>
        </div>
      ) : null}

      {status === "error" && error ? (
        <div
          className="mt-2 rounded-2xl border border-rose-500/70 bg-rose-500/15 p-4 text-sm text-rose-100"
          role="alert"
        >
          <p className="font-semibold text-text-primary">We couldn&apos;t analyze that clip.</p>
          <p className="mt-1 text-xs text-rose-50/80">{error}</p>
          {remediation ? (
            <p className="mt-2 text-xs text-rose-50/80">
              <span className="font-medium text-text-primary">Next steps:</span> {remediation}
            </p>
          ) : null}
          {showValidationTips ? (
            <ul className="mt-3 space-y-1 text-xs text-rose-50/70">
              <li>• Use MP4 or MKV formats only.</li>
              <li>• Keep file size under 100 MB.</li>
              <li>• Target clips around 30 seconds for best results.</li>
            </ul>
          ) : null}
        </div>
      ) : null}

      {showEmptySelection ? (
        <p className="mt-4 text-sm text-text-secondary">
          This clip has not been analyzed yet. Trigger an analysis run to view summaries and key moments.
        </p>
      ) : null}

      {hasAnalysis ? (
        <div className="mt-4 space-y-6">
          <Timeline
            clipLabel={fileName ?? analysis?.clip_id}
            moments={derivedMoments}
          />

          <div>
            <h3 className="text-sm font-semibold text-text-primary">Overview</h3>
            {overviewParagraphs.length ? (
              <div className="mt-2 space-y-2 text-sm text-text-secondary">
                {overviewParagraphs.map((paragraph, index) => (
                  <p key={`${analysis?.clip_id ?? "analysis"}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No summary available for this clip yet.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">Key moments</h3>
            {derivedMoments.length ? (
              <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                {derivedMoments.map((moment, index) => (
                  <li key={`${moment.label}-${index}`} className="rounded-2xl border border-border-glass bg-surface-glass/60 p-3">
                    <p className="font-semibold text-text-primary">{moment.label}</p>
                    <p className="text-xs text-text-secondary/80">
                      {moment.start_s.toFixed(1)}s → {moment.end_s.toFixed(1)}s · Severity {moment.severity}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No key moments were returned.</p>
            )}
          </div>

          {formattedStructuredJson ? (
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Structured output</h3>
              <pre className="mt-2 max-h-60 overflow-auto rounded-2xl border border-border-glass bg-surface-glass/50 p-4 text-xs text-text-secondary">
                {formattedStructuredJson}
              </pre>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-text-secondary sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Clip ID</dt>
              <dd className="break-all text-text-secondary">{analysis?.clip_id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Completed</dt>
              <dd>{analysis ? formatTimestamp(analysis.created_at) : ""}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Latency</dt>
              <dd>{analysis?.latency_ms != null ? `${analysis.latency_ms} ms` : "—"}</dd>
            </div>
            {analysis?.prompt ? (
              <div className="flex flex-col gap-0.5">
                <dt className="font-medium text-text-secondary/80">Prompt</dt>
                <dd className="text-text-secondary">{analysis.prompt}</dd>
              </div>
            ) : null}
            {analysis?.error_code ? (
              <div className="flex flex-col gap-0.5">
                <dt className="font-medium text-text-secondary/80">Last error</dt>
                <dd className="text-text-secondary">{analysis.error_message ?? analysis.error_code}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {!hasAnalysis && hasSummary ? (
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Key moments</h3>
            {summary?.summary?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                {summary.summary.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-primary" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No bullet summary was returned for this clip.</p>
            )}
          </div>

          {structured ? (
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Structured details</h3>
              <pre className="mt-2 max-h-60 overflow-auto rounded-2xl border border-border-glass bg-surface-glass/50 p-4 text-xs text-text-secondary">
                {JSON.stringify(structured, null, 2)}
              </pre>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-text-secondary sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Submission ID</dt>
              <dd className="break-all text-text-secondary">{summary?.submission_id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Asset ID</dt>
              <dd className="break-all text-text-secondary">{summary?.asset_id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Completed</dt>
              <dd>{summary ? formatTimestamp(summary.completed_at) : ""}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium text-text-secondary/80">Latency</dt>
              <dd>{summary ? `${summary.latency_ms} ms` : ""}</dd>
            </div>
            {summary?.completion_id ? (
              <div className="flex flex-col gap-0.5">
                <dt className="font-medium text-text-secondary/80">Completion ID</dt>
                <dd className="break-all text-text-secondary">{summary.completion_id}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {lastUpdatedLabel ? (
        <p
          data-testid="summary-last-updated"
          className="mt-4 text-[0.7rem] uppercase tracking-wide text-text-secondary/70"
        >
          Last updated: {lastUpdatedLabel}
        </p>
      ) : null}
    </Card>
  );
}

export default SummaryPanel;

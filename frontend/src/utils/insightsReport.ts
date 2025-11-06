import type { InsightResponse, InsightSeriesBucket, InsightTopLabel } from "../types/insights";

export interface InsightReportMetadata {
  window: InsightResponse["window"];
  generatedAt: string;
  exportedAt: string;
}

export interface InsightReportDocument {
  html: string;
  metadata: InsightReportMetadata;
}

interface BuildReportOptions {
  title?: string;
}

function describeWindow(window: InsightResponse["window"]): string {
  return window === "7d" ? "Last 7 days" : "Last 24 hours";
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safeTopLabels(labels: InsightTopLabel[]): InsightTopLabel[] {
  return labels.slice(0, 5);
}

function renderTopLabels(labels: InsightTopLabel[]): string {
  if (!labels.length) {
    return '<p class="section-body muted">No top labels captured in this window.</p>';
  }
  const items = labels
    .map((label) => {
      const avgSeverity = label.avg_severity !== null && label.avg_severity !== undefined
        ? `${label.avg_severity.toFixed(1)}`
        : "-";
      return `<tr>
        <td class="label-name">${escapeHtml(label.label)}</td>
        <td class="label-count">${label.count}</td>
        <td class="label-severity">${avgSeverity}</td>
      </tr>`;
    })
    .join("");
  return `
    <div class="table-container">
      <table aria-label="Top labels table">
        <thead>
          <tr><th scope="col">Label</th><th scope="col">Count</th><th scope="col">Avg. Severity</th></tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
    </div>
  `;
}

function renderBuckets(window: InsightResponse["window"], buckets: InsightSeriesBucket[]): string {
  if (!buckets.length) {
    return '<p class="section-body muted">No timeline data available yet.</p>';
  }
  const rows = buckets
    .map((bucket) => {
      const label = formatBucketLabel(bucket.bucket_start, window);
      const bucketTotal = bucket.total;
      const { high, medium, low } = bucket.severity;
      return `<tr><td>${label}</td><td>${bucketTotal}</td><td>${high}</td><td>${medium}</td><td>${low}</td></tr>`;
    })
    .join("");
  return `
    <div class="table-container">
      <table aria-label="Timeline bucket summary">
        <thead>
          <tr><th scope="col">Bucket</th><th scope="col">Total</th><th scope="col">High</th><th scope="col">Medium</th><th scope="col">Low</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderSeverityTotals(severityTotals: InsightResponse["severity_totals"]): string {
  const { high, medium, low } = severityTotals;
  return `
    <ul class="severity-list" aria-label="Severity totals">
      <li><span class="badge high"></span><span class="severity-label">High</span><span class="severity-value">${high}</span></li>
      <li><span class="badge medium"></span><span class="severity-label">Medium</span><span class="severity-value">${medium}</span></li>
      <li><span class="badge low"></span><span class="severity-label">Low</span><span class="severity-value">${low}</span></li>
    </ul>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBucketLabel(bucketStart: string, window: InsightResponse["window"]): string {
  const date = new Date(bucketStart);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  if (window === "24h") {
    return date.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function buildInsightReportDocument(
  insight: InsightResponse,
  options: BuildReportOptions = {},
): InsightReportDocument {
  const exportedAt = new Date().toISOString();
  const generatedAtLabel = formatTimestamp(insight.generated_at);
  const cacheExpiresLabel = formatTimestamp(insight.cache_expires_at);
  const windowLabel = describeWindow(insight.window);
  const labels = safeTopLabels(insight.top_labels);
  const title = options.title ?? `ClipNotes Insight Report — ${windowLabel}`;

  const metadata: InsightReportMetadata = {
    window: insight.window,
    generatedAt: insight.generated_at,
    exportedAt,
  };

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="clipnotes:generated_at" content="${escapeHtml(insight.generated_at)}" />
      <meta name="clipnotes:window" content="${escapeHtml(insight.window)}" />
      <meta name="clipnotes:exported_at" content="${escapeHtml(exportedAt)}" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          color-scheme: light;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --surface: #0f172a;
          --surface-alt: #111827;
          --border: rgba(255,255,255,0.12);
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --accent: #0ea5e9;
          --accent-soft: rgba(14,165,233,0.1);
          --muted: #94a3b8;
        }
        @media print {
          body { -webkit-print-color-adjust:exact; }
        }
        body {
          margin: 0;
          padding: 32px;
          background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
          color: var(--text-primary);
        }
        .report {
          max-width: 960px;
          margin: 0 auto;
          background: rgba(255,255,255,0.92);
          border-radius: 24px;
          border: 1px solid rgba(148,163,184,0.25);
          padding: 40px;
          box-shadow: 0 30px 60px rgba(15,23,42,0.12);
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0;
          font-size: 28px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .window-chip {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin: 0 0 24px 0;
          padding: 12px 16px;
          background: rgba(226,232,240,0.5);
          border-radius: 16px;
          font-size: 13px;
        }
        .section {
          margin-bottom: 28px;
        }
        .section h2 {
          margin: 0 0 12px 0;
          font-size: 18px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .section-body {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .muted {
          color: var(--muted);
        }
        .severity-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 20px;
          font-size: 14px;
        }
        .severity-list li {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        .badge.high { background: rgba(248,113,113,0.85); }
        .badge.medium { background: rgba(251,191,36,0.85); }
        .badge.low { background: rgba(34,197,94,0.85); }
        .severity-label {
          color: rgba(15,23,42,0.82);
          font-weight: 500;
        }
        .severity-value { font-weight: 600; }
        .table-container {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,0.3);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td {
          padding: 12px 16px;
          text-align: left;
        }
        thead {
          background: rgba(148,163,184,0.18);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
        }
        tbody tr:nth-child(odd) {
          background: rgba(248,250,252,0.8);
        }
        .label-name {
          font-weight: 600;
          color: rgba(15,23,42,0.88);
        }
        .label-count, .label-severity {
          font-variant-numeric: tabular-nums;
          color: rgba(15,23,42,0.78);
        }
        footer {
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
        }
      </style>
    </head>
    <body>
      <main class="report">
        <header>
          <h1>ClipNotes Insight Report</h1>
          <span class="window-chip">${escapeHtml(windowLabel)}</span>
        </header>
        <div class="meta">
          <span><strong>Snapshot generated:</strong> ${escapeHtml(generatedAtLabel)}</span>
          <span><strong>Cache refreshes:</strong> ${escapeHtml(cacheExpiresLabel)}</span>
          <span><strong>Report exported:</strong> ${escapeHtml(formatTimestamp(exportedAt))}</span>
        </div>
        <section class="section">
          <h2>Summary</h2>
          <p class="section-body">${escapeHtml(insight.summary)}</p>
        </section>
        <section class="section">
          <h2>Severity distribution</h2>
          ${renderSeverityTotals(insight.severity_totals)}
        </section>
        <section class="section">
          <h2>Top focus areas</h2>
          ${renderTopLabels(labels)}
        </section>
        <section class="section">
          <h2>Timeline breakdown</h2>
          ${renderBuckets(insight.window, insight.series)}
        </section>
        <footer>
          <span>Generated from ClipNotes Monitoring</span>
          <span>Window: ${escapeHtml(insight.window)}</span>
        </footer>
      </main>
    </body>
  </html>`;

  return { html, metadata };
}

export function openInsightReportWindow(insight: InsightResponse): void {
  if (typeof window === "undefined") {
    throw new Error("Report export is only available in the browser.");
  }
  const { html } = buildInsightReportDocument(insight);
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

export function formatTimestampLabel(value: string | null | undefined): string | null {
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

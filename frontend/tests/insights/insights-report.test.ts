import { describe, expect, it } from "vitest";

import type { InsightResponse } from "../../src/types/insights";
import { buildInsightReportDocument, formatTimestampLabel } from "../../src/utils/insightsReport";

const baseInsight: InsightResponse = {
  window: "24h",
  generated_at: "2024-11-20T10:12:00.000Z",
  summary: "Overall clip activity remained stable with a slight uptick in high severity mentions.",
  summary_source: "hafnia",
  severity_totals: {
    high: 7,
    medium: 15,
    low: 24,
  },
  series: [
    {
      bucket_start: "2024-11-20T06:00:00.000Z",
      total: 9,
      severity: { high: 2, medium: 4, low: 3 },
    },
    {
      bucket_start: "2024-11-20T07:00:00.000Z",
      total: 12,
      severity: { high: 3, medium: 5, low: 4 },
    },
  ],
  top_labels: [
    { label: "Latency", count: 6, avg_severity: 2.4 },
    { label: "Throughput", count: 4, avg_severity: 1.2 },
  ],
  delta: {
    high: 1,
    medium: -2,
    low: 3,
  },
  cache_expires_at: "2024-11-20T12:12:00.000Z",
};

describe("buildInsightReportDocument", () => {
  it("includes key insight sections and metadata", () => {
    const { html, metadata } = buildInsightReportDocument(baseInsight);

    expect(metadata.window).toBe(baseInsight.window);
    expect(metadata.generatedAt).toBe(baseInsight.generated_at);
    expect(typeof metadata.exportedAt).toBe("string");

    expect(html).toContain("ClipNotes Insight Report");
    expect(html).toContain("Severity distribution");
  expect(html).toContain("Top focus areas");
    expect(html).toContain("Timeline breakdown");
    expect(html).toContain("Latency");
  expect(html).toContain("Dominant Severity");
  });

  it("escapes unsafe characters in rendered content", () => {
    const unsafeInsight: InsightResponse = {
      ...baseInsight,
      summary: "<script>alert('xss')</script> & focus",
      top_labels: [
        { label: "<b>Security</b>", count: 3, avg_severity: 2.7 },
      ],
    };

    const { html } = buildInsightReportDocument(unsafeInsight);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; focus");
    expect(html).toContain("&lt;b&gt;Security&lt;/b&gt;");
  });
});

describe("formatTimestampLabel", () => {
  it("returns null for invalid timestamps", () => {
    expect(formatTimestampLabel("not-a-date")).toBeNull();
    expect(formatTimestampLabel(null)).toBeNull();
  });

  it("returns a non-empty label for valid timestamps", () => {
    const label = formatTimestampLabel("2024-11-20T10:12:00.000Z");
    expect(label).not.toBeNull();
    expect(label).not.toHaveLength(0);
  });
});

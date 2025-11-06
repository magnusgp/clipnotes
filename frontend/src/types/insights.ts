export type InsightWindow = "24h" | "7d";

export interface InsightSeverityTotals {
  low: number;
  medium: number;
  high: number;
}

export interface InsightSeriesBucket {
  bucket_start: string;
  total: number;
  severity: InsightSeverityTotals;
}

export interface InsightTopLabel {
  label: string;
  count: number;
  avg_severity: number | null;
}

export interface InsightResponse {
  window: InsightWindow;
  generated_at: string;
  summary: string;
  summary_source: "hafnia" | "fallback";
  severity_totals: InsightSeverityTotals;
  series: InsightSeriesBucket[];
  top_labels: InsightTopLabel[];
  delta: Record<string, number> | null;
  cache_expires_at: string | null;
}

export interface InsightRegenerateRequest {
  window: InsightWindow;
}

export interface InsightShareRequest {
  window: InsightWindow;
}

export interface InsightShareResponse {
  token: string;
  url: string;
  window: InsightWindow;
  generated_at: string;
  cache_expires_at: string | null;
}

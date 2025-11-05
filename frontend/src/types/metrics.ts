export interface MetricsHourlyBucket {
  hour: string;
  requests: number;
}

export interface MetricsDailyBucket {
  date: string;
  requests: number;
  analyses: number;
}

export interface MetricsResponse {
  generated_at: string;
  total_clips: number;
  total_analyses: number;
  avg_latency_ms: number;
  requests_today: number;
  clips_today: number;
  per_hour: MetricsHourlyBucket[];
  per_day: MetricsDailyBucket[];
  latency_flag: boolean;
  error_rate: number | null;
}

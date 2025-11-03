export type ComparisonAnswer = "clip_a" | "clip_b" | "equal" | "uncertain";

export interface ReasoningEvidence {
  clip_id: string;
  label: string;
  timestamp_range?: [number, number];
  description?: string | null;
}

export interface ReasoningMetricsCore {
  counts_by_label?: Record<string, number>;
  severity_distribution?: Record<string, number>;
}

export interface GraphNode {
  id: string;
  label: string;
  metadata?: Record<string, unknown> | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ReasoningMetricsResponse {
  clip_id: string;
  counts_by_label: Record<string, number>;
  durations_by_label: Record<string, number>;
  severity_distribution: Record<string, number>;
  object_graph?: GraphPayload | null;
}

export interface ReasoningComparisonResponse {
  answer: ComparisonAnswer;
  explanation: string;
  evidence: ReasoningEvidence[];
  metrics?: ReasoningMetricsCore | null;
  confidence?: number | null;
}

export interface ReasoningComparePayload {
  clip_a: string;
  clip_b: string;
  question: string;
}

export interface ReasoningChatPayload {
  clips: string[];
  message: string;
}

export interface ReasoningChatResponse {
  answer: string;
  created_at: string;
  evidence?: ReasoningEvidence[];
  clips?: string[];
}

export interface ReasoningHistoryEntry {
  id: string;
  clip_ids: string[];
  question: string;
  answer: ReasoningChatResponse;
  answer_type: string;
  created_at: string;
}

export interface ReasoningHistoryResponse {
  items: ReasoningHistoryEntry[];
}

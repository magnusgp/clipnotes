/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import type {
  ReasoningComparePayload,
  ReasoningComparisonResponse,
  ReasoningEvidence,
  ReasoningMetricsCore,
} from "../types/reasoning";
import { ApiError, apiRequest } from "../utils/api";

interface UseCompareClipsResult {
  mutateAsync: (variables: ReasoningComparePayload) => Promise<ReasoningComparisonResponse>;
  reset: () => void;
  data: ReasoningComparisonResponse | undefined;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const errorNode = payload.error;
  if (isRecord(errorNode)) {
    const specific = errorNode.message ?? errorNode.detail;
    if (typeof specific === "string" && specific.trim()) {
      return specific;
    }
  }

  const generic = payload.message ?? payload.detail;
  if (typeof generic === "string" && generic.trim()) {
    return generic;
  }

  return fallback;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function parseTimecodeSegment(segment: string): number | null {
  if (!segment) {
    return null;
  }

  const parts = segment.split(":").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) {
    return null;
  }

  const numbers = parts.map((part) => Number.parseFloat(part));
  if (numbers.some((value) => !Number.isFinite(value))) {
    return null;
  }

  while (numbers.length < 3) {
    numbers.unshift(0);
  }

  const [hours, minutes, seconds] = numbers;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseTimestampRange(value: unknown): [number, number] | undefined {
  if (Array.isArray(value) && value.length === 2) {
    const start = typeof value[0] === "string" ? parseTimecodeSegment(value[0]) : Number(value[0]);
    const end = typeof value[1] === "string" ? parseTimecodeSegment(value[1]) : Number(value[1]);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return [start as number, end as number];
    }
  }

  if (typeof value === "string" && value.includes("-")) {
    const [startRaw, endRaw] = value.split("-").map((segment) => segment.trim());
    const start = parseTimecodeSegment(startRaw);
    const end = parseTimecodeSegment(endRaw);
    if (start !== null && end !== null) {
      return [start, end];
    }
  }

  return undefined;
}

function normalizeEvidenceCandidates(...sources: Array<unknown>): ReasoningEvidence[] {
  const normalized: ReasoningEvidence[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const entry of source) {
      if (!isRecord(entry)) {
        continue;
      }

      const clipIdCandidate = entry.clip_id ?? entry.clip ?? entry.clipId;
      if (typeof clipIdCandidate !== "string" || !clipIdCandidate.trim()) {
        continue;
      }

      const labelCandidate = entry.label ?? entry.title ?? entry.reason;
      const label = typeof labelCandidate === "string" && labelCandidate.trim() ? labelCandidate.trim() : "Evidence";

      const descriptionCandidate = entry.description ?? entry.summary ?? entry.detail;
      const description = typeof descriptionCandidate === "string" ? descriptionCandidate.trim() : null;

      const range = parseTimestampRange(entry.timestamp_range ?? entry.range ?? entry.timestamps ?? entry.window);

      normalized.push({
        clip_id: clipIdCandidate,
        label,
        description,
        ...(range ? { timestamp_range: range } : {}),
      });
    }
  }

  const seen = new Set<string>();
  return normalized.filter((item) => {
    const key = `${item.clip_id}-${item.label}-${item.timestamp_range?.join("-") ?? ""}-${item.description ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeMetricsCore(candidate: unknown): ReasoningMetricsCore | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const counts = isRecord(candidate.counts_by_label) ? (candidate.counts_by_label as Record<string, number>) : undefined;
  const severity = isRecord(candidate.severity_distribution)
    ? (candidate.severity_distribution as Record<string, number>)
    : undefined;

  if (!counts && !severity) {
    return null;
  }

  return {
    ...(counts ? { counts_by_label: counts } : {}),
    ...(severity ? { severity_distribution: severity } : {}),
  };
}

function extractJsonCandidate(value: string): string | null {
  const fenceMatch = value.match(/```json\s*([\s\S]*?)```/i) ?? value.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return candidate.slice(start, end + 1);
}

function repairJsonCandidate(candidate: string): string {
  return candidate
    .replace(/\[(\d{1,2}:\d{2}-\d{1,2}:\d{2})\]/g, '["$1"]')
    .replace(/,(\s*[}\]])/g, "$1");
}

function parseStructuredExplanation(explanation: string): Record<string, unknown> | null {
  const candidate = extractJsonCandidate(explanation);
  if (!candidate) {
    return null;
  }

  const attempts = [candidate, repairJsonCandidate(candidate)];
  for (const attempt of attempts) {
    try {
      const parsed: unknown = JSON.parse(attempt);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function normaliseComparisonResponse(raw: ReasoningComparisonResponse): ReasoningComparisonResponse {
  const structured = parseStructuredExplanation(raw.explanation) ?? raw.structured ?? null;

  let answer = raw.answer;
  let explanation = raw.explanation;
  let confidence = raw.confidence ?? null;
  let metrics: ReasoningMetricsCore | null = raw.metrics ?? null;

  if (structured) {
    const structuredAnswer = structured.answer ?? structured.result ?? structured.winner;
    if (typeof structuredAnswer === "string") {
      const normalized = structuredAnswer.toLowerCase().replace(/\s+/g, "_") as ReasoningComparisonResponse["answer"];
      if (normalized === "clip_a" || normalized === "clip_b" || normalized === "equal" || normalized === "uncertain") {
        answer = normalized;
      }
    }

    const structuredExplanation = structured.explanation ?? structured.summary ?? structured.reason;
    if (typeof structuredExplanation === "string" && structuredExplanation.trim()) {
      explanation = structuredExplanation.trim();
    } else if (typeof structured.explanation === "object" && structured.explanation !== null) {
      try {
        explanation = JSON.stringify(structured.explanation);
      } catch {
        // ignore serialization issues
      }
    }

    const confidenceCandidate = structured.confidence ?? structured.confidence_score ?? structured.score;
    if (typeof confidenceCandidate === "number" && Number.isFinite(confidenceCandidate)) {
      confidence = clampConfidence(confidenceCandidate);
    } else if (typeof confidenceCandidate === "string") {
      const parsed = Number.parseFloat(confidenceCandidate);
      if (Number.isFinite(parsed)) {
        confidence = clampConfidence(parsed);
      }
    }

    const metricsCandidate = structured.metrics ?? {
      counts_by_label: structured.counts_by_label,
      severity_distribution: structured.severity_distribution,
    };
    metrics = normalizeMetricsCore(metricsCandidate) ?? metrics;
  }

  const evidence = normalizeEvidenceCandidates(raw.evidence, structured?.evidence, structured?.supporting_evidence);

  return {
    ...raw,
    answer,
    explanation,
    confidence,
    metrics,
    evidence,
    structured,
  };
}

export function useCompareClips(): UseCompareClipsResult {
  const options: UseMutationOptions<ReasoningComparisonResponse, Error, ReasoningComparePayload> = {
    mutationFn: async (payload: ReasoningComparePayload) => {
      try {
        const response = await apiRequest<ReasoningComparisonResponse>("/api/reasoning/compare", {
          method: "POST",
          credentials: "same-origin",
          json: payload,
        });
        return normaliseComparisonResponse(response);
      } catch (cause) {
        if (cause instanceof ApiError) {
          const fallback = `Unable to compare clips (status ${cause.status})`;
          throw new Error(extractErrorMessage(cause.payload, fallback));
        }
        if (cause instanceof Error) {
          throw cause;
        }
        throw new Error("Unable to compare clips.");
      }
    },
  };

  const mutationResult = useMutation<ReasoningComparisonResponse, Error, ReasoningComparePayload>(options);

  const typedMutation: UseCompareClipsResult = {
    mutateAsync: mutationResult.mutateAsync,
    reset: mutationResult.reset,
    data: mutationResult.data,
    isPending: mutationResult.isPending,
    isSuccess: mutationResult.isSuccess,
    error: mutationResult.error ?? null,
  };

  return typedMutation;
}

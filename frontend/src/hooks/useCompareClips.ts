import { useMutation } from "@tanstack/react-query";

import type {
  ReasoningComparePayload,
  ReasoningComparisonResponse,
} from "../types/reasoning";

interface CompareErrorShape {
  error?: {
    code?: string;
    message?: string;
    detail?: string;
  };
  message?: string;
  detail?: string;
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

export function useCompareClips() {
  return useMutation<ReasoningComparisonResponse, Error, ReasoningComparePayload>({
    mutationFn: async (payload: ReasoningComparePayload) => {
      const response = await fetch("/api/reasoning/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallback = `Unable to compare clips (status ${response.status})`;
        let message = fallback;
        try {
          const parsed = (await response.json()) as CompareErrorShape;
          message = extractErrorMessage(parsed, fallback);
        } catch {
          message = fallback;
        }
        throw new Error(message);
      }

      const parsed = (await response.json()) as ReasoningComparisonResponse;
      return parsed;
    },
  });
}

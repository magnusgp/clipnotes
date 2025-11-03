import { useCallback, useEffect, useMemo, useState } from "react";

import type { ReasoningMetricsResponse } from "../types/reasoning";

interface MetricsErrorShape {
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

async function fetchMetrics(clipId: string): Promise<ReasoningMetricsResponse> {
  const response = await fetch(`/api/reasoning/metrics/${clipId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const fallback = `Unable to load metrics (status ${response.status})`;
    let message = fallback;
    try {
      const parsed = (await response.json()) as MetricsErrorShape;
      message = extractErrorMessage(parsed, fallback);
    } catch {
      message = fallback;
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as ReasoningMetricsResponse;
  return payload;
}

interface MetricsState {
  data: ReasoningMetricsResponse | null;
  error: Error | null;
  status: "idle" | "loading" | "success" | "error";
}

export function useReasoningMetrics(clipId: string | null | undefined) {
  const [state, setState] = useState<MetricsState>({ data: null, error: null, status: "idle" });
  const [inFlightClip, setInFlightClip] = useState<string | null>(null);

  const runFetch = useCallback(
    async (targetClipId: string) => {
      setState((previous) => ({ ...previous, status: "loading", error: null }));
      setInFlightClip(targetClipId);

      try {
        const payload = await fetchMetrics(targetClipId);
        setState({ data: payload, error: null, status: "success" });
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error("Unable to load metrics");
        setState((previous) => ({ ...previous, error: normalized, status: "error" }));
      } finally {
        setInFlightClip(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!clipId) {
      setState({ data: null, error: null, status: "idle" });
      return;
    }

    void runFetch(clipId);
  }, [clipId, runFetch]);

  const isLoading = state.status === "loading" && Boolean(inFlightClip);
  const isFetching = isLoading;

  const refetch = useCallback(async () => {
    if (!clipId) {
      return;
    }
    await runFetch(clipId);
  }, [clipId, runFetch]);

  return useMemo(
    () => ({
      data: state.data,
      error: state.error,
      isLoading,
      isFetching,
      refetch,
    }),
    [state.data, state.error, isLoading, isFetching, refetch]
  );
}

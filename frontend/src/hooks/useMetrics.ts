import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest, ApiError } from "../utils/api";
import type { MetricsResponse } from "../types/metrics";

export interface MetricsState {
  data: MetricsResponse | null;
  status: "idle" | "loading" | "success" | "error";
  error: Error | null;
}

function normalizeError(error: unknown, fallback: string): Error {
  if (error instanceof ApiError) {
    return new Error(error.message || fallback);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

async function fetchMetrics(windowParam: string | null | undefined): Promise<MetricsResponse> {
  const search = windowParam ? `?window=${encodeURIComponent(windowParam)}` : "";
  return apiRequest<MetricsResponse>(`/api/metrics${search}`, { method: "GET" });
}

export function useMetrics({
  window: metricsWindow = "24h",
  pollInterval = 15000,
  enabled = true,
}: {
  window?: "12h" | "24h" | "7d" | null;
  pollInterval?: number;
  enabled?: boolean;
} = {}) {
  const [state, setState] = useState<MetricsState>({ data: null, status: "idle", error: null });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  const runFetch = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const payload = await fetchMetrics(metricsWindow);
      if (!isMountedRef.current) {
        return;
      }
      setState({ data: payload, status: "success", error: null });
      return payload;
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      const normalised = normalizeError(error, "Unable to load metrics.");
      setState((previous) => ({ ...previous, status: "error", error: normalised }));
    }
  }, [enabled, metricsWindow]);

  const scheduleNext = useCallback(() => {
    if (!enabled || pollInterval <= 0) {
      return;
    }

    timerRef.current = setTimeout(() => {
      void runFetch();
      scheduleNext();
    }, pollInterval);
  }, [enabled, pollInterval, runFetch]);

  useEffect(() => {
    isMountedRef.current = true;
    void runFetch().then(() => {
      scheduleNext();
    });
    return () => {
      isMountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [runFetch, scheduleNext]);

  const refetch = useCallback(async () => {
    if (!enabled) {
      return;
    }
    await runFetch();
  }, [enabled, runFetch]);

  return useMemo(
    () => ({
      data: state.data,
      status: state.status,
      error: state.error,
      isLoading: state.status === "loading",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      refetch,
    }),
    [refetch, state.data, state.error, state.status],
  );
}

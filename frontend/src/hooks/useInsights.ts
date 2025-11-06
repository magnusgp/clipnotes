import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiRequest } from "../utils/api";
import type { InsightResponse, InsightWindow } from "../types/insights";

export interface InsightState {
  data: InsightResponse | null;
  status: "idle" | "loading" | "success" | "error";
  error: Error | null;
}

interface UseInsightsOptions {
  window?: InsightWindow;
  enabled?: boolean;
}

interface FetchOptions {
  preserveData?: boolean;
}

const DEFAULT_WINDOW: InsightWindow = "24h";

async function fetchInsights(windowParam: InsightWindow): Promise<InsightResponse> {
  const search = windowParam ? `?window=${encodeURIComponent(windowParam)}` : "";
  return apiRequest<InsightResponse>(`/api/insights${search}`, { method: "GET" });
}

async function regenerateInsights(windowParam: InsightWindow): Promise<InsightResponse> {
  return apiRequest<InsightResponse>("/api/insights/regenerate", {
    method: "POST",
    json: { window: windowParam },
  });
}

function normalizeError(error: unknown): Error {
  if (error instanceof ApiError) {
    return new Error(error.message || "Unable to load insights.");
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Unable to load insights.");
}

export function useInsights(options: UseInsightsOptions = {}) {
  const { window: initialWindow = DEFAULT_WINDOW, enabled = true } = options;
  const [state, setState] = useState<InsightState>({ data: null, status: "idle", error: null });
  const [insightWindow, setInsightWindowState] = useState<InsightWindow>(initialWindow);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (insightWindow === initialWindow) {
      return;
    }
    setInsightWindowState(initialWindow);
  }, [initialWindow, insightWindow]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSnapshot = useCallback(
    async (windowParam: InsightWindow, options: FetchOptions = {}) => {
      if (!enabled) {
        return null;
      }

      const preserveData = Boolean(options.preserveData);
      const requestId = ++requestIdRef.current;

      setState((previous) => ({
        data: preserveData ? previous.data : null,
        status: "loading",
        error: null,
      }));

      try {
        const payload = await fetchInsights(windowParam);
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return null;
        }
        setState({ data: payload, status: "success", error: null });
        return payload;
      } catch (error) {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return null;
        }
        const normalized = normalizeError(error);
        setState((previous) => ({
          data: preserveData ? previous.data : null,
          status: "error",
          error: normalized,
        }));
        return null;
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void fetchSnapshot(insightWindow);
  }, [enabled, insightWindow, fetchSnapshot]);

  const setWindow = useCallback(
    (nextWindow: InsightWindow) => {
      setInsightWindowState((previous) => {
        if (previous === nextWindow) {
          void fetchSnapshot(nextWindow, { preserveData: Boolean(state.data) });
          return previous;
        }
        return nextWindow;
      });
    },
    [fetchSnapshot, state.data],
  );

  const regenerate = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsRegenerating(true);
    setState((previous) => ({ ...previous, error: null }));

    try {
      const payload = await regenerateInsights(insightWindow);
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return payload;
      }
      setState({ data: payload, status: "success", error: null });
      return payload;
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        if (error instanceof Error) {
          throw error;
        }
        throw normalizeError(error);
      }
      const normalized = normalizeError(error);
      setState((previous) => ({
        data: previous.data,
        status: "error",
        error: normalized,
      }));
      throw normalized;
    } finally {
      if (mountedRef.current) {
        setIsRegenerating(false);
      }
    }
  }, [enabled, insightWindow]);

  const refetch = useCallback(async () => {
    if (!enabled) {
      return;
    }
    await fetchSnapshot(insightWindow, { preserveData: Boolean(state.data) });
  }, [enabled, fetchSnapshot, insightWindow, state.data]);

  return useMemo(
    () => ({
      window: insightWindow,
      data: state.data,
      status: state.status,
      error: state.error,
      isLoading: state.status === "loading",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      isRegenerating,
      setWindow,
      regenerate,
      refetch,
    }),
    [insightWindow, state.data, state.error, state.status, isRegenerating, regenerate, refetch, setWindow],
  );
}

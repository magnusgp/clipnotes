import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, apiRequest } from "../utils/api";
import type { InsightResponse, InsightShareResponse, InsightWindow } from "../types/insights";

interface InsightShareState {
  data: InsightResponse | null;
  status: "idle" | "loading" | "success" | "error";
  error: Error | null;
}

interface UseInsightShareOptions {
  token?: string;
  window?: InsightWindow;
  enabled?: boolean;
}

function normalizeError(reason: unknown): Error {
  if (reason instanceof ApiError) {
    return new Error(reason.message || "Unable to process insight share request.");
  }
  if (reason instanceof Error) {
    return reason;
  }
  return new Error("Unable to process insight share request.");
}

export function useInsightShare(options: UseInsightShareOptions = {}) {
  const { token, window: initialWindow, enabled = true } = options;
  const [state, setState] = useState<InsightShareState>({ data: null, status: "idle", error: null });
  const [isCreating, setIsCreating] = useState(false);

  const fetchSnapshot = useCallback(
    async (tokenOverride?: string, windowOverride?: InsightWindow) => {
      const activeToken = tokenOverride ?? token;
      const activeWindow = windowOverride ?? initialWindow;

      if (!enabled || !activeToken) {
        return null;
      }

      setState((previous) => ({ data: previous.data, status: "loading", error: null }));

      const query = activeWindow ? `?window=${encodeURIComponent(activeWindow)}` : "";

      try {
        const payload = await apiRequest<InsightResponse>(`/api/insights/share/${activeToken}${query}`, { method: "GET" });
        setState({ data: payload, status: "success", error: null });
        return payload;
      } catch (error) {
        const normalized = normalizeError(error);
        setState((previous) => ({ data: previous.data, status: "error", error: normalized }));
        return null;
      }
    },
    [enabled, token, initialWindow],
  );

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }
    void fetchSnapshot(token, initialWindow);
  }, [enabled, fetchSnapshot, token, initialWindow]);

  const createShare = useCallback(
    async (windowParam: InsightWindow): Promise<InsightShareResponse> => {
      setIsCreating(true);
      try {
        return await apiRequest<InsightShareResponse>("/api/insights/share", {
          method: "POST",
          json: { window: windowParam },
        });
      } catch (error) {
        throw normalizeError(error);
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      data: state.data,
      status: state.status,
      error: state.error,
      isLoading: state.status === "loading",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      isCreating,
      createShare,
      refetch: fetchSnapshot,
    }),
    [state.data, state.status, state.error, isCreating, createShare, fetchSnapshot],
  );
}

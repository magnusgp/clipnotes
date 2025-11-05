import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { FeatureFlagMap, FlagsResponse } from "./types/config";
import { apiRequest } from "./utils/api";

export type FeatureFlagStatus = "idle" | "loading" | "ready" | "error";

interface FeatureFlagContextValue {
  flags: FeatureFlagMap;
  status: FeatureFlagStatus;
  error: Error | null;
  refresh: () => Promise<FeatureFlagMap | void>;
  isLoading: boolean;
  isReady: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export const DEFAULT_FLAGS: FeatureFlagMap = {
  ENABLE_GRAPH_VIEW: true,
  ENABLE_LIVE_MODE: false,
};

async function fetchFlags(): Promise<FeatureFlagMap> {
  const response = await apiRequest<FlagsResponse>("/api/config/flags", { method: "GET" });
  return { ...DEFAULT_FLAGS, ...response.flags };
}

interface FeatureFlagProviderProps {
  children: ReactNode;
  /** Optional flags provided in tests or server-side rendering to skip network calls. */
  initialFlags?: FeatureFlagMap;
  /** When true, flags will be loaded from the API on mount. */
  loadFromServer?: boolean;
}

export function FeatureFlagProvider({ children, initialFlags, loadFromServer = false }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagMap>(() => ({ ...DEFAULT_FLAGS, ...(initialFlags ?? {}) }));
  const [status, setStatus] = useState<FeatureFlagStatus>(() => {
    if (initialFlags) {
      return "ready";
    }
    return loadFromServer ? "loading" : "idle";
  });
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const nextFlags = await fetchFlags();
      setFlags(nextFlags);
      setStatus("ready");
      return nextFlags;
    } catch (error) {
      const normalised = error instanceof Error ? error : new Error("Unable to load feature flags.");
      setError(normalised);
      setStatus("error");
      throw normalised;
    }
  }, []);

  useEffect(() => {
    if (loadFromServer && status === "loading" && !initialFlags) {
      void refresh();
    }
  }, [loadFromServer, initialFlags, refresh, status]);

  const contextValue = useMemo<FeatureFlagContextValue>(
    () => ({
      flags,
      status,
      error,
      refresh,
      isLoading: status === "loading",
      isReady: status === "ready",
    }),
    [error, flags, refresh, status],
  );

  return createElement(FeatureFlagContext.Provider, { value: contextValue }, children);
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  }
  return context;
}

export function isFeatureEnabled(flags: FeatureFlagMap, key: string, fallback = false): boolean {
  return typeof flags[key] === "boolean" ? Boolean(flags[key]) : fallback;
}

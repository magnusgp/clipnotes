import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest, ApiError } from "../utils/api";
import type {
  ConfigResponse,
  ConfigUpdateRequest,
  FeatureFlagMap,
  KeyStatusResponse,
  ModelParams,
  ThemeOverrides,
} from "../types/config";

export type ConfigStatus = "idle" | "loading" | "success" | "error";
export type PendingConfigAction = "model" | "flags" | "theme" | null;

interface ConfigHookState {
  config: ConfigResponse | null;
  status: ConfigStatus;
  error: Error | null;
}

interface HafniaKeyState {
  status: ConfigStatus;
  data: KeyStatusResponse | null;
  error: Error | null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed || null;
  }

  if (typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const errorNode = record.error;

  if (errorNode && typeof errorNode === "object") {
    const nested = errorNode as Record<string, unknown>;
    const message = nested.message ?? nested.detail;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  const detail = record.detail ?? record.message;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  return null;
}

function normaliseError(error: unknown, fallback: string): Error {
  if (error instanceof ApiError) {
    const message = extractErrorMessage(error.payload) ?? fallback;
    return new Error(message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

function cloneConfig(config: ConfigResponse): ConfigResponse {
  return {
    ...config,
    model: { ...config.model },
    flags: { ...config.flags },
    theme: config.theme ? { ...config.theme } : config.theme,
  };
}

function applyOptimisticUpdate(base: ConfigResponse, payload: ConfigUpdateRequest): ConfigResponse {
  const optimistic = cloneConfig(base);

  if (payload.model) {
    optimistic.model = { ...optimistic.model, ...payload.model };
  }

  if (payload.flags) {
    optimistic.flags = { ...payload.flags };
  }

  if (Object.prototype.hasOwnProperty.call(payload, "theme")) {
    optimistic.theme = payload.theme ?? null;
  }

  return optimistic;
}

async function loadConfig(): Promise<ConfigResponse> {
  try {
    return await apiRequest<ConfigResponse>("/api/config", { method: "GET" });
  } catch (error) {
    throw normaliseError(error, "Unable to load configuration.");
  }
}

async function loadHafniaKeyStatus(): Promise<KeyStatusResponse> {
  try {
    return await apiRequest<KeyStatusResponse>("/api/keys/hafnia", { method: "GET" });
  } catch (error) {
    throw normaliseError(error, "Unable to load Hafnia key status.");
  }
}

async function persistConfig(payload: ConfigUpdateRequest): Promise<ConfigResponse> {
  try {
    return await apiRequest<ConfigResponse>("/api/config", {
      method: "PUT",
      json: payload,
    });
  } catch (error) {
    throw normaliseError(error, "Unable to save configuration.");
  }
}

async function persistHafniaKey(value: string): Promise<KeyStatusResponse> {
  try {
    return await apiRequest<KeyStatusResponse>("/api/keys/hafnia", {
      method: "POST",
      json: { key: value },
    });
  } catch (error) {
    throw normaliseError(error, "Unable to save Hafnia API key.");
  }
}

export function useConfigManager() {
  const [state, setState] = useState<ConfigHookState>({ config: null, status: "idle", error: null });
  const [pendingAction, setPendingAction] = useState<PendingConfigAction>(null);
  const configRef = useRef<ConfigResponse | null>(null);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const payload = await loadConfig();
      configRef.current = payload;
      setState({ config: payload, status: "success", error: null });
      return payload;
    } catch (error) {
      const normalised = normaliseError(error, "Unable to load configuration.");
      setState((previous) => ({
        config: previous.config,
        status: previous.config ? "success" : "error",
        error: normalised,
      }));
      throw normalised;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runUpdate = useCallback(
    async (payload: ConfigUpdateRequest, action: PendingConfigAction): Promise<ConfigResponse> => {
      const existing = configRef.current ? cloneConfig(configRef.current) : null;

      setPendingAction(action);
      setState((previous) => ({ ...previous, error: null }));

      if (existing) {
        const optimistic = applyOptimisticUpdate(existing, payload);
        configRef.current = optimistic;
        setState({ config: optimistic, status: "success", error: null });
      }

      try {
        const response = await persistConfig(payload);
        configRef.current = response;
        setState({ config: response, status: "success", error: null });
        return response;
      } catch (error) {
        const normalised = normaliseError(error, "Unable to save configuration.");
        if (existing) {
          configRef.current = existing;
          setState({ config: existing, status: "success", error: normalised });
        } else {
          setState((previous) => ({ ...previous, error: normalised }));
        }
        throw normalised;
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const saveModelParams = useCallback(
    async (model: ModelParams) => {
      return runUpdate({ model }, "model");
    },
    [runUpdate],
  );

  const saveFlags = useCallback(
    async (flags: FeatureFlagMap) => {
      return runUpdate({ flags }, "flags");
    },
    [runUpdate],
  );

  const saveTheme = useCallback(
    async (theme: ThemeOverrides | null | undefined) => {
      return runUpdate({ theme }, "theme");
    },
    [runUpdate],
  );

  const derived = useMemo(
    () => ({
      config: state.config,
      flags: state.config?.flags ?? {},
      model: state.config?.model,
      theme: state.config?.theme ?? null,
      status: state.status,
      error: state.error,
      isLoading: state.status === "loading" && !state.config,
      isRefreshing: state.status === "loading" && Boolean(state.config),
      pendingAction,
    }),
    [state.config, state.error, state.status, pendingAction],
  );

  return {
    ...derived,
    refresh,
    saveModelParams,
    saveFlags,
    saveTheme,
    isSavingModel: pendingAction === "model",
    isSavingFlags: pendingAction === "flags",
    isSavingTheme: pendingAction === "theme",
  };
}

export function useHafniaKeyManager() {
  const [state, setState] = useState<HafniaKeyState>({ status: "idle", data: null, error: null });
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, status: previous.data ? "loading" : "idle", error: null }));

    try {
      const payload = await loadHafniaKeyStatus();
      setState({ status: "success", data: payload, error: null });
      return payload;
    } catch (error) {
      const normalised = normaliseError(error, "Unable to load Hafnia key status.");
      setState((previous) => ({
        data: previous.data,
        status: previous.data ? "success" : "error",
        error: normalised,
      }));
      throw normalised;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveKey = useCallback(
    async (value: string) => {
      setIsSaving(true);
      setState((previous) => ({ ...previous, error: null }));

      try {
        const response = await persistHafniaKey(value);
        setState({ status: "success", data: response, error: null });
        return response;
      } catch (error) {
        const normalised = normaliseError(error, "Unable to save Hafnia API key.");
        setState((previous) => ({ ...previous, error: normalised, status: previous.data ? "success" : "error" }));
        throw normalised;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    isSaving,
    refresh,
    saveKey,
  };
}


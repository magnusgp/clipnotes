import { useCallback, useEffect, useRef, useState } from "react";

export interface ClipListItem {
  clip_id: string;
  filename: string;
  status: string;
  created_at: string;
  last_analysis_at: string | null;
  latency_ms: number | null;
}

interface ClipListResponse {
  items: ClipListItem[];
}

interface UseClipsState {
  clips: ClipListItem[];
  status: "idle" | "loading" | "error";
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const nestedError = payload.error;
  if (isRecord(nestedError)) {
    const candidate = nestedError.message ?? nestedError.detail;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  const detail = payload.detail ?? payload.message;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
}

export function useClips() {
  const [state, setState] = useState<UseClipsState>({ clips: [], status: "idle" });
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "loading", error: undefined }));

    try {
      const response = await fetch("/api/clips", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const fallback = `Unable to load clips (status ${response.status})`;
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        const message = extractMessage(payload, fallback);
        throw new Error(message);
      }

      const payload = (await response.json()) as ClipListResponse;
      if (!isMounted.current) {
        return;
      }

      setState({ clips: payload.items ?? [], status: "idle" });
    } catch (error) {
      if (!isMounted.current) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unexpected error while loading clips.";
      setState((previous) => ({ ...previous, status: "error", error: message }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    clips: state.clips,
    error: state.error,
    status: state.status,
    isLoading: state.status === "loading",
    refresh,
  };
}

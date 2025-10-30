import { useCallback, useRef, useState } from "react";

export type AnalyzeStatus = "idle" | "uploading" | "success" | "error";

export interface SummaryJson {
  data: Record<string, unknown>;
}

export interface SummaryResponse {
  submission_id: string;
  summary: string[];
  structured_summary?: SummaryJson | null;
  latency_ms: number;
  completed_at: string;
}

interface AnalyzeState {
  status: AnalyzeStatus;
  summary?: SummaryResponse;
  error?: string;
  fileName?: string;
  pendingFileName?: string;
}

const INITIAL_STATE: AnalyzeState = {
  status: "idle",
};

type ErrorPayload = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload)) {
      const details = payload as ErrorPayload;
      return (
        asString(details.detail) ??
        asString(details.error) ??
        asString(details.message) ??
        fallback
      );
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>(INITIAL_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (file: File) => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setState((previous) => ({
      ...previous,
      status: "uploading",
      pendingFileName: file.name,
      error: undefined,
    }));

    const formData = new FormData();
    formData.append("file", file, file.name);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        credentials: "same-origin",
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        throw new Error(message);
      }

  const payload = (await response.json()) as SummaryResponse;
      setState({
        status: "success",
        summary: payload,
        fileName: file.name,
        pendingFileName: undefined,
        error: undefined,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Cancellation handled separately; avoid clobbering state.
        return;
      }

      const message = error instanceof Error ? error.message : "Unexpected error";
      setState((previous) => ({
        ...previous,
        status: "error",
        error: message,
        pendingFileName: undefined,
      }));
    } finally {
      controllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (!controllerRef.current) {
      return;
    }

    controllerRef.current.abort();
    controllerRef.current = null;

    setState((previous) => ({
      ...previous,
      status: previous.summary ? "success" : "idle",
      error: undefined,
      pendingFileName: undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    analyze,
    cancel,
    reset,
    isLoading: state.status === "uploading",
  };
}

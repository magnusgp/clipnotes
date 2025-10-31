import { useCallback, useEffect, useRef, useState } from "react";

export type AnalyzeStatus = "idle" | "loading" | "uploading" | "success" | "error";

export interface SummaryJson {
  data: Record<string, unknown>;
}

export interface SummaryResponse {
  submission_id: string;
  asset_id: string;
  summary: string[];
  structured_summary?: SummaryJson | null;
  latency_ms: number;
  completed_at: string;
  completion_id?: string | null;
}

export interface AnalysisMoment {
  start_s: number;
  end_s: number;
  label: string;
  severity: "low" | "medium" | "high";
}

export interface ClipAnalysis {
  clip_id: string;
  summary: string | null;
  moments: AnalysisMoment[];
  raw: Record<string, unknown>;
  created_at: string;
  latency_ms: number | null;
  prompt?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface ChatResponse {
  submission_id: string;
  asset_id: string;
  message: string;
  completion_id?: string | null;
}

export interface ChatHistoryEntry {
  id: string;
  prompt: string;
  response: string;
  completionId?: string | null;
  createdAt: string;
}

export interface SessionEntry {
  clipId?: string;
  registeredFileName?: string;
  submissionId: string;
  assetId: string;
  fileName?: string;
  summary?: SummaryResponse;
  analysis?: ClipAnalysis;
  chats: ChatHistoryEntry[];
  lastUpdated: string;
  isChatting: boolean;
  chatError?: string;
  chatRemediation?: string;
  isDeleting: boolean;
  deleteError?: string;
  deleteRemediation?: string;
}

interface AnalyzeState {
  status: AnalyzeStatus;
  summary?: SummaryResponse;
  analysis?: ClipAnalysis;
  history: SessionEntry[];
  error?: string;
  remediation?: string;
  fileName?: string;
  pendingFileName?: string;
  statusChangedAt?: string;
}

const INITIAL_STATE: AnalyzeState = {
  status: "idle",
  history: [],
};

export interface ClipRegistration {
  clip_id: string;
  filename: string;
  asset_id: string | null;
  status: string;
  created_at: string;
  last_analysis_at: string | null;
  latency_ms: number | null;
}

interface ClipDetailResponse {
  clip: ClipRegistration;
  analysis: ClipAnalysis | null;
}

interface UseAnalyzeOptions {
  onClipRegistered?: (clip: ClipRegistration) => void | Promise<void>;
  onClipsRefreshed?: () => void | Promise<void>;
}

type ErrorPayload = {
  error?: unknown;
  detail?: unknown;
  message?: unknown;
  remediation?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

class AnalyzeRequestError extends Error {
  remediation?: string;

  constructor(message: string, remediation?: string) {
    super(message);
    this.name = "AnalyzeRequestError";
    this.remediation = remediation;
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

async function parseErrorResponse(response: Response): Promise<AnalyzeRequestError> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload)) {
      const details = payload as ErrorPayload;
      if (isRecord(details.error)) {
        const nested = details.error;
        const message =
          asString(nested.message) ??
          asString(nested.detail) ??
          asString(details.message) ??
          fallback;
        const remediation = asString(nested.remediation) ?? asString(details.remediation) ?? undefined;
        return new AnalyzeRequestError(message, remediation);
      }

      const message =
        asString(details.detail) ??
        asString(details.message) ??
        fallback;
      const remediation = asString(details.remediation) ?? undefined;
      return new AnalyzeRequestError(message, remediation);
    }
  } catch {
    return new AnalyzeRequestError(fallback);
  }

  return new AnalyzeRequestError(fallback);
}

export function useAnalyze(options?: UseAnalyzeOptions) {
  return useAnalyzeInternal(options);
}

function useAnalyzeInternal(options?: UseAnalyzeOptions) {
  const [state, setState] = useState<AnalyzeState>(INITIAL_STATE);
  const controllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef<UseAnalyzeOptions | undefined>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const analyze = useCallback(async (file: File) => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setState((previous) => ({
      ...previous,
      status: "uploading",
      pendingFileName: file.name,
      error: undefined,
      remediation: undefined,
      statusChangedAt: new Date().toISOString(),
    }));

    let registeredClip: ClipRegistration | undefined;

    try {
      const clipResponse = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ filename: file.name }),
        signal: controller.signal,
      });

      if (!clipResponse.ok) {
        throw await parseErrorResponse(clipResponse);
      }

      registeredClip = (await clipResponse.json()) as ClipRegistration;

      const formData = new FormData();
      formData.append("file", file, file.name);

      const assetResponse = await fetch(`/api/clips/${registeredClip.clip_id}/asset`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        credentials: "same-origin",
      });

      if (!assetResponse.ok) {
        throw await parseErrorResponse(assetResponse);
      }

      registeredClip = (await assetResponse.json()) as ClipRegistration;
      await optionsRef.current?.onClipRegistered?.(registeredClip);

      const analysisResponse = await fetch(`/api/analysis/${registeredClip.clip_id}`, {
        method: "POST",
        signal: controller.signal,
        credentials: "same-origin",
      });

      if (!analysisResponse.ok) {
        throw await parseErrorResponse(analysisResponse);
      }

      const analysisPayload = (await analysisResponse.json()) as ClipAnalysis;
      const completedAt = analysisPayload.created_at ?? new Date().toISOString();

      setState((previous) => {
        const displayFileName = file.name;
    const clipRecord = registeredClip;
    const registeredFileName = clipRecord?.filename ?? file.name;
    const clipId = clipRecord?.clip_id ?? analysisPayload.clip_id;
    const rawAssetId = asString(analysisPayload.raw["asset_id"]);
    const assetId = clipRecord?.asset_id ?? rawAssetId ?? clipId;
        const newEntry: SessionEntry = {
          clipId,
          registeredFileName,
          submissionId: clipId,
          assetId,
          fileName: displayFileName,
          summary: undefined,
          analysis: analysisPayload,
          chats: [],
          lastUpdated: completedAt,
          isChatting: false,
          isDeleting: false,
        };

        const filteredHistory = previous.history.filter(
          (entry) => entry.submissionId !== newEntry.submissionId
        );

        return {
          ...previous,
          status: "success",
          summary: undefined,
          analysis: analysisPayload,
          fileName: displayFileName,
          pendingFileName: undefined,
          error: undefined,
          remediation: undefined,
          statusChangedAt: completedAt,
          history: [newEntry, ...filteredHistory],
        };
      });

      await optionsRef.current?.onClipsRefreshed?.();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : "Unexpected error";
      const remediation =
        error instanceof AnalyzeRequestError ? error.remediation : undefined;
      setState((previous) => ({
        ...previous,
        status: "error",
        error: message,
        remediation,
        pendingFileName: undefined,
        fileName: previous.pendingFileName ?? previous.fileName,
        statusChangedAt: new Date().toISOString(),
      }));
    } finally {
      controllerRef.current = null;
    }
  }, []);

  const sendChat = useCallback(async (submissionId: string, prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    setState((previous) => ({
      ...previous,
      history: previous.history.map((entry) =>
        entry.submissionId === submissionId
          ? {
              ...entry,
              isChatting: true,
              chatError: undefined,
              chatRemediation: undefined,
            }
          : entry
      ),
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ submission_id: submissionId, prompt: trimmedPrompt }),
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const payload = (await response.json()) as ChatResponse;
      const createdAt = new Date().toISOString();
      const chatEntry: ChatHistoryEntry = {
        id: payload.completion_id ?? generateId(),
        prompt: trimmedPrompt,
        response: payload.message,
        completionId: payload.completion_id ?? null,
        createdAt,
      };

      setState((previous) => {
        const updatedHistory = previous.history.map((entry) => {
          if (entry.submissionId !== submissionId) {
            return entry;
          }

          const updatedSummary =
            entry.summary && entry.summary.submission_id === submissionId
              ? {
                  ...entry.summary,
                  completion_id: payload.completion_id ?? entry.summary.completion_id ?? null,
                }
              : entry.summary;

          return {
            ...entry,
            isChatting: false,
            chats: [chatEntry, ...entry.chats],
            lastUpdated: createdAt,
            summary: updatedSummary,
          };
        });

        const isActiveSummary = previous.summary?.submission_id === submissionId;

        return {
          ...previous,
          history: updatedHistory,
          summary: isActiveSummary
            ? {
                ...previous.summary!,
                completion_id: payload.completion_id ?? previous.summary?.completion_id ?? null,
              }
            : previous.summary,
          statusChangedAt: isActiveSummary ? createdAt : previous.statusChangedAt,
        };
      });
    } catch (error) {
      const message =
        error instanceof AnalyzeRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to fetch follow-up response.";
      const remediation =
        error instanceof AnalyzeRequestError ? error.remediation : undefined;

      setState((previous) => ({
        ...previous,
        history: previous.history.map((entry) =>
          entry.submissionId === submissionId
            ? {
                ...entry,
                isChatting: false,
                chatError: message,
                chatRemediation: remediation,
              }
            : entry
        ),
      }));
    }
  }, []);

  const deleteSession = useCallback(async (submissionId: string) => {
    setState((previous) => ({
      ...previous,
      history: previous.history.map((entry) =>
        entry.submissionId === submissionId
          ? {
              ...entry,
              isDeleting: true,
              deleteError: undefined,
              deleteRemediation: undefined,
            }
          : entry
      ),
    }));

    try {
      const response = await fetch(`/api/assets/${submissionId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      setState((previous) => {
        const filteredHistory = previous.history.filter(
          (entry) => entry.submissionId !== submissionId
        );

        const isActiveSummary = previous.summary?.submission_id === submissionId;
        const isActiveAnalysis = previous.analysis?.clip_id === submissionId;

        if (!isActiveSummary && !isActiveAnalysis) {
          return {
            ...previous,
            history: filteredHistory,
          };
        }

        return {
          ...previous,
          history: filteredHistory,
          summary: isActiveSummary ? undefined : previous.summary,
          analysis: isActiveAnalysis ? undefined : previous.analysis,
          status: "idle",
          fileName: undefined,
          statusChangedAt: undefined,
        };
      });

      await optionsRef.current?.onClipsRefreshed?.();
    } catch (error) {
      const message =
        error instanceof AnalyzeRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to delete session.";
      const remediation =
        error instanceof AnalyzeRequestError ? error.remediation : undefined;

      setState((previous) => ({
        ...previous,
        history: previous.history.map((entry) =>
          entry.submissionId === submissionId
            ? {
                ...entry,
                isDeleting: false,
                deleteError: message,
                deleteRemediation: remediation,
              }
            : entry
        ),
      }));
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
      status: previous.analysis || previous.summary ? "success" : "idle",
      error: undefined,
      remediation: undefined,
      pendingFileName: undefined,
      statusChangedAt: previous.analysis
        ? previous.analysis.created_at ?? previous.statusChangedAt
        : previous.summary
          ? previous.summary.completed_at ?? previous.statusChangedAt
          : undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState((previous) => ({
      ...previous,
      status: "idle",
      summary: undefined,
      analysis: undefined,
      fileName: undefined,
      error: undefined,
      remediation: undefined,
      pendingFileName: undefined,
      statusChangedAt: undefined,
    }));
  }, []);

  const selectSession = useCallback(async (submissionId: string) => {
    let shouldFetch = false;

    setState((previous) => {
      const entry = previous.history.find((item) => item.submissionId === submissionId);
      if (entry) {
        return {
          ...previous,
          status: entry.analysis || entry.summary ? "success" : "idle",
          summary: entry.summary,
          analysis: entry.analysis,
          fileName: entry.fileName ?? entry.registeredFileName,
          error: undefined,
          remediation: undefined,
          pendingFileName: undefined,
          statusChangedAt: entry.lastUpdated,
        };
      }

      shouldFetch = true;
      return {
        ...previous,
        status: "loading",
        summary: undefined,
        analysis: undefined,
        fileName: undefined,
        error: undefined,
        remediation: undefined,
        pendingFileName: undefined,
        statusChangedAt: new Date().toISOString(),
      };
    });

    if (!shouldFetch) {
      return;
    }

    try {
      const response = await fetch(`/api/clips/${submissionId}`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const payload = (await response.json()) as ClipDetailResponse;
      const { clip, analysis } = payload;

      const completedAt =
        analysis?.created_at ??
        clip.last_analysis_at ??
        new Date().toISOString();
      const rawAssetId = analysis?.raw ? asString(analysis.raw["asset_id"]) : null;
      const assetId = clip.asset_id ?? rawAssetId ?? submissionId;

      const newEntry: SessionEntry = {
        clipId: clip.clip_id,
        registeredFileName: clip.filename,
        submissionId: clip.clip_id,
        assetId,
        fileName: clip.filename,
        summary: undefined,
        analysis: analysis ?? undefined,
        chats: [],
        lastUpdated: completedAt,
        isChatting: false,
        isDeleting: false,
      };

      setState((previous) => {
        const filteredHistory = previous.history.filter(
          (entry) => entry.submissionId !== newEntry.submissionId
        );

        return {
          ...previous,
          status: "success",
          summary: undefined,
          analysis: analysis ?? undefined,
          fileName: clip.filename,
          pendingFileName: undefined,
          error: undefined,
          remediation: undefined,
          statusChangedAt: completedAt,
          history: [newEntry, ...filteredHistory],
        };
      });
    } catch (error) {
      const message =
        error instanceof AnalyzeRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to load clip history.";
      const remediation =
        error instanceof AnalyzeRequestError ? error.remediation : undefined;

      setState((previous) => ({
        ...previous,
        status: "error",
        error: message,
        remediation,
        pendingFileName: undefined,
        statusChangedAt: new Date().toISOString(),
      }));
    }
  }, []);

  return {
    state,
    analyze,
    sendChat,
    deleteSession,
    cancel,
    reset,
  selectSession,
    isLoading: state.status === "uploading" || state.status === "loading",
  };
}

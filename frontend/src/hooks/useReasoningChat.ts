import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "../lib/api";

import type {
  ReasoningChatResponse,
  ReasoningChatPayload,
  ReasoningHistoryEntry,
} from "../types/reasoning";

interface UseReasoningChatOptions {
  selectionHash: string | null;
  clipIds: string[];
  storage?: Storage | null;
  maxEntries?: number;
}

interface SendMessageArgs {
  message: string;
}

const STORAGE_PREFIX = "clipnotes:reasoning:";
const DEFAULT_MAX_ENTRIES = 50;

type HistoryLike = unknown;

type ErrorShape = {
  error?: {
    message?: string;
    detail?: string;
  };
  message?: string;
  detail?: string;
};

function extractErrorMessage(payload: unknown, fallback: string): string {
  const value = payload as ErrorShape | undefined;
  const direct = value?.error?.message ?? value?.error?.detail;
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const generic = value?.message ?? value?.detail;
  if (typeof generic === "string" && generic.trim()) {
    return generic;
  }

  return fallback;
}

function resolveStorage(candidate?: Storage | null): Storage | null {
  if (candidate) {
    return candidate;
  }

  if (typeof window !== "undefined") {
    return window.localStorage;
  }

  return null;
}

function parseStoredHistory(value: string | null): ReasoningHistoryEntry[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as HistoryLike;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeHistoryEntry(entry))
        .filter((entry): entry is ReasoningHistoryEntry => entry !== null);
    }
  } catch {
    return [];
  }

  return [];
}

function isReasoningChatResponse(value: unknown): value is ReasoningChatResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.answer === "string" && typeof record.created_at === "string";
}

function normalizeHistoryEntry(candidate: HistoryLike): ReasoningHistoryEntry | null {
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const raw = candidate as Record<string, unknown>;
  const question = typeof raw.question === "string" ? raw.question : "";
  const answer = raw.answer;
  const createdAt = typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString();
  const clipIdsRaw = Array.isArray(raw.clip_ids) ? raw.clip_ids : [];
  const clipIds = clipIdsRaw
    .map((value) => (typeof value === "string" ? value : null))
    .filter((value): value is string => Boolean(value));

  if (!isReasoningChatResponse(answer)) {
    return null;
  }

  const identifier = typeof raw.id === "string" ? raw.id : generateEntryId();
  const answerType = typeof raw.answer_type === "string" ? raw.answer_type : "chat";

  return {
    id: identifier,
    clip_ids: clipIds,
    question,
    answer: answer,
    answer_type: answerType,
    created_at: createdAt,
  };
}

function generateEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useReasoningChat(options: UseReasoningChatOptions) {
  const { selectionHash, clipIds, storage, maxEntries = DEFAULT_MAX_ENTRIES } = options;
  const resolvedStorage = useMemo(() => resolveStorage(storage), [storage]);
  const storageKey = useMemo(() => {
    if (!selectionHash) {
      return null;
    }
    return `${STORAGE_PREFIX}${selectionHash}`;
  }, [selectionHash]);

  const [history, setHistory] = useState<ReasoningHistoryEntry[]>([]);

  useEffect(() => {
    if (!storageKey || !resolvedStorage) {
      setHistory([]);
      return;
    }

    const stored = parseStoredHistory(resolvedStorage.getItem(storageKey));
    setHistory(stored.slice(-maxEntries));
  }, [storageKey, resolvedStorage, maxEntries]);

  const mutation: UseMutationResult<
    ReasoningChatResponse,
    Error,
    SendMessageArgs,
    unknown
  > = useMutation<ReasoningChatResponse, Error, SendMessageArgs, unknown>({
    mutationFn: async ({ message }: SendMessageArgs) => {
      const payload: ReasoningChatPayload = {
        message,
        clips: clipIds,
      };

      const response = await api("/api/reasoning/chat", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallback = `Unable to send follow-up (status ${response.status})`;
        try {
          const parsed = (await response.json()) as ErrorShape;
          throw new Error(extractErrorMessage(parsed, fallback));
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error(fallback);
        }
      }

      return (await response.json()) as ReasoningChatResponse;
    },
  });

  const { mutateAsync, isPending, error } = mutation;

  const persistHistory = useCallback(
    (entries: ReasoningHistoryEntry[]) => {
      if (!storageKey || !resolvedStorage) {
        return;
      }
      try {
        resolvedStorage.setItem(storageKey, JSON.stringify(entries));
      } catch {
        // ignore storage errors (quota exceeded, etc.)
      }
    },
    [resolvedStorage, storageKey]
  );

  const adoptHistory = useCallback(
    (entries: ReasoningHistoryEntry[]) => {
      const normalized = entries
        .map((entry) => normalizeHistoryEntry(entry as HistoryLike))
        .filter((entry): entry is ReasoningHistoryEntry => entry !== null)
        .slice(-maxEntries);
      setHistory(normalized);
      persistHistory(normalized);
    },
    [maxEntries, persistHistory]
  );

  const sendMessage = useCallback(
    async ({ message }: SendMessageArgs) => {
      const trimmed = message.trim();
      if (!trimmed) {
        throw new Error("Message must not be empty.");
      }
      if (!clipIds.length) {
        throw new Error("At least one clip must be selected before sending a follow-up.");
      }

      const response = await mutateAsync({ message: trimmed });
      const entry: ReasoningHistoryEntry = {
        id: generateEntryId(),
        clip_ids: [...clipIds],
        question: trimmed,
        answer: response,
        answer_type: "chat",
        created_at: new Date().toISOString(),
      };

      setHistory((previous) => {
        const updated = [...previous, entry].slice(-maxEntries);
        persistHistory(updated);
        return updated;
      });

      return entry;
    },
    [clipIds, mutateAsync, maxEntries, persistHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (storageKey && resolvedStorage) {
      try {
        resolvedStorage.removeItem(storageKey);
      } catch {
        // ignore storage cleanup errors
      }
    }
  }, [resolvedStorage, storageKey]);

  return {
    history,
    sendMessage,
    isSending: isPending,
    error,
    clearHistory,
    adoptHistory,
  };
}

export type { SendMessageArgs };

/// <reference types="@testing-library/jest-dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useReasoningChat } from "../../src/hooks/useReasoningChat";

const CLIP_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
];
const SELECTION_HASH = "f4b0d0f4f6db4a3c8b9fa023bdc9fcb0";
const STORAGE_KEY = `clipnotes:reasoning:${SELECTION_HASH}`;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReasoningChat", () => {
  it("rehydrates_history_from_local_storage", () => {
    const storedHistory = [
      {
        id: "9f4cdb2e-87d8-4f9a-90df-f0b44d9b09af",
        question: "What changed after noon?",
        answer: {
          answer: "Clip alpha remained congested near zone 2.",
          created_at: "2025-11-01T12:45:00.000Z",
          clips: CLIP_IDS,
        },
        answer_type: "chat",
        created_at: "2025-11-01T12:45:01.000Z",
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedHistory));

    const { result } = renderHook(
      () =>
        useReasoningChat({
          selectionHash: SELECTION_HASH,
          clipIds: CLIP_IDS,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].question).toBe("What changed after noon?");
    expect(result.current.history[0].answer.answer).toContain("Clip alpha remained congested");
  });

  it("sends_follow_up_and_appends_history", async () => {
    const responsePayload = {
      answer: "Clip bravo now shows improved flow.",
      created_at: "2025-11-01T13:10:00.000Z",
      clips: CLIP_IDS,
      evidence: [],
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { result } = renderHook(
      () =>
        useReasoningChat({
          selectionHash: SELECTION_HASH,
          clipIds: CLIP_IDS,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.sendMessage({ message: "Is clip bravo recovering?" });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe("/api/reasoning/chat");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });

    const parsedBody = JSON.parse(String(init?.body));
    expect(parsedBody).toEqual({
      message: "Is clip bravo recovering?",
      clips: CLIP_IDS,
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].question).toBe("Is clip bravo recovering?");
    expect(result.current.history[0].answer.answer).toContain("Clip bravo now shows improved flow.");

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(String(stored));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].question).toBe("Is clip bravo recovering?");
  });

  it("surfaces_api_errors_without_mutating_history", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Clip analyses missing" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { result } = renderHook(
      () =>
        useReasoningChat({
          selectionHash: SELECTION_HASH,
          clipIds: CLIP_IDS,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.sendMessage({ message: "Can we compare lane occupancy?" })
      ).rejects.toThrow(/clip analyses missing/i);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.history).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

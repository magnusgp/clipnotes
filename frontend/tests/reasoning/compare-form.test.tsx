/// <reference types="@testing-library/jest-dom" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CompareForm from "../../src/components/reasoning/CompareForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import type { ClipListItem } from "../../src/hooks/useClips";

const CLIPS: ClipListItem[] = [
  {
    clip_id: "11111111-1111-1111-1111-111111111111",
    filename: "clip-alpha.mp4",
    status: "completed",
    created_at: "2025-10-30T15:30:00.000Z",
    last_analysis_at: "2025-10-30T15:45:00.000Z",
    latency_ms: 2800,
  },
  {
    clip_id: "22222222-2222-2222-2222-222222222222",
    filename: "clip-beta.mp4",
    status: "completed",
    created_at: "2025-10-29T14:20:00.000Z",
    last_analysis_at: "2025-10-29T14:36:00.000Z",
    latency_ms: 3100,
  },
  {
    clip_id: "33333333-3333-3333-3333-333333333333",
    filename: "clip-gamma.mp4",
    status: "completed",
    created_at: "2025-10-28T09:10:00.000Z",
    last_analysis_at: "2025-10-28T09:22:00.000Z",
    latency_ms: 2950,
  },
];

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const user = userEvent.setup();
  render(<CompareForm clips={CLIPS} />, { wrapper });

  const firstSelect = screen.getByLabelText(/first clip/i);
  const secondSelect = screen.getByLabelText(/second clip/i);
  const questionInput = screen.getByLabelText(/question/i);
  const submitButton = screen.getByRole("button", { name: /run comparison/i });

  return {
    user,
    firstSelect,
    secondSelect,
    questionInput,
    submitButton,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CompareForm", () => {
  it("requires_two_unique_clips_before_submit", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }));

    const { user, firstSelect, secondSelect, questionInput, submitButton } = setup();

    expect(submitButton).toBeDisabled();

    await user.selectOptions(firstSelect, CLIPS[0].clip_id);
    await user.type(questionInput, "Which clip has more congestion?");

    expect(submitButton).toBeDisabled();

    await user.selectOptions(secondSelect, CLIPS[0].clip_id);
    await user.click(submitButton);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/select two different clips/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits_question_and_displays_answer", async () => {
    const responsePayload = {
      answer: "clip_a",
      explanation: "Clip Alpha shows higher congestion near zone 3.",
      evidence: [
        {
          clip_id: CLIPS[0].clip_id,
          label: "Zone 3 congestion",
          timestamp_range: [12.5, 18.25],
          description: "Continuous vehicle queue across two cycles",
        },
        {
          clip_id: CLIPS[1].clip_id,
          label: "Zone 3 flow clears",
          timestamp_range: [14.0, 19.8],
          description: "Traffic clears in clip beta",
        },
      ],
      metrics: {
        counts_by_label: { congestion: 4 },
        severity_distribution: { high: 0.75, medium: 0.25 },
      },
      confidence: 0.82,
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { user, firstSelect, secondSelect, questionInput, submitButton } = setup();

    await user.selectOptions(firstSelect, CLIPS[0].clip_id);
    await user.selectOptions(secondSelect, CLIPS[1].clip_id);
    await user.clear(questionInput);
    await user.type(questionInput, "Which clip shows worse congestion in zone 3?");

    await user.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe("/api/reasoning/compare");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.headers).toMatchObject({ "Content-Type": "application/json" });

    const payload = JSON.parse(String(requestInit?.body));
    expect(payload).toEqual({
      clip_a: CLIPS[0].clip_id,
      clip_b: CLIPS[1].clip_id,
      question: "Which clip shows worse congestion in zone 3?",
    });

  expect(await screen.findByText(responsePayload.explanation)).toBeInTheDocument();
  expect(screen.getAllByText(/zone 3 congestion/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/confidence/i)).toHaveTextContent(/82%/);
  });

  it("handles_api_error_message", async () => {
    const errorPayload = {
      error: {
        code: "analysis_missing",
        message: "One or more clips are missing completed analyses.",
      },
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(errorPayload), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { user, firstSelect, secondSelect, questionInput, submitButton } = setup();

    await user.selectOptions(firstSelect, CLIPS[1].clip_id);
    await user.selectOptions(secondSelect, CLIPS[2].clip_id);
    await user.type(questionInput, "Are crosswalk violations comparable?");

    await user.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(errorPayload.error.message);
  });
});

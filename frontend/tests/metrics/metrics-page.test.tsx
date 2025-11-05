/// <reference types="@testing-library/jest-dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";

import { renderWithProviders } from "../test-utils/providers";
import MetricsPage from "../../src/pages/Metrics";

const BASE_PAYLOAD = {
  generated_at: "2025-11-03T15:30:00Z",
  total_clips: 42,
  total_analyses: 58,
  avg_latency_ms: 4800,
  requests_today: 37,
  clips_today: 12,
  per_hour: [
    { hour: "2025-11-03T14:00:00Z", requests: 5 },
    { hour: "2025-11-03T15:00:00Z", requests: 7 },
  ],
  per_day: [
    { date: "2025-11-02", requests: 18, analyses: 9 },
    { date: "2025-11-03", requests: 37, analyses: 12 },
  ],
  latency_flag: false,
  error_rate: 0.05,
};

describe("metrics dashboard polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls the metrics endpoint on the configured interval", async () => {
    const responses = [
      { ...BASE_PAYLOAD },
      { ...BASE_PAYLOAD, requests_today: 42 },
    ];

    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => {
      const payload = responses.shift();
      if (!payload) {
        throw new Error("Unexpected fetch call");
      }
      return new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    });

    renderWithProviders(<MetricsPage />, {
      featureFlags: { ENABLE_GRAPH_VIEW: true, ENABLE_LIVE_MODE: true },
    });

    const requestsTileLabel = await screen.findByText(/requests today/i);
    const requestsTile = requestsTileLabel.closest("div");
    expect(requestsTile).not.toBeNull();
    expect(within(requestsTile as HTMLElement).getByText("37")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15000);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(within(requestsTile as HTMLElement).getByText("42")).toBeInTheDocument();
    });
  });

  it("displays a latency warning when the snapshot flags elevated latency", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...BASE_PAYLOAD,
          latency_flag: true,
          avg_latency_ms: 7200,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    renderWithProviders(<MetricsPage />, {
      featureFlags: { ENABLE_GRAPH_VIEW: true },
    });

    await waitFor(() => {
      expect(screen.getByText(/average latency/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/latency threshold exceeded/i)).toBeInTheDocument();
    expect(screen.getByText("7.2 s")).toBeInTheDocument();
  });

  it("renders a disabled state when the metrics flag is off", async () => {
    renderWithProviders(<MetricsPage />, {
      featureFlags: { ENABLE_GRAPH_VIEW: false, ENABLE_LIVE_MODE: false },
    });

    expect(
      await screen.findByText(/metrics dashboard is hidden for this environment/i),
    ).toBeInTheDocument();
  });
});
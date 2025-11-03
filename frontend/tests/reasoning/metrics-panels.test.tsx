/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";

import AutoCharts from "../../src/components/reasoning/AutoCharts";
import GraphVisualizer from "../../src/components/reasoning/GraphVisualizer";
import { useReasoningMetrics } from "../../src/hooks/useReasoningMetrics";

const CLIP_ID = "11111111-1111-1111-1111-111111111111";

const METRICS_FIXTURE = {
  clip_id: CLIP_ID,
  counts_by_label: {
    collision: 2,
    berthing: 1,
  },
  durations_by_label: {
    collision: 9.5,
    berthing: 4,
  },
  severity_distribution: {
    high: 0.6,
    medium: 0.4,
  },
  object_graph: {
    nodes: [
      { id: "vessel-alpha", label: "Vessel Alpha" },
      { id: "tug-bravo", label: "Tug Bravo" },
    ],
    edges: [
      { source: "vessel-alpha", target: "tug-bravo", relation: "assisted" },
    ],
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReasoningMetrics", () => {
  it("fetches_metrics_for_clip_identifier", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(METRICS_FIXTURE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result, rerender } = renderHook(({ clipId }) => useReasoningMetrics(clipId), {
      initialProps: { clipId: null as string | null },
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      rerender({ clipId: CLIP_ID });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/reasoning/metrics/${CLIP_ID}`, expect.any(Object));
      expect(result.current.data?.clip_id).toBe(CLIP_ID);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes_error_state_when_request_fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "analysis missing" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result, rerender } = renderHook(({ clipId }) => useReasoningMetrics(clipId), {
      initialProps: { clipId: null as string | null },
    });

    await act(async () => {
      rerender({ clipId: CLIP_ID });
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toMatch(/analysis missing/i);
    });

    expect(result.current.data).toBeNull();
  });
});

describe("AutoCharts", () => {
  it("renders_counts_and_durations", () => {
    render(<AutoCharts metrics={METRICS_FIXTURE} />);

    expect(screen.getByText("Event counts")).toBeInTheDocument();
    expect(screen.getAllByText("collision")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/Time spent per label/i)).toBeInTheDocument();
    expect(screen.getByText(/9\.50/)).toBeInTheDocument();
    expect(screen.getByText(/Severity mix/i)).toBeInTheDocument();
  expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders_empty_state_when_metrics_missing", () => {
    render(<AutoCharts metrics={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/No metrics available/i);
  });
});

describe("GraphVisualizer", () => {
  it("lists_nodes_and_edges", () => {
    render(<GraphVisualizer graph={METRICS_FIXTURE.object_graph} />);

    expect(screen.getByText("Vessel Alpha")).toBeInTheDocument();
    expect(screen.getByText(/Identifier: vessel-alpha/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tug-bravo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/assisted/i)).toBeInTheDocument();
  });

  it("shows_placeholder_when_graph_missing", () => {
    render(<GraphVisualizer graph={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/not available/i);
  });
});

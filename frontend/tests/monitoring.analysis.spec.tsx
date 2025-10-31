import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import App from "../src/pages/App";

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

describe("Clip analysis flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers clip, triggers Hafnia analysis, and refreshes list", async () => {
    const clipResponse = {
      clip_id: "clip-123",
      filename: "dock.mp4",
      asset_id: null,
      status: "pending",
      created_at: "2025-10-30T12:00:00.000Z",
      last_analysis_at: null,
      latency_ms: null,
    };

    const clipWithAsset = {
      ...clipResponse,
      asset_id: "asset-clip-123",
    };

    const analysisResponse = {
      clip_id: clipResponse.clip_id,
      summary: "Analysis for dock.mp4 — overview",
      moments: [
        {
          start_s: 0,
          end_s: 5,
          label: "Opening",
          severity: "low",
        },
      ],
  raw: { clip_id: clipResponse.clip_id, asset_id: clipWithAsset.asset_id },
      created_at: "2025-10-30T12:01:00.000Z",
      latency_ms: 3200,
      prompt: null,
      error_code: null,
      error_message: null,
    };

    const listResponse = {
      items: [
        {
          clip_id: clipResponse.clip_id,
          filename: clipResponse.filename,
          status: "ready",
          created_at: clipResponse.created_at,
          last_analysis_at: analysisResponse.created_at,
          latency_ms: analysisResponse.latency_ms,
        },
      ],
    };

    let clipListCalls = 0;
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const method = init?.method ?? "GET";
      const url = getRequestUrl(input);

      if (url.endsWith("/api/clips") && method === "GET") {
        clipListCalls += 1;
        const body = clipListCalls === 1 ? { items: [] } : listResponse;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/clips") && method === "POST") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        expect(body).toMatchObject({ filename: "clip-to-register.mp4" });
        return new Response(JSON.stringify(clipResponse), { status: 201 });
      }

      if (url.endsWith(`/api/clips/${clipResponse.clip_id}/asset`) && method === "POST") {
        expect(init?.body).toBeInstanceOf(FormData);
        return new Response(JSON.stringify(clipWithAsset), { status: 202 });
      }

      if (url.endsWith(`/api/analysis/${clipResponse.clip_id}`) && method === "POST") {
        return new Response(JSON.stringify(analysisResponse), { status: 202 });
      }

      throw new Error(`Unexpected fetch call to ${url} (${method})`);
    });

    render(<App />);

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["video"], "clip-to-register.mp4", { type: "video/mp4" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/summary ready for clip-to-register.mp4/i)).toBeInTheDocument();
    expect(await screen.findByText(/analysis for dock.mp4/i)).toBeInTheDocument();

    const registeredClip = await screen.findByText(/dock.mp4/i);
    expect(registeredClip).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringMatching(/\/api\/clips$/), expect.objectContaining({ method: "POST" }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/clips\/clip-123\/asset$/),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analysis\/clip-123$/),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/analyze$/), expect.anything());
  });
});

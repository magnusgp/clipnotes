import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import App from "../src/pages/App";
import { setupAnalyzeFlowMock, type MockAnalyzeFlow } from "./test-utils/mockAnalyzeFlow";
import { withProviders } from "./test-utils/providers";

function renderApp() {
  const { element } = withProviders(<App loadFlags={false} />, { withFeatureFlags: false });
  return render(element);
}

describe("Clip registration flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers clip before analysis and refreshes list", async () => {
    const flows: MockAnalyzeFlow[] = [
      {
        registration: {
          clip_id: "clip-123",
          filename: "dock.mp4",
          asset_id: null,
          status: "pending",
          created_at: "2025-10-30T12:00:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "clip-123",
          summary: "Dock workers maintain safe distance",
          moments: [
            { start_s: 0, end_s: 6, label: "Dock check", severity: "medium" },
          ],
          raw: { asset_id: "asset-clip-123" },
          created_at: "2025-10-30T12:01:00.000Z",
          latency_ms: 3200,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-clip-123",
      },
    ];

    const fetchSpy = setupAnalyzeFlowMock(flows, async (url, init, _context) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/api/clips") && method === "POST") {
        expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
        const body = init?.body ? JSON.parse(init.body as string) : {};
        expect(body).toMatchObject({ filename: "clip-to-register.mp4" });
      }
      return undefined;
    });

    renderApp();

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["video"], "clip-to-register.mp4", { type: "video/mp4" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/summary ready for clip-to-register.mp4/i)).toBeInTheDocument();
    expect(screen.getByText(/dock workers maintain safe distance/i)).toBeInTheDocument();

    const historyEntry = await screen.findByTitle("dock.mp4");
    expect(historyEntry).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/clips$/),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analysis\/clip-123$/),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/clips\/clip-123\/asset$/),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/clips$/),
      expect.objectContaining({ method: "GET" }),
    );
  });
});

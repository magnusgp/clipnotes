import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";

import App from "../src/pages/App";
import { setupAnalyzeFlowMock, type MockAnalyzeFlow } from "./test-utils/mockAnalyzeFlow";
import { withProviders } from "./test-utils/providers";

function renderApp() {
  const { element } = withProviders(<App />);
  return render(element);
}

describe("Session history interactions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reselects_previous_summary_from_history", async () => {
    const flows: MockAnalyzeFlow[] = [
      {
        registration: {
          clip_id: "clip-one",
          filename: "clip-one.mp4",
          asset_id: null,
          status: "processing",
          created_at: "2025-01-01T09:59:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "clip-one",
          summary: "First clip insight",
          moments: [
            { start_s: 0, end_s: 4, label: "Warmup", severity: "low" },
          ],
          raw: { asset_id: "asset-clip-one" },
          created_at: "2025-01-01T10:00:00.000Z",
          latency_ms: 800,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-clip-one",
      },
      {
        registration: {
          clip_id: "clip-two",
          filename: "clip-two.mp4",
          asset_id: null,
          status: "processing",
          created_at: "2025-01-01T10:59:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "clip-two",
          summary: "Second clip insight",
          moments: [
            { start_s: 2, end_s: 8, label: "Drill", severity: "medium" },
          ],
          raw: { asset_id: "asset-clip-two" },
          created_at: "2025-01-01T11:00:00.000Z",
          latency_ms: 950,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-clip-two",
      },
    ];

    const fetchSpy = setupAnalyzeFlowMock(flows);

  renderApp();

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    const analyzeButton = screen.getByRole("button", { name: /analyze clip/i });

    fireEvent.change(fileInput, { target: { files: [new File(["video"], "clip-one.mp4", { type: "video/mp4" })] } });
    fireEvent.click(analyzeButton);

    expect(await screen.findByText(/summary ready for clip-one.mp4/i)).toBeInTheDocument();
    expect(screen.getByText(/first clip insight/i)).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analysis\/clip-one$/),
      expect.objectContaining({ method: "POST" }),
    );

    fireEvent.change(fileInput, { target: { files: [new File(["video"], "clip-two.mp4", { type: "video/mp4" })] } });
    fireEvent.click(analyzeButton);

    expect(await screen.findByText(/summary ready for clip-two.mp4/i)).toBeInTheDocument();
    expect(screen.getByText(/second clip insight/i)).toBeInTheDocument();

    const firstSessionCard = screen.getByTitle("clip-one.mp4").closest("li");
    expect(firstSessionCard).not.toBeNull();
    if (!firstSessionCard) {
      throw new Error("First session card not found");
    }

    const viewButton = within(firstSessionCard).getByRole("button", { name: /view summary/i });
    fireEvent.click(viewButton);

    expect(await screen.findByText(/summary ready for clip-one.mp4/i)).toBeInTheDocument();
    expect(screen.getByText(/first clip insight/i)).toBeInTheDocument();
  });

  it("sends_follow_up_and_renders_chat", async () => {
    const chatResponse = {
      submission_id: "submission-1",
      asset_id: "asset-1",
      message: "Here is additional detail for your follow-up.",
      completion_id: "completion-1",
    };
    const flows: MockAnalyzeFlow[] = [
      {
        registration: {
          clip_id: "submission-1",
          filename: "clip-one.mp4",
          asset_id: null,
          status: "processing",
          created_at: "2025-01-01T09:59:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "submission-1",
          summary: "First clip insight",
          moments: [
            { start_s: 1, end_s: 5, label: "Sequence", severity: "medium" },
          ],
          raw: { asset_id: "asset-submission-1" },
          created_at: "2025-01-01T10:00:00.000Z",
          latency_ms: 1000,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-submission-1",
      },
    ];

    let chatCalls = 0;
    const fetchSpy = setupAnalyzeFlowMock(flows, async (url, init, _context) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/api/chat") && method === "POST") {
        chatCalls += 1;
        expect(init?.body).toBeDefined();
        const body = JSON.parse(init?.body as string);
        expect(body).toMatchObject({
          submission_id: "submission-1",
          prompt: expect.any(String),
        });
        return new Response(JSON.stringify(chatResponse), { status: 200 });
      }
      return undefined;
    });

  renderApp();

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(["video"], "clip-one.mp4", { type: "video/mp4" })] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/summary ready for clip-one.mp4/i)).toBeInTheDocument();

    const textarea = screen.getByLabelText(/ask a follow-up/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "What are the key mistakes?" } });

    fireEvent.click(screen.getByRole("button", { name: /send follow-up/i }));

    expect(await screen.findByText(/here is additional detail/i)).toBeInTheDocument();
    expect(textarea.value).toBe("");

    expect(chatCalls).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analysis\/submission-1$/),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles_session_delete", async () => {
    const flows: MockAnalyzeFlow[] = [
      {
        registration: {
          clip_id: "submission-1",
          filename: "clip-one.mp4",
          asset_id: null,
          status: "processing",
          created_at: "2025-01-01T09:59:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "submission-1",
          summary: "First clip insight",
          moments: [
            { start_s: 0, end_s: 3, label: "Setup", severity: "low" },
          ],
          raw: { asset_id: "asset-submission-1" },
          created_at: "2025-01-01T10:00:00.000Z",
          latency_ms: 1000,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-submission-1",
      },
    ];

    let deleteCalls = 0;
    const fetchSpy = setupAnalyzeFlowMock(flows, async (url, init, context) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/api/assets/submission-1") && method === "DELETE") {
        deleteCalls += 1;
        context.removeClip("submission-1");
        return new Response(null, { status: 204 });
      }
      return undefined;
    });

  renderApp();

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(["video"], "clip-one.mp4", { type: "video/mp4" })] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/summary ready for clip-one.mp4/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete asset/i }));

    await waitFor(() => {
      expect(screen.getByText(/no processed clips yet/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId("status-banner")).toHaveTextContent(/ready to analyze/i);
    expect(screen.getByText(/upload a short clip/i)).toBeInTheDocument();

    expect(deleteCalls).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analysis\/submission-1$/),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

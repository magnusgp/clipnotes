import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import UploadForm from "../src/components/UploadForm";
import App from "../src/pages/App";
import { setupAnalyzeFlowMock, type MockAnalyzeFlow } from "./test-utils/mockAnalyzeFlow";

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function renderUploadForm(overrides?: Partial<React.ComponentProps<typeof UploadForm>>) {
  const props: React.ComponentProps<typeof UploadForm> = {
    status: "idle",
    onAnalyze: vi.fn(),
    onCancel: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<UploadForm {...props} />),
    props,
  };
}

function withQueryClient(children: ReactNode) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("UploadForm", () => {
  it("invalid_upload_shows_message", async () => {
    const onAnalyze = vi.fn();

    renderUploadForm({ onAnalyze });

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [textFile] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported file type/i);
    expect(onAnalyze).not.toHaveBeenCalled();
  });
});

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles_server_error", async () => {
    const errorPayload = {
      error: {
        code: "hafnia_unavailable",
        message: "Hafnia is currently unavailable",
        detail: "Hafnia timed out",
        remediation: "Please retry in a few moments.",
      },
    };

    interface TestClipRegistration {
      clip_id: string;
      filename: string;
      asset_id: string | null;
      status: string;
      created_at: string;
      last_analysis_at: string | null;
      latency_ms: number | null;
    }

    const clipRegistration: TestClipRegistration = {
      clip_id: "clip-123",
      filename: "clip.mp4",
      asset_id: null,
      status: "pending",
      created_at: "2025-10-30T12:00:00.000Z",
      last_analysis_at: null,
      latency_ms: null,
    };

    const clipWithAsset: TestClipRegistration = {
      ...clipRegistration,
      asset_id: "asset-clip-123",
    };

    let clipListItems: TestClipRegistration[] = [];

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const url = getRequestUrl(input);

      if (url.endsWith("/api/clips") && method === "GET") {
        return new Response(JSON.stringify({ items: clipListItems }), { status: 200 });
      }

      if (url.endsWith("/api/clips") && method === "POST") {
        clipListItems = [clipRegistration];
        return new Response(JSON.stringify(clipRegistration), { status: 201 });
      }

      if (url.endsWith(`/api/clips/${clipRegistration.clip_id}/asset`) && method === "POST") {
        clipListItems = [clipWithAsset];
        expect(init?.body).toBeInstanceOf(FormData);
        return new Response(JSON.stringify(clipWithAsset), { status: 202 });
      }

      if (url.endsWith(`/api/analysis/${clipRegistration.clip_id}`) && method === "POST") {
        return new Response(JSON.stringify(errorPayload), { status: 502 });
      }

      throw new Error(`Unexpected fetch call to ${url} (${method})`);
    });

  render(withQueryClient(<App />));

    expect(screen.getByTestId("status-banner")).toHaveTextContent(/ready to analyze/i);

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    const validFile = new File(["video"], "clip.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, { target: { files: [validFile] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/processing clip\.mp4/i)).toBeInTheDocument();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/we couldn\'t analyze that clip/i);
    expect(alert).toHaveTextContent(/hafnia is currently unavailable/i);
    expect(alert).toHaveTextContent(/please retry/i);

    const banner = screen.getByTestId("status-banner");
    expect(banner).toHaveTextContent(/hafnia is currently unavailable/i);
    expect(banner).toHaveTextContent(/please retry/i);

    const timestamp = screen.getByTestId("status-timestamp");
    expect(timestamp.getAttribute("datetime")).toBeTruthy();

    expect(fetchSpy).toHaveBeenCalledTimes(5);
    const analysisCall = fetchSpy.mock.calls.find(([requestUrl]) =>
      getRequestUrl(requestUrl).includes(`/api/analysis/${clipRegistration.clip_id}`)
    );
    expect(analysisCall?.[1]?.method).toBe("POST");
  });

  it("shows_success_status_updates", async () => {
    const completedAt = "2025-10-30T12:34:56.000Z";

    const flows: MockAnalyzeFlow[] = [
      {
        registration: {
          clip_id: "clip-123",
          filename: "clip.mp4",
          asset_id: null,
          status: "pending",
          created_at: "2025-10-30T12:00:00.000Z",
          last_analysis_at: null,
          latency_ms: null,
        },
        analysis: {
          clip_id: "clip-123",
          summary: "Vehicle pauses at crosswalk",
          moments: [
            { start_s: 1, end_s: 6, label: "Crosswalk pause", severity: "medium" },
          ],
          raw: { asset_id: "asset-clip-123" },
          created_at: completedAt,
          latency_ms: 4200,
          prompt: null,
          error_code: null,
          error_message: null,
        },
        assetId: "asset-clip-123",
      },
    ];

    const fetchSpy = setupAnalyzeFlowMock(flows);

  render(withQueryClient(<App />));

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    const validFile = new File(["video"], "clip.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, { target: { files: [validFile] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByText(/processing clip\.mp4/i)).toBeInTheDocument();

    expect(await screen.findByText(/summary ready for clip\.mp4/i)).toBeInTheDocument();
    expect(screen.getByText(/vehicle pauses at crosswalk/i)).toBeInTheDocument();

    const bannerTimestamp = screen.getByTestId("status-timestamp");
    expect(bannerTimestamp).toHaveAttribute("datetime", completedAt);

    expect(screen.getByTestId("summary-last-updated")).toHaveTextContent(/last updated/i);

    expect(screen.getByRole("heading", { name: /session history/i })).toBeInTheDocument();
    const viewButtons = screen.getAllByRole("button", { name: /view summary/i });
    expect(viewButtons.length).toBeGreaterThan(0);

    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });
});

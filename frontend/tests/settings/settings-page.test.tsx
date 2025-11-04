import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "../../src/pages/App";
import { withProviders } from "../test-utils/providers";

describe("settings page integration", () => {
  beforeEach(() => {
    window.history.pushState({}, "Settings", "/settings");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "Monitoring", "/");
  });

  it("loads configuration and displays masked Hafnia key status", async () => {
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const method = init?.method ?? "GET";
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/api/config") && method === "GET") {
        return new Response(
          JSON.stringify({
            model: {
              fps: 30,
              temperature: 0.8,
              default_prompt: "Focus on touchdown drills",
            },
            flags: {
              ENABLE_LIVE_MODE: true,
              ENABLE_GRAPH_VIEW: false,
            },
            theme: null,
            updated_at: "2025-11-03T12:00:00.000Z",
            updated_by: "automation",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/keys/hafnia") && method === "GET") {
        return new Response(
          JSON.stringify({ configured: true, last_updated: "2025-11-03T11:58:00.000Z" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch call to ${url} (${method})`);
    });

  const user = userEvent.setup();
  const { element } = withProviders(<App />);
  render(element);

    const fpsInput = await screen.findByLabelText(/frames per second/i);
    await waitFor(() => {
      expect((fpsInput as HTMLInputElement).value).toBe("30");
    });

  await user.click(screen.getByRole("tab", { name: /feature flags/i }));

  const liveModeCheckbox = await screen.findByLabelText(/enable live mode/i);
    await waitFor(() => {
      expect(liveModeCheckbox).toBeChecked();
    });

    const graphViewCheckbox = await screen.findByLabelText(/enable graph view/i);
    await waitFor(() => {
      expect(graphViewCheckbox).not.toBeChecked();
    });

  await user.click(screen.getByRole("tab", { name: /hafnia api key/i }));

  const keyInput = await screen.findByLabelText(/hafnia api key/i);
    await waitFor(() => {
      expect((keyInput as HTMLInputElement).value).toBe("**********");
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/config$/),
        expect.objectContaining({ method: "GET" }),
      );
    });
  });
});

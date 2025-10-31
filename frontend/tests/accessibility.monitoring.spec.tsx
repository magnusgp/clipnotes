import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import Timeline from "../src/components/Timeline";
import type { AnalysisMoment } from "../src/hooks/useAnalyze";

describe("Monitoring UI accessibility", () => {
  it("ensures the timeline section passes axe checks", async () => {
    const moments: AnalysisMoment[] = [
      { start_s: 0, end_s: 8, label: "Approach", severity: "low" },
      { start_s: 8, end_s: 14, label: "Docking", severity: "high" },
    ];

    Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
      value: () => ({
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => ({ addColorStop: () => undefined }),
      }),
    });

    const { container } = render(
      <main>
        <h1 className="sr-only">Clip analysis</h1>
        <Timeline clipLabel="dock.mp4" moments={moments} totalDuration={18} />
      </main>
    );

    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toHaveLength(0);
  });
});

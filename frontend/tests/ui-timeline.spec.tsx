import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Timeline from "../src/components/Timeline";
import type { AnalysisMoment } from "../src/hooks/useAnalyze";

describe("Timeline visualization", () => {
  it("renders severity segments with descriptive tooltips", () => {
    const moments: AnalysisMoment[] = [
      { start_s: 0, end_s: 5, label: "Opening", severity: "low" },
      { start_s: 5, end_s: 12.5, label: "Risky maneuver", severity: "high" },
      { start_s: 12.5, end_s: 20, label: "Recovery", severity: "medium" },
    ];

    render(<Timeline clipLabel="dock.mp4" moments={moments} totalDuration={20} />);

    const segments = screen.getAllByTestId("timeline-segment");
    expect(segments).toHaveLength(3);

    expect(segments[0]).toHaveAttribute("data-severity", "low");
    expect(segments[0]).toHaveAttribute("aria-hidden", "true");
    expect(segments[0]).toHaveAttribute("title", expect.stringContaining("0.0s → 5.0s"));
    expect(segments[0].style.width).toBe("25%");
    expect(segments[0].className).toMatch(/bg-emerald-500/);

    expect(segments[1]).toHaveAttribute("data-severity", "high");
    expect(segments[1].style.width).toBe("37.5%");
    expect(segments[1].className).toMatch(/bg-rose-500/);

  expect(screen.getAllByText(/low impact/i).length).toBeGreaterThan(0);
    const timelineGraphic = screen.getByRole("img", { name: /timeline overview for dock.mp4/i });
    expect(timelineGraphic).toBeInTheDocument();
    const descriptionId = timelineGraphic.getAttribute("aria-describedby");
    expect(descriptionId).not.toBeNull();
    const descriptionNode = descriptionId ? document.getElementById(descriptionId) : null;
    expect(descriptionNode).not.toBeNull();
    expect(descriptionNode).toHaveTextContent(/opening: 0.0s to 5.0s \(Low impact\)/i);
  });
});

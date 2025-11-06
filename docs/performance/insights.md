# Insight Layer Performance Log

Record snapshot generation timings, Hafnia latency, cache hit/miss counts, and demo screenshots here. Update this file after each staging validation or significant change.

## 2024-11-22 Export Verification

- Window `24h` snapshot rendered stakeholder report in 2.1s (Chrome 120, MacBook Pro M2) including chart table hydration.
- Printable layout confirms severity totals, top labels, and timeline rows stay aligned when saved as PDF.
- Switching to blob-backed tab open removed intermittent pop-up blocker warnings.
- No additional latency observed on insight API; report builder reuses cached payload entirely client-side.

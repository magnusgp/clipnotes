# Reasoning & Comparison Latency Tracking

| Measurement | Target | Observed | Notes |
|-------------|--------|----------|-------|
| API response (compare) | ≤3s avg / ≤10s p95 | 2.6s avg / 8.9s p95 | 3-run sample against Hafnia sandbox with dual 45s clips |
| API response (chat) | ≤3s avg / ≤10s p95 | 2.3s avg / 7.4s p95 | Includes follow-up with persisted history hydrate |
| Metrics extraction | ≤500ms | 140ms | Transformer timings captured via FastAPI middleware logs |
| Frontend render (tab) | ≤1.5s | 0.9s | `performance.now()` delta on Vite preview build |

## Capture Procedure

1. Enable FastAPI request timing middleware and record compare/chat endpoint durations.
2. Use browser `performance.mark` around Compare & Reason tab requests to measure end-to-end latency.
3. Document environment (clip count, analysis size, Hafnia model version) alongside metrics.
4. Update this file after each iteration with observed values and remediation steps if targets are missed.

## Accessibility & Verification

- `pnpm test --run` (Vitest) passes, including `tests/accessibility.monitoring.spec.tsx` axe assertions covering the Compare & Reason panels.
- VoiceOver spot-check confirms tab order: compare form → metrics selector → graph summaries without focus traps.
- Color contrast confirmed ≥4.5:1 for new metric cards using Chrome DevTools.

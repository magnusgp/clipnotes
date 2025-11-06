# Feature Specification: ClipNotes Insight Layer

**Feature Branch**: `005-insight-layer`  
**Created**: 2025-11-06  
**Status**: Draft  
**Input**: User description: "Develop ClipNotes Insight Layer (feature 005): a proactive, trend-driven insights feature on top of our existing ClipNotes Monitoring app. The goal is to move beyond single-clip analysis to continuous insight across clips over time, generating a daily/weekly human-readable summary plus lightweight trend charts."

## Constitution Alignment *(mandatory)*

- **Linting**: Back-end additions (aggregation service, caching guard, insight endpoint contract) will run through `uv run ruff check backend` before merge. Front-end Insight tab, chart component, and summary display will run through `pnpm --prefix frontend lint` and existing CI ESLint gates.
- **Testing**: New pytest coverage will live under `backend/tests/unit/insights` (aggregation maths, window validation, caching) and `backend/tests/integration` (endpoint success, empty data fallback, regeneration). Verification continues to use `uv run pytest` locally and in CI.
- **UV Usage**: No new packages expected. Developers will rely on `uv run alembic upgrade head` to ensure schema (if migrations arise) and `uv run uvicorn backend.main:app --reload` for manual QA. Any optional seeding scripts run via `uv run <script>` and documented in the spec appendix.
- **Accessible UI**: Insight tab reuses Tailwind utility classes plus shadcn/ui cards, tabs, and list components. We will confirm 4.5:1 contrast on summary text, provide aria-labels for the trend chart, and run the existing Playwright axe checks plus manual keyboard navigation to ensure WCAG 2.1 AA compliance.
- **Performance Budget**: Aggregations operate on recent clip windows and are cached for 60s, ensuring the added endpoint keeps end-to-end insight load under the standing ≤10s (target 5s) processing budget for 15–30s clips. We will log insight generation time and review metrics dashboard timing after rollout.
- **Credential Handling**: Feature depends on `DATABASE_URL`, existing Hafnia credentials (`HAFNIA_API_KEY`, `HAFNIA_API_SECRET`, `HAFNIA_BASE_URL`), and a new optional `INSIGHTS_CACHE_TTL_SECONDS` override (documented in `.env.example`). No secrets are checked into the repository.
- **Iteration Plan**: Deliver in three increments—(1) deterministic aggregation API with fallback summary, (2) Hafnia-powered narrative summary with caching, (3) Front-end Insights tab and shareable read-only view. Capture outcomes via sprint demo clips and add a "What's new" README entry summarising operator value.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Review rolling insights (Priority: P1)

Operators open the Insights tab to see a time-series chart, top event labels, severity mix, and a narrated summary for the selected window (24h or 7d) so they can make escalation decisions quickly.

**Why this priority**: Provides the core value shift from single-clip monitoring to continuous situational awareness, demonstrating tangible business impact for judges and stakeholders.

**Independent Test**: Run `uv run pytest -k "test_insights_endpoint_returns_series"` and confirm manual UI QA shows chart + summary rendering from cached API data.

**Acceptance Scenarios**:

1. **Given** recent clip analyses exist, **When** an operator loads the Insights tab for `window=24h`, **Then** the chart, severity totals, top labels, and summary reflect the last 24 hours of data within the cached freshness period.
2. **Given** the Insights API has cached content, **When** the operator reloads within 60 seconds, **Then** the response reuses cached values and the UI renders near-instantly (<1s).

---

### User Story 2 - Switch windows and regenerate narrative (Priority: P2)

Operators adjust the window selector (24h ↔ 7d) or press "Regenerate summary" to refresh the narrative and chart with the same aggregated data, ensuring the text reflects either cached or newly generated insights.

**Why this priority**: Supports comparative analysis and ensures the AI narrative stays aligned with operator expectations without unnecessary API cost.

**Independent Test**: Run `uv run pytest -k "test_insights_window_validation"` plus the UI interaction test `pnpm --prefix frontend test:ci -- --runTestsByPath src/components/Insights/__tests__/insights-tab.spec.tsx`.

**Acceptance Scenarios**:

1. **Given** the operator selects `window=7d`, **When** the Insights tab reloads, **Then** the chart bins switch to daily buckets and the summary references changes versus the previous week.
2. **Given** Hafnia is temporarily unavailable, **When** the operator clicks "Regenerate summary", **Then** the API returns the deterministic fallback sentence and the UI surfaces it without errors.

---

### User Story 3 - Share a read-only insight snapshot (Priority: P3)

Stakeholders receive a shareable read-only link that presents the latest summary, chart, and top labels without requiring operator tooling access.

**Why this priority**: Extends value to leadership and judges by allowing quick distribution of situational reports without exposing control surfaces.

**Independent Test**: Run `uv run pytest -k "test_insights_share_link"` (new integration test covering public view contract) and verify the static page appears using `pnpm --prefix frontend test:ci -- --runTestsByPath src/pages/InsightsShare.spec.tsx`.

**Acceptance Scenarios**:

1. **Given** an insight was generated within the last day, **When** a stakeholder opens the share link, **Then** the page presents the latest cached summary and chart without edit controls.
2. **Given** the cache is older than 60 seconds, **When** the share link is accessed, **Then** the system refreshes the insight data server-side before rendering the view.

---

### User Story 4 - Export stakeholder-ready report (Priority: P4)

Insights reviewers export a polished, single-page report capturing the current summary, key metrics, and chart visuals so leadership can review trends offline or attach the document to briefings.

**Why this priority**: A downloadable report enhances shareability without requiring dashboard access, but core monitoring and share links already deliver primary value, making this an additive win.

**Independent Test**: Run `pnpm --prefix frontend test -- --run --filter insights-report` to validate the export trigger plus manual QA that the generated document includes headline metrics, summary, and chart imagery.

**Acceptance Scenarios**:

1. **Given** an operator is viewing the Insights overview, **When** they trigger “Download report”, **Then** the system produces a concise document containing the active window, generated summary, severity totals, top labels, and chart snapshot.
2. **Given** the report export completes, **When** the stakeholder opens the downloaded file offline, **Then** branding, layout, and data remain legible on both desktop and mobile PDF viewers without extra scrolling beyond one page.

---

### Edge Cases

- What happens when the analyses table has no rows for the selected window? ➜ Return zero-filled series and the neutral summary "No significant events in the selected window." without raising errors.
- How does the system handle invalid `window` parameters (e.g., `window=3d`)? ➜ Respond with HTTP 400 and a validation message, leaving cache untouched.
- What happens when Hafnia reasoning is unreachable or times out? ➜ Serve the deterministic fallback sentence, mark the event in logs, and keep the aggregation response intact.
- How does caching behave when new clips arrive during the 60s TTL? ➜ Cached response persists until expiry; regeneration manually busts cache and recomputes aggregates before returning.
- What happens if someone requests the share link with an expired or unknown token? ➜ Return 404 (or redirect to monitoring home) without leaking insight details.
- What happens if export runs while insights are regenerating? ➜ Queue export until the refreshed payload resolves, then render a consistent snapshot tied to the completion timestamp.
- How does the export handle chart rendering failures? ➜ Substitute a textual summary of trend direction and severity totals so the PDF still communicates core findings.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST expose `GET /api/insights?window=24h|7d` returning window identifier, aggregated series (hourly for 24h, daily for 7d), top labels, severity counts, generated summary text, and timestamp.
- **FR-002**: The service MUST validate the `window` parameter, rejecting unsupported values with HTTP 400, and defaulting to `24h` when omitted.
- **FR-003**: The aggregation layer MUST derive totals from stored clip analyses, counting moments by label and severity while computing period-over-period deltas for inclusion in the summary payload.
- **FR-004**: The insight summary MUST be produced via the existing Hafnia reasoning client using the aggregated JSON as context; when Hafnia is unavailable, the endpoint MUST emit a deterministic fallback sentence without failing the request.
- **FR-005**: The insight response MUST be cached per window for 60 seconds (configurable via environment variable) and invalidated when operators request a regeneration.
- **FR-006**: The front-end MUST present an Insights tab (adjacent to Metrics) with a chart visualising severity totals over time, a list of top labels, the narrative summary, window selector, and a "Regenerate" action that re-queries the API.
- **FR-007**: The application MUST provide an optional read-only share link exposing the latest cached insight for a window without editing controls and with CORS aligned to production and preview domains.
- **FR-008**: The README MUST include a "What’s new" note and a concise "How it helps" section describing the Insight Layer value for judges.
- **FR-009**: Operators MUST be able to export the currently viewed insight snapshot into a branded, single-page report that includes summary narrative, severity totals, top labels, time window, and chart representation.
- **FR-010**: The export process MUST complete within 10 seconds under typical staging loads and provide user feedback if generation fails, advising the user to retry or regenerate insights first.
- **FR-011**: The system MUST store the export timestamp and window within the document metadata so recipients know when the data was captured.

### Constitutional Constraints *(mandatory)*

- **CC-001**: Feature MUST document linting hooks (Python via `uv run ...`, frontend ESLint) that apply to this scope.
- **CC-002**: Feature MUST include or reference pytest coverage executed via `uv run pytest`.
- **CC-003**: Feature MUST describe how Tailwind + shadcn/ui components remain accessible and responsive.
- **CC-004**: Feature MUST record expected analysis latency and instrumentation supporting the ≤10s target for 15–30s
  clips.
- **CC-005**: Feature MUST outline environment variables or secrets touched and their storage location (no repository
  secrets).
- **CC-006**: Feature MUST state iteration checkpoints or experiment logging plans that enable fast adjustments.

### Key Entities *(include if feature involves data)*

- **Insight Window Aggregate**: Represents the computed statistics for a 24h or 7d window, including time buckets, severity counts, top labels, and prior-period delta.
- **Insight Summary**: Narrative text paired with metadata (generated timestamp, window, source of truth) derived from either Hafnia reasoning or deterministic fallback.
- **Insight Share Token**: Lightweight identifier mapping to a cached insight window for read-only distribution with TTL control.
- **Insight Report Document**: Generated artifact containing the active insight snapshot, summary, metrics, and chart imagery with export metadata to support offline review.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Operators can load the Insights tab and view chart + summary within 1 second after the first cached response, confirmed across staging sessions.
- **SC-002**: `GET /api/insights` returns valid payloads (status 200) for both `24h` and `7d` windows with zero downtime across QA, including empty-dataset fallback coverage.
- **SC-003**: At least 90% of pilot operators report (via post-launch survey) that insights help them identify trends faster than reviewing individual clips.
- **SC-004**: Judges and stakeholders receive a shareable link demonstrating reduced manual review time by at least 30% compared to baseline clip-by-clip updates (tracked during demo walkthroughs).
- **SC-005**: README "What’s new" entry published and referenced in release notes, ensuring stakeholders understand how the Insight Layer drives prioritisation decisions.
- **SC-006**: Operators generate the downloadable report in ≤10 seconds, and 80% of surveyed stakeholders state the exported layout communicates key findings without needing the live dashboard.

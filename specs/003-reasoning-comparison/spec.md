# Feature Specification: Reasoning & Comparison

**Feature Branch**: `003-reasoning-comparison`  
**Created**: 2025-10-31  
**Status**: Draft  
**Input**: User description: "Users should be able to reason about multiple analyzed clips together. Add a new \"Compare & Reason\" tab where operators can pick two analyzed clips, ask comparative or contextual questions, receive explanations and visual evidence, carry on follow-up questions stored locally, and view charts or lightweight graph summaries built from existing analysis data."

## Constitution Alignment *(mandatory)*

- **Linting**: Backend reasoning endpoints and services will stay PEP 8 compliant by extending `uv run ruff check backend` and `uv run ruff format --check backend` in CI; frontend additions to the monitoring view will continue to gate on `pnpm lint` (ESLint) executed automatically in the pipeline and locally before merge.
- **Testing**: New reasoning APIs and stores will be covered by `uv run pytest backend/tests/integration/test_reasoning_api.py` plus granular unit suites (e.g., `uv run pytest backend/tests/unit/test_reasoning_service.py`), while React hooks/components gain Vitest coverage via `pnpm test --run --filter reasoning`. Regression runs stay anchored on `uv run pytest` for the full backend suite.
- **UV Usage**: Engineers rely on `uv sync` to pull Python dependencies, `uv run pytest ...` for verification, and `uv run ruff ...` for linting; no additional Python packages are introduced unless validated and documented through `uv add` with reviewer approval.
- **Accessible UI**: The Compare & Reason tab will reuse shadcn/ui tabs, cards, charts, and Tailwind utilities; we will audit focus order, keyboard navigation, and color contrast against WCAG 2.1 AA using `pnpm test --run --filter accessibility` plus manual checks with browser dev tools and screen reader smoke tests.
- **Performance Budget**: Reasoning operates on stored analyses; server-side aggregation must answer within 2 seconds for paired clips and 3 seconds for multi-clip history, keeping end-to-end response well under the 10-second budget measured via application tracing and browser performance marks in the monitoring page.
- **Credential Handling**: Feature reuses existing Hafnia credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`) without adding new secrets; documentation updates will note that reasoning consumes persisted analysis artifacts only, so no extra environment variables are needed.
- **Iteration Plan**: Deliver in three increments—(1) comparative question flow with text responses, (2) follow-up QA history, (3) visual summaries (charts + graph view)—each ending with a demo, retro notes in the team journal, and acceptance outcomes captured in the planning board.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask comparative question across clips (Priority: P1)

An operator opens the Compare & Reason tab, selects two analyzed clips, asks a natural-language question (e.g., "Which zone has more congestion?"), and receives a concise answer plus referenced time spans from each clip.

**Why this priority**: Comparative reasoning unlocks the headline value of the new capability and directly answers the core monitoring question identified by stakeholders.

**Independent Test**: Run `uv run pytest backend/tests/integration/test_reasoning_api.py -k "test_compare_two_clips"` and `pnpm test --run --filter compare-question` to confirm API and UI deliver usable comparative responses.

**Acceptance Scenarios**:

1. **Given** two clips with stored analyses, **When** the user asks a comparative question, **Then** the system returns an answer with clip-specific evidence (timestamps or segment identifiers).
2. **Given** a clip pair selection, **When** the reasoning service cannot reconcile the question, **Then** the user sees an actionable error message suggesting how to rephrase or pick different clips.

---

### User Story 2 - Continue reasoning with follow-up history (Priority: P2)

After receiving an initial answer, the operator asks follow-up questions targeting one or both clips, reviews short responses, and sees the conversation captured in a local history panel for quick reference.

**Why this priority**: Maintaining conversational context improves analyst productivity and reduces repeated manual comparisons during incident reviews.

**Independent Test**: Run `uv run pytest backend/tests/unit/test_reasoning_history.py` for persistence logic and `pnpm test --run --filter reasoning-history` for UI hooks to ensure history renders and stores correctly.

**Acceptance Scenarios**:

1. **Given** an existing comparative session, **When** the user submits a follow-up question referencing one clip, **Then** the answer appears with a source indicator and the QA pair is appended to the history list.
2. **Given** a populated history, **When** the user refreshes the monitoring view, **Then** the most recent QA pairs rehydrate from local storage for that clip selection.

---

### User Story 3 - Visualize reasoning insights (Priority: P3)

The operator views auto-generated mini charts summarizing metrics (counts, durations, severity) from the clips' structured analysis JSON and, when relational data exists, explores a lightweight graph illustrating detected objects and their interactions.

**Why this priority**: Visual cues accelerate comprehension and support upcoming overlay intelligence features without forcing analysts to parse raw text.

**Independent Test**: Run `pnpm test --run --filter reasoning-visuals` for component rendering plus `uv run pytest backend/tests/unit/test_reasoning_metrics.py` to ensure metric extraction logic supplies the visuals.

**Acceptance Scenarios**:

1. **Given** clips with structured JSON metrics, **When** the operator opens the visualization panel, **Then** the system shows at least one chart with accurate counts and durations aligned to the analysis payload.
2. **Given** clips whose structured data contains object interaction metadata, **When** graph mode is toggled, **Then** nodes and edges render with legible labels, and inaccessible combinations provide a graceful fallback message.

---

### Edge Cases

- Questions referencing clips that lack completed analyses should prompt the user to run analysis first and disable the compare action until data exists.
- When structured JSON is missing expected metrics, the visualization panel should display a clear "insufficient data" state instead of empty charts.
- Large follow-up histories must paginate or collapse after a threshold (e.g., 20 entries) so the UI stays responsive and accessible.
- Concurrent edits (multiple operators) rely on persisted store; conflicts should resolve deterministically, preferring the most recent analysis snapshot.
- Network failures during reasoning requests should retry once and then surface a message without wiping existing answers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monitoring interface MUST expose a "Compare & Reason" tab that only lists clips with completed analyses and allows multi-select up to two clips for direct comparison (more for follow-up context when supported).
- **FR-002**: The backend reasoning service MUST accept a question plus selected clip IDs, source stored analysis artifacts, and return a structured payload containing answer text, supporting explanation, and evidence references (timestamps, segment IDs, or labels).
- **FR-003**: The system MUST gracefully handle questions that reference a single clip by clarifying scope and still providing an answer when possible.
- **FR-004**: Users MUST be able to submit follow-up questions tied to an existing comparison session; the system MUST store the QA pairs locally (per user/browser) and rehydrate them on revisit.
- **FR-005**: The Compare & Reason tab MUST display an answer history with clear attribution (question, answer, involved clips, and evidence links).
- **FR-006**: Visual insight components MUST render charts summarizing key metrics (counts, total durations, severity distribution) derived from structured JSON, updating automatically when clip selections change.
- **FR-007**: When structured data includes object interaction metadata, the system MUST provide an optional graph visualization that labels nodes (objects/entities) and edges (interactions), with keyboard and screen-reader accessible navigation.
- **FR-008**: The reasoning API MUST log request/response metadata (excluding sensitive content) and expose latency metrics for monitoring within existing observability tooling.
- **FR-009**: Errors (e.g., missing analysis data, unsupported question types, upstream timeouts) MUST surface actionable remediation guidance without forcing a page reload.
- **FR-010**: The feature MUST operate solely on persisted analyses—no additional asset uploads or Hafnia reruns are triggered from the Compare & Reason tab.

### Constitutional Constraints *(mandatory)*

- **CC-001**: Feature MUST document linting hooks (Python via `uv run ...`, frontend ESLint) that apply to this scope.
- **CC-002**: Feature MUST include or reference pytest coverage executed via `uv run pytest`.
- **CC-003**: Feature MUST describe how Tailwind + shadcn/ui components remain accessible and responsive.
- **CC-004**: Feature MUST record expected analysis latency and instrumentation supporting the ≤10s target for 15–30s clips.
- **CC-005**: Feature MUST outline environment variables or secrets touched and their storage location (no repository secrets).
- **CC-006**: Feature MUST state iteration checkpoints or experiment logging plans that enable fast adjustments.

### Key Entities *(include if feature involves data)*

- **ComparisonSession**: Represents a user-driven selection of clips, the active question prompt, and associated history metadata; key attributes include selected clip IDs, created_at, and client-side persistence identifier.
- **ReasoningResponse**: Encapsulates the answer text, explanation, evidence references (timestamps, labels), confidence hint, and any structured metric summary returned for a single question.
- **InsightVisualization**: Describes the data prepared for charts or graph view, including metric series (counts, durations, severity ratios) and object-interaction adjacency structures derived from structured JSON.

### Assumptions

- Stored analysis artifacts include sufficient structured JSON (summary + moments + optional object metadata) to power comparative answers without reprocessing video.
- Local reasoning history can persist in browser storage scoped per clip selection; server-side persistence is not required for the initial release.
- Operators work within authenticated sessions already established elsewhere in ClipNotes; no new permission tiers are needed beyond access to analyzed clips.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of comparative reasoning requests return an answer with evidence in under 3 seconds measured at the browser boundary during UAT.
- **SC-002**: 95% of follow-up questions persist and reload correctly in local history across page refreshes during QA regression runs.
- **SC-003**: At least 4 of 5 pilot analysts report that the new visuals make cross-clip differences easier to explain during debrief interviews.
- **SC-004**: Support tickets related to "manual clip comparisons" drop by 40% within one month of release compared to the prior month's baseline.

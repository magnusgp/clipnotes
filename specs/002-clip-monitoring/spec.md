# Feature Specification: ClipNotes Monitoring Wave 1

**Feature Branch**: `002-clip-monitoring`  
**Created**: 2025-10-30  
**Status**: Draft  
**Input**: User description: "Project: ClipNotes Monitoring (Wave 1) — upgrade demo into foundational monitoring app with clip registration, Hafnia analysis, session history UI, and timeline display."

## Constitution Alignment *(mandatory)*

- **Linting**: Backend changes will continue to run `uv run ruff check backend` before merge, while frontend updates run `npm run lint` (ESLint) in CI and locally. Any new modules will adopt existing Ruff configuration and TypeScript ESLint rules to keep code PEP 8/ESLint compliant.
- **Testing**: New pytest suites will cover clip and analysis APIs plus the Hafnia client fake, executed via `uv run pytest backend/tests` with focused markers (e.g., `uv run pytest -k "clips_api"`). Frontend behaviors (timeline rendering, session calls) will be validated through Vitest specs invoked by `npm run test -- tests/monitoring.spec.tsx`.
- **UV Usage**: Python dependency or runtime actions rely exclusively on `uv`, including `uv lock` if store libraries are added and `uv run uvicorn backend.main:app --reload` for local verification. No `pip` commands will be introduced.
- **Accessible UI**: Tailwind + shadcn/ui components (UploadPanel, AnalyzeClipButton, SummaryPanel, SessionHistory, Timeline strip) will be audited with keyboard navigation and axe via `npm run test:axe` plus manual VoiceOver spot checks to ensure WCAG 2.1 AA compliance.
- **Performance Budget**: The analysis workflow will log end-to-end latency (clip registration through Hafnia response) and assert a ≤10s budget by capturing timestamps in the store and surfacing them in `/api/analysis/{clip_id}` responses for monitoring dashboards.
- **Credential Handling**: The feature documents required environment variables (`DATABASE_URL`, `HAFNIA_API_KEY`, `HAFNIA_BASE_URL`) in `.env.example` and README, ensuring secrets stay outside version control while allowing localhost defaults.
- **Iteration Plan**: Work lands in increments—(1) clip registry + store abstraction, (2) Hafnia analysis service + API, (3) frontend refactor with timeline UI—each recorded in `specs/002-clip-monitoring/research.md` with findings and follow-up experiments.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Browse Clips (Priority: P1)

Operations coordinators need to register incoming clips so they can prioritize review later. The system must accept filenames, allocate IDs, and list recent submissions.

**Why this priority**: Without clip registration and browsing, no downstream analysis or monitoring workflow is possible, so this is the critical foundation.

**Independent Test**: `uv run pytest -k "clips_api"` validates POST/GET clip endpoints and ensures pagination defaults to 25 items.

**Acceptance Scenarios**:

1. **Given** the operator has a clip filename, **When** they submit it to `POST /api/clips`, **Then** the API returns a UUID, pending status, and the clip appears in the latest list.
2. **Given** multiple clips exist in the store, **When** the operator loads `GET /api/clips`, **Then** at most 25 entries are returned sorted by newest first with metadata intact.

---

### User Story 2 - Trigger Hafnia Analysis (Priority: P1)

Analysts must request Hafnia summaries for a registered clip and review structural results (summary text, moments timeline, raw payload snapshot).

**Why this priority**: Replaying Hafnia analysis is the core value proposition; it sits on equal footing with registration for MVP viability.

**Independent Test**: `uv run pytest -k "analysis_api"` uses a fake Hafnia client to assert POST/GET analysis behavior, while `npm run test -- tests/monitoring.spec.tsx` confirms the frontend button dispatches the correct API calls.

**Acceptance Scenarios**:

1. **Given** a clip exists, **When** an analyst sends `POST /api/analysis/{clip_id}` with an optional prompt, **Then** the system stores the result, records latency, and marks the clip status accordingly.
2. **Given** the clip has a completed analysis, **When** the analyst loads `GET /api/analysis/{clip_id}`, **Then** the response returns summary text, timeline moments, latency, timestamps, and a raw payload envelope.

---

### User Story 3 - Review Monitoring UI (Priority: P2)

Coaches want a dashboard-like page showing the active clip, analysis timeline, styled cards, and session history to share coaching insights.

**Why this priority**: Enhances usability and prepares for future analytics; it depends on earlier APIs but can be staged afterward.

**Independent Test**: `npm run test -- tests/ui-timeline.spec.tsx` renders the timeline visualization with mocked data, verifies tooltips, and ensures session history displays model responses.

**Acceptance Scenarios**:

1. **Given** the frontend loads a clip with analysis, **When** the page renders SummaryPanel and timeline, **Then** it shows the working filename, timeline segments colored by severity, and tooltip metadata.
2. **Given** multiple clips exist, **When** the user opens SessionHistory, **Then** the UI lists recent sessions, highlights the active clip, and surfaces static follow-up dialogue.

---

### Edge Cases

- Clip registration should reject empty filenames or duplicates submitted within the same second to prevent accidental spam entries.
- Analysis lookup must return a well-formed error when the clip has no stored analysis yet, guiding the user to trigger processing.
- Hafnia timeouts or malformed responses should record a failure state while preserving previous successful analysis data.
- List endpoint must handle `limit` overrides gracefully, clamping values above 100 to avoid excessive payloads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide `POST /api/clips` to accept filenames and respond with a generated clip identifier and pending status.
- **FR-002**: System MUST expose `GET /api/clips/{clip_id}` returning clip metadata, status, timestamps, and latest analysis snapshot when present.
- **FR-003**: System MUST list recent clips via `GET /api/clips`, defaulting to the 25 most recent items sorted by `created_at` descending and supporting an optional `limit` query parameter.
- **FR-004**: System MUST standardize error payloads as `{ "error": { "code": string, "message": string } }` across all new endpoints, including missing resources and validation failures.
- **FR-005**: System MUST implement `POST /api/analysis/{clip_id}` to invoke the Hafnia service client with optional prompt text and persist structured results.
- **FR-006**: System MUST implement `GET /api/analysis/{clip_id}` returning the latest analysis payload, including summary text, timeline moments, latency metrics, and raw data snapshot.
- **FR-007**: System MUST abstract persistence behind a store interface that supports in-memory and SQLite-backed implementations configured via `DATABASE_URL` with a documented default.
- **FR-008**: System MUST update clip status and `last_analysis_at` timestamps whenever analysis completes successfully or fails.
- **FR-009**: Frontend MUST refactor into UploadPanel, AnalyzeClipButton, SummaryPanel, SessionHistory, and timeline visualization components consuming the new APIs.
- **FR-010**: Frontend MUST apply refreshed dark-theme styling (gradient headers, rounded cards, subtle shadows, title banner) without regressing accessibility support.
- **FR-011**: Platform MUST provide `GET /healthz` returning `{ "status": "ok" }` and enable CORS for `http://localhost:5173` and `http://127.0.0.1:5173`.
- **FR-012**: Backend MUST include unit tests for the Hafnia service client using a fake implementation to cover success, timeout, and error mapping scenarios.

### Constitutional Constraints *(mandatory)*

- **CC-001**: Feature MUST affirm backend lint coverage via `uv run ruff check backend` and frontend ESLint via `npm run lint` for altered files.
- **CC-002**: Feature MUST extend pytest suites (`uv run pytest`) and Vitest suites to cover new API contracts and UI behaviors.
- **CC-003**: Feature MUST document accessibility testing for the new Tailwind + shadcn/ui components, including keyboard navigation and axe automation.
- **CC-004**: Feature MUST log analysis latency timestamps, ensuring ≤10s completion targets remain traceable in responses and logs.
- **CC-005**: Feature MUST inventory required environment variables (`DATABASE_URL`, `HAFNIA_API_KEY`, `HAFNIA_BASE_URL`) and reference updates to `.env.example` and README.
- **CC-006**: Feature MUST outline incremental delivery checkpoints and capture the outcome of each in research notes for rapid iteration.

### Key Entities *(include if feature involves data)*

- **ClipRecord**: Represents a registered video clip with attributes `id`, `filename`, `created_at`, `status`, `last_analysis_at`, and `latency_ms`, serving as the anchor for analysis data.
- **AnalysisResult**: Represents the latest Hafnia output for a clip, containing `clip_id`, `summary`, `moments[]`, `raw` payload, `created_at`, and optional failure metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of clip registration requests return a unique ID and appear in the list endpoint within 1 second under nominal local load.
- **SC-002**: Analysts can initiate Hafnia analysis and receive a structured response in the UI within 10 seconds for 15–30 second clips (target median 5 seconds), with latency visible in the UI and logs.
- **SC-003**: Frontend usability testing confirms at least 90% of pilot users can locate and interpret the timeline visualization without assistance.
- **SC-004**: Monitoring dashboard retains at least the last 25 clips with consistent session history display, enabling QA to replay any analysis completed in the prior hour.

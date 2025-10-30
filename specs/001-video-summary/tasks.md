---

description: "Task list for ClipNotes video summary MVP"
---

# Tasks: ClipNotes Video Summary

**Input**: Design documents from `/specs/001-video-summary/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Backend logic MUST be covered by pytest executed via `uv run pytest`; add frontend accessibility/behavior checks where relevant to each story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/` for application code, `backend/tests/` for pytest suites
- **Frontend**: `frontend/src/` for React components, `frontend/tests/` for UI tests
- **Documentation**: `README.md`, `.env.example`, `docs/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish backend/frontend workspaces, shared configs, and project tooling.

- [x] T001 Scaffold FastAPI project layout (`backend/main.py`, `backend/app/__init__.py`, directories for api/core/services/models`).
- [x] T002 Add backend dependencies (FastAPI, HTTPX, Pydantic, Uvicorn, pytest, Ruff) to `pyproject.toml` and regenerate `uv.lock` via `uv lock`.
- [x] T003 Initialize Vite + React frontend with Tailwind + shadcn/ui scaffolding (`frontend/package.json`, `frontend/tailwind.config.cjs`, `frontend/src/main.tsx`).
- [x] T004 Create `.env.example` documenting `HAFNIA_API_KEY`, `HAFNIA_BASE_URL`, and local proxy settings.
- [x] T005 Update `README.md` with canonical `uv run` commands, frontend scripts, and lint/test instructions aligned with the constitution.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

- [x] T006 Implement environment configuration loader in `backend/app/core/config.py` (reads env vars, validates required Hafnia keys).
- [x] T007 Configure structured logging and latency timer helpers in `backend/app/core/logging.py`.
- [x] T008 Build Hafnia API client scaffolding in `backend/app/services/hafnia_client.py` (async HTTPX client, asset upload + completion method signatures).
- [x] T009 Define Pydantic schemas for submission/summary/error responses in `backend/app/models/schemas.py`.
- [x] T010 Configure local integration plumbing: enable CORS in `backend/main.py` and add Vite proxy target in `frontend/vite.config.ts`.

---

## Phase 3: User Story 1 - Upload clip and read summary (Priority: P1) 🎯 MVP

**Goal**: Allow users to upload a valid clip and receive Hafnia-generated summaries within 10 seconds.

**Independent Test**: `uv run pytest -k "test_upload_summary_success"` verifies backend + mocked Hafnia success path end-to-end; frontend displays summary after calling `/api/analyze`.

### Tests for User Story 1 ⚠️

- [x] T011 [P] [US1] Add success integration test with mocked Hafnia in `backend/tests/integration/test_analyze_endpoint.py::test_analyze_success`.
- [x] T012 [P] [US1] Add unit tests for summary formatting and fallback logic in `backend/tests/unit/test_summarizer.py`.

### Implementation for User Story 1

- [x] T013 [US1] Implement Hafnia API client logic (asset upload + completion request, error mapping) in `backend/app/services/hafnia_client.py`.
- [x] T014 [US1] Implement summarizer service orchestrating Hafnia calls and latency tracking in `backend/app/services/summarizer.py`.
- [x] T015 [US1] Implement `POST /analyze` endpoint wiring validation → summarizer → response models in `backend/app/api/routes.py`.
- [x] T016 [US1] Persist summary payload structure (bullet list + optional JSON) in `backend/app/models/schemas.py`.
- [x] T017 [US1] Build accessible upload form with shadcn/ui components in `frontend/src/components/UploadForm.tsx`.
- [x] T018 [US1] Implement `useAnalyze` hook handling multipart POST, loading state, and cancellation in `frontend/src/hooks/useAnalyze.ts`.
- [x] T019 [US1] Render summary results (bullets + JSON view) in `frontend/src/components/SummaryPanel.tsx`.
- [x] T020 [US1] Compose page layout and spinner states in `frontend/src/pages/App.tsx`.

---

## Phase 4: User Story 2 - Receive actionable feedback on invalid uploads (Priority: P2)

**Goal**: Surface instant guidance for invalid files before the backend spends Hafnia quota.

**Independent Test**: `uv run pytest -k "test_upload_summary_validation"` ensures backend rejects invalid uploads; frontend UI shows inline error copy without hitting the API.

### Tests for User Story 2 ⚠️

- [ ] T021 [P] [US2] Extend integration tests for file size/format failures in `backend/tests/integration/test_analyze_endpoint.py::test_invalid_uploads`.
- [ ] T022 [P] [US2] Add frontend validation test ensuring error messaging in `frontend/tests/analyze.spec.tsx::invalid_upload_shows_message`.

### Implementation for User Story 2

- [ ] T023 [US2] Implement reusable validation helpers enforcing size/duration/mime type in `backend/app/services/validators.py`.
- [ ] T024 [US2] Update `backend/app/api/routes.py` to short-circuit invalid uploads with structured `ErrorResponse` payloads.
- [ ] T025 [US2] Add client-side validation + helper text to `frontend/src/components/UploadForm.tsx`.
- [ ] T026 [US2] Display validation guidance and retry affordances in `frontend/src/components/SummaryPanel.tsx`.

---

## Phase 5: User Story 3 - Understand progress and errors during processing (Priority: P3)

**Goal**: Provide transparent status updates and actionable error handling during Hafnia processing.

**Independent Test**: `uv run pytest -k "test_upload_summary_failure_paths"` simulates Hafnia timeouts/errors; frontend spec verifies status banner updates and timestamp display.

### Tests for User Story 3 ⚠️

- [ ] T027 [P] [US3] Add pytest coverage for Hafnia timeout + fallback messaging in `backend/tests/integration/test_analyze_endpoint.py::test_hafnia_failure`.
- [ ] T028 [P] [US3] Add frontend test covering spinner-to-error transition in `frontend/tests/analyze.spec.tsx::handles_server_error`.

### Implementation for User Story 3

- [ ] T029 [US3] Implement retry/backoff + graceful failure responses in `backend/app/services/hafnia_client.py`.
- [ ] T030 [US3] Ensure summarizer provides fallback copy when Hafnia returns partial/empty data in `backend/app/services/summarizer.py`.
- [ ] T031 [US3] Add status banner (aria-live region) and timestamp display in `frontend/src/components/StatusBanner.tsx` and integrate into page.
- [ ] T032 [US3] Update `frontend/src/components/SummaryPanel.tsx` to present error guidance and last-updated metadata.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Performance evidence, accessibility validation, documentation, and stretch containerization.

- [ ] T033 Document latency metrics and instrumentation steps in `docs/performance/clipnotes.md`.
- [ ] T034 Capture accessibility audit notes (axe report + manual keyboard walkthrough) in `specs/001-video-summary/quickstart.md`.
- [ ] T035 Create Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`) and `docker-compose.yml` for full-stack local deployment.
- [ ] T036 Run final lint/test sweep (`uv run ruff check`, `uv run pytest`, `npm run lint`) and record commands in `README.md` release checklist section.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → prerequisite for all other work.
- **Foundational (Phase 2)** depends on Setup completion and must finish before any user story begins.
- **User Story 1 (Phase 3)** depends on Phase 2 and delivers MVP.
- **User Story 2 (Phase 4)** depends on User Story 1.
- **User Story 3 (Phase 5)** depends on User Story 2.
- **Polish (Phase N)** depends on all desired user stories being complete.

### User Story Dependencies

- **US1**: Independent once foundational scaffolding is ready.
- **US2**: Builds upon US1 validation pathways but should not break US1 flows.
- **US3**: Builds upon US1 success path and US2 validation messaging to extend status handling.

### Parallel Opportunities

- Tests and implementation tasks marked [P] can run concurrently when touching separate files.
- Frontend and backend tasks within the same story may proceed in parallel once shared contracts are stable.
- Polish tasks can be split across team members after core stories land.

## Parallel Example: User Story 1

```bash
# Parallel test authoring
uv run pytest -k "test_analyze_success"  # backend integration test work
npm run test -- --runTestsByPath frontend/tests/analyze.spec.tsx  # frontend behavior tests

# Parallel implementation
code frontend/src/components/UploadForm.tsx &  # UI workstream
code backend/app/services/hafnia_client.py &   # API client workstream
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Deliver backend endpoint, Hafnia integration, and frontend summary display for US1.
3. Validate with `uv run pytest -k "test_analyze_success"` and manual upload smoke test.
4. Demo MVP before proceeding.

### Incremental Delivery

1. Add US2 validation improvements and confirm regression suite remains green.
2. Extend to US3 error/status handling, aligning UX copy.
3. Complete polish tasks for performance evidence and container packaging.

### Parallel Team Strategy

- Developer A: Backend services/tests.
- Developer B: Frontend UI + accessibility.
- Developer C: DevOps/documentation + Docker stretch goal once MVP lands.

---

## Notes

- Maintain submission IDs across logs, responses, and UI to simplify debugging.
- Record experiment notes and performance runs in `research.md` as iterations progress.

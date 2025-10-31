---

description: "Task list for ClipNotes Monitoring Wave 1"
---

# Tasks: ClipNotes Monitoring Wave 1

**Input**: Design documents from `/specs/002-clip-monitoring/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Backend logic MUST be covered by pytest executed via `uv run pytest`; frontend interactions should include Vitest coverage and accessibility checks where applicable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Documentation**: `README.md`, `.env.example`, `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dependencies, documentation, and shared configuration for Wave 1.

- [X] T001 Update backend dependencies (SQLAlchemy, aiosqlite) in `pyproject.toml` and regenerate `uv.lock` via `uv lock`
- [X] T002 Document `DATABASE_URL`, `HAFNIA_API_KEY`, `HAFNIA_BASE_URL` defaults in `.env.example`
- [X] T003 Refresh README setup instructions for new backend/frontend commands in `README.md`
- [X] T004 Add docker compose notes for health check + CORS configuration in `docs/performance/clipnotes.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish store abstraction, configuration, and shared middleware used by all stories.

- [X] T005 Create store interface and in-memory implementation in `backend/app/store/base.py` and `backend/app/store/memory.py`
- [X] T006 Implement SQLite store using SQLAlchemy async engine in `backend/app/store/sqlite.py`
- [X] T007 Wire store dependency into FastAPI app via `backend/app/api/deps.py`
- [X] T008 Configure CORS and `/healthz` route in `backend/app/api/routes.py` and `backend/main.py`
- [X] T009 Standardize error handler returning `{ "error": { ... } }` envelope in `backend/app/api/routes.py`
- [X] T010 Define store fixtures and shared factories in `backend/tests/conftest.py`

**Checkpoint**: Foundation ready — clip registration and analysis stories can run independently.

---

## Phase 3: User Story 1 - Register and Browse Clips (Priority: P1) 🎯 MVP

**Goal**: Allow operators to register clip metadata and list recent clips using the new store abstraction.

**Independent Test**: `uv run pytest -k "clips_api"` verifies clip creation/listing endpoints and pagination defaults.

### Tests for User Story 1 ⚠️

- [X] T011 [P] [US1] Add store unit tests for clip create/list in `backend/tests/unit/test_store_clips.py`
- [X] T012 [P] [US1] Add FastAPI integration tests for `/api/clips` endpoints in `backend/tests/integration/test_clips_endpoint.py`
- [X] T013 [P] [US1] Add Vitest spec covering clip registration/list fetch flow in `frontend/tests/monitoring.clips.spec.tsx`

### Implementation for User Story 1

- [X] T014 [US1] Implement clip repository methods (`create_clip`, `list_clips`, `get_clip`) in `backend/app/store/sqlite.py`
- [X] T015 [US1] Expose `/api/clips` POST/GET and `/api/clips/{clip_id}` GET handlers in `backend/app/api/routes.py`
- [X] T016 [US1] Extend `backend/app/models/schemas.py` with clip request/response models
- [X] T017 [US1] Update frontend `frontend/src/hooks/useAnalyze.ts` to call `POST /api/clips` before analysis
- [X] T018 [US1] Create clip list fetch helper in `frontend/src/hooks/useClips.ts`
- [X] T019 [US1] Render clip list in `frontend/src/components/SessionHistory.tsx` using store data
- [X] T020 [US1] Record lint/test results for US1 in `docs/performance/clipnotes.md`

**Checkpoint**: Clip registration and browsing functional end-to-end.

---

## Phase 4: User Story 2 - Trigger Hafnia Analysis (Priority: P1)

**Goal**: Invoke Hafnia VLM, store analysis results, and surface structured payload for clips.

**Independent Test**: `uv run pytest -k "analysis_api"` with fake Hafnia client plus `npm run test -- tests/monitoring.analysis.spec.tsx` validating frontend trigger.

### Tests for User Story 2 ⚠️

- [X] T021 [P] [US2] Add fake Hafnia client unit tests in `backend/tests/unit/test_hafnia_client.py`
- [X] T022 [P] [US2] Add integration tests for `/api/analysis/{clip_id}` POST/GET flows in `backend/tests/integration/test_analysis_endpoint.py`
- [X] T023 [P] [US2] Add Vitest spec to ensure Analyze button calls analysis API in `frontend/tests/monitoring.analysis.spec.tsx`

### Implementation for User Story 2

- [X] T024 [US2] Implement Hafnia client (`backend/app/services/hafnia.py`) with async HTTPX and fake variant
- [X] T025 [US2] Add analysis schemas (`AnalysisResponse`, `Moment`) to `backend/app/models/schemas.py`
- [X] T026 [US2] Extend store with `save_analysis`/`get_latest_analysis` in `backend/app/store/sqlite.py`
- [X] T027 [US2] Implement `/api/analysis/{clip_id}` POST/GET endpoints in `backend/app/api/routes.py`
- [X] T028 [US2] Update frontend `frontend/src/hooks/useAnalyze.ts` to link clip IDs with analysis trigger
- [X] T029 [US2] Show latest analysis summary + latency in `frontend/src/components/SummaryPanel.tsx`
- [X] T030 [US2] Log latency metrics to store and expose in `backend/app/api/routes.py`
- [X] T031 [US2] Update `docs/performance/clipnotes.md` with analysis latency capture instructions

**Checkpoint**: Clip analysis end-to-end with latency reporting operational.

---

## Phase 5: User Story 3 - Review Monitoring UI (Priority: P2)

**Goal**: Deliver timeline visualization, refreshed styling, and session history experience for coaches.

**Independent Test**: `npm run test -- tests/ui-timeline.spec.tsx` ensures timeline coloring, tooltips, and accessibility.

### Tests for User Story 3 ⚠️

- [X] T032 [P] [US3] Add Vitest spec for timeline rendering and tooltips in `frontend/tests/ui-timeline.spec.tsx`
- [X] T033 [P] [US3] Add axe accessibility snapshot for new components in `frontend/tests/accessibility.monitoring.spec.tsx`

### Implementation for User Story 3

- [X] T034 [US3] Build timeline visualization component in `frontend/src/components/Timeline.tsx`
- [X] T035 [US3] Apply gradient header + dark theme polish in `frontend/src/pages/App.tsx` and `frontend/src/styles/globals.css`
- [X] T036 [US3] Enhance `frontend/src/components/SessionHistory.tsx` with static follow-up dialogue display
- [X] T037 [US3] Ensure tooltips reveal label and start/end in `frontend/src/components/Timeline.tsx`
- [X] T038 [US3] Update `quickstart.md` with accessibility and UI verification steps
- [X] T039 [US3] Capture UX feedback notes in `specs/002-clip-monitoring/research.md`

**Checkpoint**: Monitoring dashboard ready with timeline and session visuals.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Consolidate documentation, polish, and quality gates after core stories.

- [ ] T040 [P] Add README section summarizing Wave 1 endpoints and frontend flows in `README.md`
- [ ] T041 [P] Run full lint/test sweep (`uv run ruff check`, `uv run pytest`, `npm run lint`, `npm run test`) and capture results in `docs/performance/clipnotes.md`
- [ ] T042 Document deployment readiness and Docker Compose usage in `docs/performance/clipnotes.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → prerequisite for all other phases.
- **Foundational (Phase 2)** depends on Setup completion and must finish before any user story work begins.
- **User Stories (Phases 3–5)** rely on foundational store/configuration but can proceed independently afterward (US1 & US2 are both P1 and may run in parallel once Phase 2 completes; US3 depends on APIs being available).
- **Polish (Phase N)** runs after desired user stories ship.

### User Story Dependencies

- **US1**: Requires foundational store and CORS; provides clip IDs consumed later.
- **US2**: Depends on US1 for clip existence but can be validated with seeded clips; ensure API contracts align.
- **US3**: Builds on US1/US2 endpoints to visualize data; frontend refactor should use established hooks from earlier stories.

### Within Each User Story

- Write tests (tasks marked ⚠️) before implementation tasks.
- Implement store/service logic before API layers.
- Update frontend hooks before rendering components to avoid unused data flows.
- Record verification artifacts after implementation completes.

---

## Parallel Opportunities

- Setup tasks T001–T004 can run concurrently because they touch distinct files.
- Foundational tasks T005–T010 span different modules (store, deps, routes) and can be split among developers once interfaces are defined.
- US1 testing tasks (T011–T013) may execute in parallel to speed up TDD cycles.
- US2 backend and frontend workstreams (e.g., T024–T027 vs. T028–T029) can proceed simultaneously after store support (T026) lands.
- US3 styling (T035) and timeline component (T034, T037) can be developed in parallel with accessibility checks (T033).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Deliver US1 backend + frontend clip registration and listing, then run `uv run pytest -k "clips_api"` and relevant Vitest specs.
3. Demo clip queue functionality before layering analysis features.

### Incremental Delivery

1. Ship US1 to provide basic monitoring registry.
2. Layer US2 to enable Hafnia analysis and latency tracking; ensure independent test suite passes.
3. Finish with US3 UI polish and timeline visualization to enhance operator experience.

### Parallel Team Strategy

- **Developer A**: Store infrastructure (Phase 2) then US1 backend endpoints.
- **Developer B**: Frontend hooks/components aligned with US1/US3.
- **Developer C**: Hafnia client and analysis APIs (US2) plus performance instrumentation.
- Rotate to Polish tasks once core stories validate.

---

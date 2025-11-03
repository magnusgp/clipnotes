# Tasks: Reasoning & Comparison

**Input**: Design documents from `/specs/003-reasoning-comparison/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Backend and shared logic MUST include pytest tasks executed via `uv run pytest`; frontend stories pair with Vitest coverage and accessibility checks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared documentation and scaffolding required by all stories.

- [X] T001 Create latency tracking template in `docs/performance/reasoning.md`
- [X] T002 Document Compare & Reason `uv run` / `pnpm` commands in `README.md`
- [X] T003 [P] Capture Hafnia credential reuse notes in `docs/credentials.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work.

- [X] T004 Add reasoning package scaffold (`backend/app/reasoning/__init__.py`, `backend/app/reasoning/router.py`) and register router in `backend/app/api/routes.py`
- [X] T005 Create shared Pydantic schemas in `backend/app/models/reasoning.py`
- [X] T006 [P] Scaffold reasoning test packages (`backend/tests/unit/reasoning/__init__.py`, `backend/tests/integration/test_reasoning_api.py`)

**Checkpoint**: Foundation ready – user stories can proceed in parallel once these tasks are complete.

---

## Phase 3: User Story 1 - Ask comparative question across clips (Priority: P1) 🎯 MVP

**Goal**: Allow operators to compare two analyzed clips and obtain a reasoned answer with evidence.

**Independent Test**: `uv run pytest backend/tests/integration/test_reasoning_api.py::test_compare_two_clips` and `pnpm test --run --filter compare-question` both pass using stored analyses.

### Tests for User Story 1

- [X] T007 [P] [US1] Add unit tests for comparison prompt/normalizer in `backend/tests/unit/reasoning/test_compare_service.py`
- [X] T008 [P] [US1] Add Vitest coverage for compare form workflow in `frontend/tests/reasoning/compare-form.test.tsx`
- [X] T009 [P] [US1] Add integration test skeleton for `POST /api/reasoning/compare` in `backend/tests/integration/test_reasoning_api.py`

### Implementation for User Story 1

- [X] T010 [US1] Implement comparison service logic in `backend/app/reasoning/compare.py`
- [X] T011 [US1] Wire `POST /api/reasoning/compare` endpoint in `backend/app/reasoning/router.py`
- [X] T012 [US1] Build Compare & Reason page shell in `frontend/src/pages/CompareReason.tsx` and register tab in `frontend/src/pages/App.tsx`
- [X] T013 [US1] Implement compare form component in `frontend/src/components/reasoning/CompareForm.tsx`
- [X] T014 [P] [US1] Add React Query hook for comparisons in `frontend/src/hooks/useCompareClips.ts`
- [X] T015 [US1] Render evidence heatmap via `frontend/src/components/reasoning/OverlapHeatmap.tsx`

**Checkpoint**: User Story 1 fully functional and independently testable (backend compare endpoint + frontend compare workflow).

---

## Phase 4: User Story 2 - Continue reasoning with follow-up history (Priority: P2)

**Goal**: Enable conversational follow-ups, persisting reasoning exchanges and exposing history retrieval.

**Independent Test**: `uv run pytest backend/tests/integration/test_reasoning_api.py::test_chat_history_round_trip` and `pnpm test --run --filter reasoning-history` succeed after refreshing the UI.

### Tests for User Story 2

- [X] T016 [P] [US2] Add unit tests for chat persistence in `backend/tests/unit/reasoning/test_chat_service.py`
- [X] T017 [P] [US2] Add Vitest coverage for history hook in `frontend/tests/reasoning/chat-hook.test.tsx`
- [X] T018 [P] [US2] Extend integration tests for `POST /api/reasoning/chat` and `GET /api/reasoning/history` in `backend/tests/integration/test_reasoning_api.py`

### Implementation for User Story 2

- [X] T019 [US2] Create Alembic migration and SQLAlchemy model for `reasoning_history` in `backend/db/migrations/versions/<timestamp>_reasoning_history.py` and `backend/app/models/reasoning_history.py`
- [X] T020 [US2] Implement chat service + Hafnia prompt assembly in `backend/app/reasoning/chat.py`
- [X] T021 [US2] Add persistence/repository helpers in `backend/app/reasoning/store.py`
- [X] T022 [US2] Wire chat and history endpoints in `backend/app/reasoning/router.py`
- [X] T023 [US2] Implement reasoning chat hook in `frontend/src/hooks/useReasoningChat.ts`
- [X] T024 [US2] Build Ask Anything panel in `frontend/src/components/reasoning/AskAnythingPanel.tsx`
- [X] T025 [US2] Render reasoning history list with local storage hydration in `frontend/src/components/reasoning/ReasoningHistory.tsx`

**Checkpoint**: User Story 1 & 2 deliver end-to-end conversational comparisons with persisted history.

---

## Phase 5: User Story 3 - Visualize reasoning insights (Priority: P3)

**Goal**: Surface charts and graph summaries derived from stored analysis metrics.

**Independent Test**: `uv run pytest backend/tests/integration/test_reasoning_api.py::test_metrics_payload` and `pnpm test --run --filter reasoning-visuals` validate metrics and graph rendering for analyzed clips.

### Tests for User Story 3

- [X] T026 [P] [US3] Add unit tests for metric extraction in `backend/tests/unit/reasoning/test_transformers.py`
- [X] T027 [P] [US3] Add integration tests for `GET /api/reasoning/metrics/{clip_id}` in `backend/tests/integration/test_reasoning_api.py`
- [X] T028 [P] [US3] Add Vitest coverage for chart and graph renderers in `frontend/tests/reasoning/metrics-panels.test.tsx`

### Implementation for User Story 3

- [X] T029 [US3] Implement metrics transformer utilities in `backend/app/reasoning/transformers.py`
- [X] T030 [US3] Wire metrics endpoint in `backend/app/reasoning/router.py`
- [X] T031 [US3] Implement metrics hook in `frontend/src/hooks/useReasoningMetrics.ts`
- [X] T032 [US3] Build auto charts component in `frontend/src/components/reasoning/AutoCharts.tsx`
- [X] T033 [US3] Build accessible graph visualizer in `frontend/src/components/reasoning/GraphVisualizer.tsx`

**Checkpoint**: All three user stories now provide comparative answers, conversational history, and visual insights.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidate docs, contracts, and validation across stories.

- [X] T034 [P] Update global API contract with reasoning endpoints in `contracts/api.yaml`
- [X] T035 [P] Record performance + accessibility results in `docs/performance/reasoning.md`
- [X] T036 Run full verification (`uv run pytest`, `pnpm test --run --filter reasoning`, `pnpm lint`) and capture summary in `specs/003-reasoning-comparison/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → must finish before Foundational tasks begin.
- **Foundational (Phase 2)** → blocks all user stories; complete before Phase 3+.
- **User Stories (Phases 3–5)** → can proceed sequentially in priority order or in parallel once Foundational tasks are complete.
- **Polish (Phase 6)** → occurs after desired user stories are implemented.

### User Story Dependencies

- **US1 (P1)** → depends only on Foundational phase.
- **US2 (P2)** → depends on Foundational phase; integrates with US1 data but remains independently testable.
- **US3 (P3)** → depends on Foundational phase; consumes analyses independently of US1/US2.

### Within Each User Story

- Tests are defined before their corresponding implementation tasks to encourage TDD.
- Services and endpoints depend on preceding model/schema work.
- Frontend hooks/components depend on compare/chat/metrics services before UI wiring.

### Parallel Opportunities

- Setup task T003 can run alongside Phase 1 documentation work.
- Foundational task T006 can run in parallel with T004/T005 once paths are confirmed.
- For US1, tasks T007–T009 can execute in parallel (test scaffolding) before implementation tasks T010–T015.
- Frontend development for US2 (T023–T025) can proceed concurrently after backend persistence (T019–T022) is shaped.
- US3 testing tasks T026–T028 may run concurrently before implementation.
- Polish tasks T034 and T035 can run in parallel, with T036 concluding after both user stories are complete.

## Implementation Strategy

### MVP First (User Story 1)
1. Complete Phases 1–2.
2. Deliver Phase 3 (US1) and validate via listed tests.
3. Demo comparative reasoning before continuing.

### Incremental Delivery
- Add US2 for conversational history.
- Add US3 for charts/graph visualizations once prior slices are stable.

### Suggested Parallel Teams
- Developer A: Backend compare + metrics services.
- Developer B: Frontend compare/chat UI.
- Developer C: Persistence + visualization polish.

### Independent Test Criteria Summary
- **US1**: Compare endpoint returns answer/evidence; compare UI form renders heatmap.
- **US2**: Chat endpoint persists responses; history rehydrates after reload.
- **US3**: Metrics endpoint supplies chart-ready data; visual components render accessible summaries.

**MVP Scope**: Complete Phases 1–3 (through User Story 1) to unlock initial comparative reasoning experience.

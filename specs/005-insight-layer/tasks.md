# Tasks: ClipNotes Insight Layer

**Input**: Design documents from `/specs/005-insight-layer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Keep automated coverage lean but meaningful: add one backend check per story via `uv run pytest`; rely on manual UI smoke passes noted in quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend code under `backend/app/` with migrations in `backend/db/migrations/`
- Frontend code under `frontend/src/` with tests in `frontend/tests/`
- Documentation in `specs/005-insight-layer/` and `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture environment toggles and baseline docs before coding.

- [x] T001 Update `.env.example` with `INSIGHTS_CACHE_TTL_SECONDS` and `INSIGHTS_SHARE_TOKEN_SALT` placeholders.
- [x] T002 Add `uv run` and `pnpm` command references for insights workflows to `specs/005-insight-layer/quickstart.md`.
- [x] T003 Create `docs/performance/insights.md` skeleton noting latency logging expectations.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish schema, models, and entry points required by all stories.

- [x] T004 Create Alembic migration `backend/db/migrations/versions/20251107_add_insight_shares.py` defining `insight_shares` table.
- [x] T005 Scaffold SQLAlchemy + Pydantic structures for snapshots and share tokens in `backend/app/models/insights.py`.
- [x] T006 Initialize service package (`backend/app/services/insights/__init__.py` and `backend/app/services/insights/service.py`) with dependency wiring stubs.
- [x] T007 Register placeholder router import in `backend/app/api/routes.py` pointing to `backend/app/api/insights.py`.

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Review rolling insights (Priority: P1) 🎯 MVP

**Goal**: Surface aggregated 24h/7d insights plus deterministic summary in UI.

**Independent Test**: `uv run pytest backend/tests/integration/test_insights_endpoint.py::test_get_insights_24h_success`

### Implementation for User Story 1

- [x] T008 [P] [US1] Add happy-path integration test in `backend/tests/integration/test_insights_endpoint.py` (24h snapshot).
- [x] T009 [US1] Implement aggregation logic in `backend/app/services/insights/aggregator.py` (hourly/daily buckets, severity totals).
- [x] T010 [US1] Implement deterministic summary builder in `backend/app/services/insights/generator.py`.
- [x] T011 [US1] Finalize response models and serializers in `backend/app/models/insights.py`.
- [x] T012 [US1] Compose insight retrieval workflow in `backend/app/services/insights/service.py`.
- [x] T013 [US1] Expose `GET /api/insights` in `backend/app/api/insights.py` and wire cache headers.
- [x] T014 [US1] Register insights router in `backend/app/api/routes.py` navigation.
- [x] T015 [US1] Define shared Insight types in `frontend/src/types/insights.ts`.
- [x] T016 [US1] Implement data hook in `frontend/src/hooks/useInsights.ts` for windowed fetch.
- [x] T017 [US1] Build trend chart component in `frontend/src/components/insights/InsightTrendChart.tsx`.
- [x] T018 [US1] Build summary card component in `frontend/src/components/insights/InsightSummaryCard.tsx`.
- [x] T019 [US1] Assemble Insights page in `frontend/src/pages/Insights.tsx` (chart + summary layout).
- [x] T020 [US1] Add Insights navigation entry in `frontend/src/pages/App.tsx`.

**Checkpoint**: Insights tab shows cached aggregation and fallback summary end-to-end.

---

## Phase 4: User Story 2 - Switch windows and regenerate narrative (Priority: P2)

**Goal**: Allow operators to toggle windows and bust cache on demand.

**Independent Test**: `uv run pytest backend/tests/unit/insights/test_window_validation.py::test_invalid_window_raises`

### Implementation for User Story 2

- [x] T021 [P] [US2] Add window validation + regen unit test in `backend/tests/unit/insights/test_window_validation.py`.
- [x] T022 [US2] Implement TTL cache helper in `backend/app/services/insights/cache.py` with async lock.
- [x] T023 [US2] Integrate cache + window validation into `backend/app/services/insights/service.py`.
- [x] T024 [US2] Add `/api/insights/regenerate` POST handler in `backend/app/api/insights.py`.
- [x] T025 [US2] Extend hook with regenerate and window switching in `frontend/src/hooks/useInsights.ts`.
- [x] T026 [US2] Create toolbar UI (window selector + regenerate) in `frontend/src/components/insights/InsightsToolbar.tsx`.
- [x] T027 [US2] Wire toolbar interactions on `frontend/src/pages/Insights.tsx` (optimistic UI + toast).

**Checkpoint**: Operators can change windows or regenerate summaries without restarting app.

---

## Phase 5: User Story 3 - Share a read-only insight snapshot (Priority: P3)

**Goal**: Provide tokenized share flow delivering cached insight view.

**Independent Test**: `uv run pytest backend/tests/integration/test_insights_share.py::test_share_token_round_trip`

### Implementation for User Story 3

- [x] T028 [P] [US3] Add share-link integration test in `backend/tests/integration/test_insights_share.py`.
- [x] T029 [US3] Implement share-store helpers in `backend/app/services/insights/share_store.py` (create + fetch).
- [x] T030 [US3] Implement `/api/insights/share` POST handler in `backend/app/api/insights.py`.
- [x] T031 [US3] Implement `/api/insights/share/{token}` GET handler in `backend/app/api/insights.py`.
- [x] T032 [US3] Add share fetch hook in `frontend/src/hooks/useInsightShare.ts`.
- [x] T033 [US3] Build share banner component in `frontend/src/components/insights/ShareBanner.tsx`.
- [x] T034 [US3] Build read-only share page in `frontend/src/pages/InsightsShare.tsx`.
- [x] T035 [US3] Register share route + navigation in `frontend/src/pages/App.tsx` (including public path guard).

**Checkpoint**: Stakeholders can open share link and view latest cached snapshot.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align docs, contracts, and verification notes across stories.

- [x] T036 Sync `specs/005-insight-layer/contracts/insights-openapi.yaml` with implemented payload fields.
- [x] T037 Refresh README highlight and demo checklist in `README.md` and `specs/005-insight-layer/quickstart.md`.
- [x] T038 Log performance timings, manual QA notes, and skipped suites in `specs/005-insight-layer/research.md`.

---

## Phase 7: User Story 4 - Export stakeholder-ready report (Priority: P4)

**Goal**: Allow operators to download a single-page stakeholder report summarizing the current insight snapshot.

**Independent Test**: `pnpm --prefix frontend test -- --run --filter insights-report`

### Implementation for User Story 4

- [x] T039 [P] [US4] Add report formatter in `frontend/src/utils/insightsReport.ts` that assembles summary, severity totals, top labels, and bucket data with export metadata.
- [x] T040 [US4] Add Vitest coverage in `frontend/tests/insights/insights-report.test.ts` validating formatter output structure and metadata.
- [x] T041 [US4] Create `frontend/src/components/insights/InsightsReportDialog.tsx` rendering preview + download controls with print-friendly styles.
- [x] T042 [US4] Integrate "Download report" action into `frontend/src/pages/Insights.tsx`, wiring export flow and feedback toasts.
- [ ] T043 [US4] Update `specs/005-insight-layer/quickstart.md` and `docs/performance/insights.md` with export verification steps and latency logging notes.
- [ ] T044 [US4] Record export UX learnings and reduced review time evidence in `specs/005-insight-layer/research.md`.

**Checkpoint**: Operators export the latest insight snapshot to a PDF-quality document within 10 seconds, complete with timestamped metadata.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — complete first to unblock environment clarity.
- **Foundational (Phase 2)**: Depends on Setup; required before any user story work.
- **User Stories (Phases 3–5)**: Begin after Foundational. Execute in priority order (P1 → P2 → P3) for incremental delivery.
- **Polish (Phase 6)**: Run after desired stories ship to consolidate docs and contracts.

### User Story Dependencies

- **US1**: Needs Phase 2 completed; produces MVP experience.
- **US2**: Builds on US1 cache/service wiring; requires GET endpoint baseline.
- **US3**: Depends on US1 payload structures and Phase 2 migration (share table).

### Within Each User Story

- Tests (when present) should be authored before implementation and executed via `uv run pytest`.
- Backend layers follow order: models → services → API handlers → hooks/UI.
- Frontend tasks sequence from types/hooks to components/pages to navigation.

### Parallel Opportunities

- Setup tasks T001–T003 can be handled concurrently.
- Foundational tasks T004–T007 touch separate files and can run in parallel once migration path agreed.
- During US1, frontend component tasks T017–T018 and navigation task T020 can proceed while backend service work finalizes.
- In US2 and US3, hook এবং UI work (T025–T027, T032–T035) can parallelize with backend endpoint implementation.

---

## Parallel Example: User Story 1

```bash
# Run backend integration test while iterating on service code
uv run pytest backend/tests/integration/test_insights_endpoint.py::test_get_insights_24h_success --maxfail=1 --ff

# In parallel, develop frontend components with hot reload
devserver="pnpm --prefix frontend dev -- --host"
$devserver
```

- Task T008 primes backend expectations.
- Tasks T017 and T018 can progress while service logic (T009–T013) is underway, minimizing idle time.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1–2 to lock schema and scaffolding.
2. Deliver Phase 3 to surface insights chart + summary.
3. Validate via targeted pytest and manual UI smoke, then demo MVP.

### Incremental Delivery

1. Add Phase 4 to enable window toggles and regeneration.
2. Layer Phase 5 for shareable snapshots to support stakeholders.
3. Finalize with Phase 6 polish tasks for docs and contracts.

### Parallel Team Strategy

- Developer A: Backend aggregation + caching (Phases 2–4).
- Developer B: Frontend insights UI + share flows (Phases 3–5).
- Developer C: Documentation, contracts, and polish (Phases 1 & 6).

Coordinate merges after each phase to keep the MVP shippable at all times.

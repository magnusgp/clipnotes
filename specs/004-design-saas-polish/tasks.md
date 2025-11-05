# Tasks: Design & SaaS Polish

**Input**: Design documents from `/specs/004-design-saas-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Backend and shared logic MUST include pytest tasks executed via `uv run pytest`; tailor UI-only stories with
accessibility and Vitest coverage when pytest is not applicable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend code lives under `backend/app/` with tests in `backend/tests/`
- Frontend code lives under `frontend/src/` with tests in `frontend/tests/`
- Documentation updates reside in `docs/` or `README.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared environment variables and documentation before feature work.

- [x] T001 Update `.env.example` with `ENABLE_LIVE_MODE`, `ENABLE_GRAPH_VIEW`, and `CLIPNOTES_THEME_DEFAULT` placeholders.
- [x] T002 Document new credential handling workflow in `docs/credentials.md` (Hafnia key rotation, flag overrides).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared backend and frontend infrastructure required by all stories.

- [x] T003 Create Alembic migration `backend/db/migrations/versions/<timestamp>_config_and_metrics.py` defining `config` and `request_counts` tables.
- [x] T004 Implement config persistence scaffold in `backend/app/services/config_store.py` with SQLite read/write helpers.
- [x] T005 Add shared fetch helper and error handling wrapper in `frontend/src/utils/api.ts` (JSON parsing, auth headers).

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Experience Premium Monitoring Shell (Priority: P1) 🎯 MVP

**Goal**: Deliver the polished hero, glass cards, typography, and theme toggle with persisted preference.

**Independent Test**: Run `pnpm test --run --filter ui-theming` and manually verify theme toggle persistence across refresh/navigation.

### Tests for User Story 1

- [x] T006 [P] [US1] Add Vitest coverage for ThemeProvider persistence in `frontend/tests/ui/theme-toggle.test.tsx` (expect stored preference).

### Implementation for User Story 1

- [x] T007 [US1] Install `@fontsource/inter` and `@fontsource/space-grotesk`, import fonts in `frontend/src/main.tsx` and `frontend/src/index.css`.
- [x] T008 [US1] Create `frontend/src/theme/ThemeProvider.tsx` with context, localStorage persistence, and reduced-motion support.
- [x] T009 [US1] Implement `frontend/src/components/ThemeToggle.tsx` wiring to ThemeProvider and accessible toggle states.
- [x] T010 [US1] Build glass-morphism motion Card in `frontend/src/components/Card.tsx` using Framer Motion hover/enter presets.
- [x] T011 [US1] Build gradient/video hero section in `frontend/src/components/Hero.tsx` with CTA anchors and responsive layout.
- [x] T012 [US1] Integrate Hero and ThemeToggle in `frontend/src/pages/App.tsx`, replacing legacy header markup.
- [x] T013 [US1] Replace existing monitoring panels with Card wrapper in `frontend/src/components/StatusBanner.tsx`, `SummaryPanel.tsx`, and `SessionHistory.tsx`.
- [x] T014 [US1] Centralize motion variants in `frontend/src/utils/motion.ts` and update new components to consume shared presets.
- [x] T015 [US1] Add dynamic favicon/theme metadata handling in `frontend/index.html` and runtime title updates in `frontend/src/main.tsx`.

**Checkpoint**: User Story 1 provides the polished monitoring shell with persistent theming.

---

## Phase 4: User Story 2 - Configure SaaS Settings (Priority: P2)

**Goal**: Let operators manage Hafnia keys, feature flags, and model parameters via Settings UI and persisted backend config.

**Independent Test**: Run `uv run pytest backend/tests/integration/test_config_api.py` and `pnpm test --run --filter saas-settings` to verify settings flows.

### Tests for User Story 2

- [x] T016 [P] [US2] Add pytest unit coverage for config store in `backend/tests/unit/test_config_store.py` (validate env override precedence).
- [x] T017 [P] [US2] Add Vitest form validation tests in `frontend/tests/settings/settings-form.test.tsx` (FPS/temperature constraints, masking).

### Implementation for User Story 2

- [x] T018 [US2] Define Pydantic schemas in `backend/app/models/config.py` for `ModelParams`, `Flags`, and update responses.
- [x] T019 [US2] Implement config service logic in `backend/app/services/config_service.py` (merge env defaults, persist JSON payloads).
- [x] T020 [US2] Implement Hafnia key storage helpers in `backend/app/services/key_store.py` (hash/encrypt, last-updated tracking).
- [x] T021 [US2] Wire `/api/config`, `/api/config/flags`, and `/api/keys/hafnia` routes in `backend/app/api/routes.py` with validation and responses.
- [x] T022 [US2] Create TypeScript types in `frontend/src/types/config.ts` mirroring OpenAPI contracts.
- [x] T023 [US2] Build API hooks in `frontend/src/hooks/useConfig.ts` (React Query or fetch wrapper) handling optimistic updates and errors.
- [x] T024 [US2] Implement Settings page with tabs in `frontend/src/pages/Settings.tsx` using glass cards and motion entrance.
- [x] T025 [US2] Add reusable form components in `frontend/src/components/settings/SettingsForms.tsx` (API keys, model params, feature flags).
- [x] T026 [US2] Register Settings route and navigation entry in `frontend/src/pages/App.tsx` (or shared nav component).
- [x] T027 [US2] Surface save/test notifications using toasts in `frontend/src/components/settings/SettingsForms.tsx` and ensure masking on revisit.

**Checkpoint**: User Story 2 delivers configurable SaaS settings with secure persistence and UI feedback.

---

## Phase 5: User Story 3 - Monitor Usage & Health (Priority: P3)

**Goal**: Surface live metrics through `/api/metrics`, request counters, and the Metrics dashboard page.

**Independent Test**: Run `uv run pytest backend/tests/integration/test_metrics_endpoint.py` and `pnpm test --run --filter metrics-dashboard` to validate metrics accuracy and rendering.

### Tests for User Story 3

- [x] T028 [P] [US3] Add pytest unit tests for metrics aggregation in `backend/tests/unit/test_metrics_service.py` (per-hour/day buckets, latency flag).
- [x] T029 [P] [US3] Add Vitest polling tests in `frontend/tests/metrics/metrics-page.test.tsx` (refresh cadence, warning state).

### Implementation for User Story 3

- [x] T030 [US3] Implement request counter middleware in `backend/app/api/middleware/request_counter.py` and register it in `backend/main.py`.
- [x] T031 [US3] Build metrics aggregation service in `backend/app/services/metrics_service.py` (totals, averages, per-hour/day breakdowns).
- [x] T032 [US3] Expose `/api/metrics` route in `backend/app/api/routes.py` returning MetricsResponse schema.
- [x] T033 [US3] Create TypeScript types and hook in `frontend/src/types/metrics.ts` and `frontend/src/hooks/useMetrics.ts` for polling data.
- [x] T034 [US3] Build metrics components `frontend/src/components/metrics/StatsTiles.tsx` and `frontend/src/components/metrics/UsageSparkline.tsx` with Framer Motion reveals.
- [x] T035 [US3] Implement Metrics page in `frontend/src/pages/Metrics.tsx` and register navigation entry.
- [x] T036 [US3] Introduce `/api/config/flags` client in `frontend/src/flags.ts` and conditionally render Metrics and live-mode UI sections.

**Checkpoint**: User Story 3 enables live metrics monitoring with backend data and animated dashboard.

---

## Phase 6: User Story 4 - Build Confidence with CI (Priority: P3)

**Goal**: Ensure automated lint/test/build pipeline with visible status badge.

**Independent Test**: Push branch to trigger workflow or run `pnpm lint && pnpm build && uv run pytest` locally to confirm CI parity.

### Implementation for User Story 4

- [x] T037 [P] [US4] Add GitHub Actions workflow `.github/workflows/ci.yml` running `uv sync`, `uv run ruff check backend`, `uv run pytest`, `pnpm install`, `pnpm lint`, and `pnpm build`.
- [x] T038 [US4] Update npm scripts or config if needed in `frontend/package.json` to support CI commands (build, lint, test filters).
- [x] T039 [US4] Add CI status badge and workflow instructions to `README.md` (include troubleshooting notes).
- [x] T040 [US4] Record workflow coverage details in `specs/004-design-saas-polish/quickstart.md` (link to CI run for future references).

**Checkpoint**: User Story 4 ensures CI pipelines guard lint/tests/build with visible status.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, contract updates, and holistic QA across stories.

- [x] T041 Update root API contract in `contracts/api.yaml` to include config, flags, keys, and metrics endpoints.
- [x] T042 Refresh README demo section with Settings/Metrics screenshots and tour steps in `README.md`.
- [x] T043 Document design tokens (fonts, colors, spacing) in `docs/design-tokens.md` and reference new components.
- [ ] T044 Run full verification commands (`uv run pytest`, `pnpm lint`, `pnpm build`) and log outcomes in `specs/004-design-saas-polish/research.md`.
- [ ] T045 Perform accessibility sweep (keyboard + prefers-reduced-motion) and capture notes in `specs/004-design-saas-polish/research.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks backend/frontend stories that require persistence utilities.
- **User Stories (Phases 3–6)**: Begin after Foundational. US1 can proceed first for MVP, while US2–US4 require shared config/migration scaffolding.
- **Polish (Phase 7)**: After desired user stories complete; consolidates documentation and QA.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational; provides MVP shell.
- **User Story 2 (P2)**: Requires Foundational migration/services; independent of US1 UI but integrates into navigation.
- **User Story 3 (P3)**: Requires config tables and flag client from Foundational/US2 for polling; may reference theme components from US1.
- **User Story 4 (P3)**: Depends on established test/lint commands from prior stories; no runtime dependencies.

### Within Each User Story

- Write tests before implementation for flagged tasks (T006, T016, T017, T028, T029).
- Models/services precede API routes; backend work precedes frontend hooks; hooks precede pages/components.
- Record verification commands (lint/tests) before moving to next story.

### Parallel Opportunities

- Setup tasks T001–T002 can run concurrently.
- Foundational tasks T003–T005 touch different files and can be parallelized.
- Once Foundational complete, teams can split: US1 (UI polish), US2 (settings backend + UI), US3 (metrics), US4 (CI).
- Within stories, tasks marked [P] (tests) can progress while implementations are in-flight by other teammates.

---

## Parallel Example: User Story 1

```bash
# Run Vitest focus while implementing components
pnpm test --run --filter ui-theming --watch
```

- Task T006 writes failing tests before implementation.
- In parallel, tasks T007 and T008 can be split (fonts vs ThemeProvider).
- Tasks T010 and T011 (Card/Hero) can proceed simultaneously once ThemeProvider exists.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Deliver Phase 3 (User Story 1) polished shell.
3. Validate UI via `pnpm test --run --filter ui-theming` and manual theme toggle checks.
4. Demo polished monitoring experience before continuing.

### Incremental Delivery

1. After MVP, tackle User Story 2 to unlock SaaS settings.
2. Add User Story 3 for metrics dashboard and latency visibility.
3. Conclude with User Story 4 to harden CI pipeline.
4. Finish with Phase 7 polish tasks before release/demo.

### Parallel Team Strategy

- Developer A: User Story 1 (hero, theme, cards).
- Developer B: User Story 2 (config backend + settings UI).
- Developer C: User Story 3 (metrics backend + dashboard).
- Developer D: User Story 4 and Polish tasks.

Assign cross-code reviews to ensure lint/tests remain green and documentation stays aligned.

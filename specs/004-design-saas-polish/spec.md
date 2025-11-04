# Feature Specification: Design & SaaS Polish

**Feature Branch**: `004-design-saas-polish`  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "Design & SaaS Polish (Feature 004) — premium visual polish, SaaS settings, metrics, and CI upgrades"

## Constitution Alignment *(mandatory)*

- **Linting**: Python changes (metrics endpoint, feature-flag service, settings persistence) will run through `uv run ruff check backend` and `uv run ruff format --check backend`. All TypeScript/React updates (theme system, hero, settings and metrics pages) will keep `pnpm lint` clean. The new GitHub Actions workflow will execute both commands plus `pnpm test --run` on pull requests.
- **Testing**: Back-end coverage expands with targeted suites (`uv run pytest backend/tests/unit/test_metrics_api.py`, `uv run pytest backend/tests/unit/test_feature_flags.py`, and integration coverage in `uv run pytest backend/tests/integration/test_metrics_endpoint.py`). Front-end behaviour (theme toggle persistence, settings flows, metrics dashboard) will be captured via Vitest runs such as `pnpm test --run --filter ui-theming` and `pnpm test --run --filter saas-settings`.
- **UV Usage**: All Python dependency and runtime steps stay on `uv`: `uv sync` (update lock if new packages like `python-dotenv` are required), `uv run ruff check ...`, `uv run pytest ...`, and `uv run coverage xml` if we surface coverage in CI. No alternate tooling is introduced.
- **Accessible UI**: Hero, card, settings, and metrics components leverage TailwindCSS, shadcn/ui primitives (cards, switches, tabs, dialogs), and motion utilities. We will verify WCAG 2.1 AA compliance via automated axe checks (`pnpm test --run --filter accessibility`) and manual keyboard/screen-reader passes, ensuring reduced-motion variants for animations.
- **Performance Budget**: The `/api/metrics` handler will log duration metrics, and we will instrument the monitoring view with browser `performance.mark` calls to confirm answers stay under the 10s (target ≤5s) budget for 15–30s clips. The metrics page will surface the same latency so regressions are obvious during demos.
- **Credential Handling**: Existing secrets (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`) remain in `.env`. New entries include `ENABLE_LIVE_MODE`, `CLIPNOTES_THEME_DEFAULT`, and `CLIPNOTES_FEATURE_FLAGS` (JSON). Hafnia API keys entered via the settings UI will be stored hashed/encrypted in the server’s secure store and documented in `docs/credentials.md`.
- **Iteration Plan**: Ship in three slices—(1) brand hero and theming foundation, (2) SaaS configuration surfaces (feature flags, API key, model parameters), (3) metrics endpoint/page plus CI workflow. After each slice we log findings in `specs/004-design-saas-polish/research.md` and update the team changelog.

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

### User Story 1 - Experience Premium Monitoring Shell (Priority: P1)

An operator lands on ClipNotes and immediately sees the new gradient/video hero, cohesive typography, neon accents, and animated cards, with a theme toggle that persists their preference.

**Why this priority**: Without the polished shell, the product still feels like a prototype. This story delivers the brand impact we need for the hackathon demo and improves first impressions for every user.

**Independent Test**: Run `pnpm test --run --filter ui-theming` for unit/UI tests and perform a manual pass verifying hero motion, typography, and theme persistence.

**Acceptance Scenarios**:

1. **Given** a new or returning operator, **When** they load the monitoring view, **Then** the hero section renders with gradient/video background, headline "See What’s Happening", and motion-enhanced cards without layout jank.
2. **Given** the operator toggles from dark to light mode, **When** they navigate to another page or refresh, **Then** the chosen theme is restored from localStorage and applied consistently.

---

### User Story 2 - Configure SaaS Settings (Priority: P2)

An operator opens the new Settings area, safely enters Hafnia API keys, adjusts feature flags and model parameters (FPS, temperature), and confirms that subsequent analyses respect their choices.

**Why this priority**: Real operators need to tweak models and rotate keys without deployments. This slice adds the “SaaS” credibility that investors expect.

**Independent Test**: Run `uv run pytest backend/tests/unit/test_settings_store.py` to validate persistence rules and `pnpm test --run --filter saas-settings` to cover the React form and masking logic.

**Acceptance Scenarios**:

1. **Given** a valid Hafnia API key and FPS/temperature inputs, **When** the operator saves the settings, **Then** the values are stored securely, masked on revisit, and a confirmation toast appears.
2. **Given** an operator launches a new clip analysis after updating parameters, **When** the backend enqueues the job, **Then** it applies the latest saved model settings and records which feature flags are active.

---

### User Story 3 - Monitor Usage & Health (Priority: P3)

Product and demo teams view a "Usage & Health" page showing today’s request totals, average answer latency, and clips analysed, with data streaming from the new `/api/metrics` endpoint.

**Why this priority**: The metrics dashboard provides tangible proof of performance and helps us narrate the hackathon story about scale and reliability.

**Independent Test**: Run `uv run pytest backend/tests/integration/test_metrics_endpoint.py` and `pnpm test --run --filter metrics-dashboard` to confirm endpoint accuracy and UI rendering.

**Acceptance Scenarios**:

1. **Given** at least one analysis has run today, **When** the metrics page is opened, **Then** the dashboard surfaces up-to-date totals and latency and refreshes at the configured polling interval.
2. **Given** the backend detects elevated latency, **When** the metrics endpoint is queried, **Then** the response includes threshold flags so the UI can surface a warning banner.

---

### User Story 4 - Build Confidence with CI (Priority: P3)

Engineering enables a minimal GitHub Actions workflow that runs lint, tests, and the production build on every pull request, presenting a green status badge inside the repository README.

**Why this priority**: Automated checks are part of the "polished SaaS" narrative and reduce regression risk while we accelerate iterations.

**Independent Test**: Trigger the workflow manually after adding it (or run `pnpm build && pnpm lint && uv run pytest` locally) to ensure the CI script passes.

**Acceptance Scenarios**:

1. **Given** a new PR is opened, **When** GitHub Actions runs, **Then** lint, tests, and build tasks complete successfully and the status badge reflects success.
2. **Given** a failure in lint/tests/build, **When** the workflow finishes, **Then** the PR shows a failing check with logs that identify the failing task.

### Edge Cases

- Theme toggle when reduced-motion is enabled must fall back to a non-animated transition while still applying the correct palette.
- Settings page must prevent saving when the Hafnia key field is empty or fails checksum validation and should surface inline errors.
- Metrics endpoint must gracefully respond with zeroed values when no clips have been analysed yet, ensuring the dashboard renders a useful empty state.
- Feature flags must default to a safe state when an unknown flag name is provided in the configuration payload or environment variable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monitoring landing page MUST display the new hero section with gradient/video background, “See What’s Happening” headline, and motion-enhanced cards that respond to hover/focus.
- **FR-002**: The application MUST offer a light/dark theme toggle that updates all views instantly and persists the selection per user (localStorage or equivalent).
- **FR-003**: Typography and spacing MUST be standardised (Inter body copy, Space Grotesk headings) with tokenised neon accent colours applied across components.
- **FR-004**: The frontend MUST update metadata (favicon, Open Graph image, social description) dynamically to match the polished brand.
- **FR-005**: A Settings page MUST allow operators to create, mask, rotate, and delete Hafnia API keys without exposing full values after save.
- **FR-006**: The settings flow MUST expose configurable model parameters (frame rate, temperature, max tokens) that the backend applies to all new analyses.
- **FR-007**: Feature flags MUST be manageable through environment configuration and surfaced in the Settings UI with enabled/disabled status indicators.
- **FR-008**: The backend MUST expose `/api/metrics` returning at least requests today, average response latency, clip analyses completed, and recent error count.
- **FR-009**: The frontend MUST render a Usage & Health page that consumes `/api/metrics`, refreshes on a schedule, and highlights warning thresholds visually.
- **FR-010**: A GitHub Actions workflow MUST run lint, tests, and build steps on pull requests and publish a status badge in the README.

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

- **SaaSConfiguration**: Aggregates operator-provided settings such as Hafnia keys (hashed), model parameters (fps, temperature, max tokens), and feature flag overrides, along with saved-at timestamps and operator attribution.
- **UsageMetricsSnapshot**: Represents a timestamped aggregate of usage (requests today, total clips analysed), latency averages, and error counts sourced from the analysis store and task queue.
- **BrandThemeProfile**: Captures global UI tokens (typography stack, accent palette, animation preferences, metadata assets) and the user’s persisted theme selection.

### Assumptions

- Settings values are stored server-side in the existing SQLite store with encryption at rest suitable for demos; production-grade KMS can follow later.
- Metrics will be derived from existing analysis/job tables without needing an external telemetry service.
- Video backgrounds will be optimised (`<10 MB` MP4/WebM) and lazy-loaded to preserve performance budgets.
- Only authenticated operators can access the new Settings and Metrics pages, leveraging existing auth middleware.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of usability test participants rate the visual design “polished” or better and complete the theme toggle flow in under 10 seconds.
- **SC-002**: Settings changes (API key rotation and model parameter updates) propagate to the next analysis request with confirmation logged within 30 seconds.
- **SC-003**: The Usage & Health page displays accurate metrics with a maximum data staleness of 15 seconds and renders within 1.5 seconds on repeat visits.
- **SC-004**: The GitHub Actions workflow passes on the first run for at least 90% of pull requests during the evaluation window, and the README badge remains green throughout the demo period.

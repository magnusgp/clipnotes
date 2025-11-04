# Implementation Plan: Design & SaaS Polish

**Branch**: `004-design-saas-polish` | **Date**: 2025-11-03 | **Spec**: [/specs/004-design-saas-polish/spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-design-saas-polish/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Elevate ClipNotes from hackathon prototype to a polished monitoring SaaS by refreshing the hero/visual system, adding configurable settings and feature flags, exposing usage metrics, and wiring CI to enforce lint/tests/build. Implementation spans React/Tailwind/Framer Motion UI components, new FastAPI endpoints for configuration, keys, and metrics stored in SQLite, and a GitHub Actions workflow covering lint, pytest, and frontend build.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite/React)  
**Primary Dependencies**: FastAPI, SQLAlchemy, HTTPX, TailwindCSS, shadcn/ui, Framer Motion, React Query (existing), GitHub Actions  
**Storage**: SQLite (existing app store) for persisted config, feature flags, metrics aggregation  
**Testing**: `uv run pytest` for backend (unit + integration), `pnpm test --run` with Vitest for frontend, `pnpm lint`  
**Target Platform**: Deployable containerised FastAPI service with Vite-built frontend served via same stack  
**Project Type**: Web application with decoupled backend (`backend/`) and frontend (`frontend/`)  
**Performance Goals**: Maintain ≤10s (target 5s) answer time for 15–30s clips; new metrics page must render <1.5s with cached assets  
**Constraints**: Demo scope only—secure-enough key storage, theme animations must respect reduced-motion; CI duration <10 min  
**Scale/Scope**: Single-tenant hackathon demo; expect ≤20 operators, dozens of clips/day; UI spans monitoring, settings, metrics pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Confirm lint coverage: Python modules (config API, metrics service, key store) will run through `uv run ruff check backend` (plus `uv run ruff format --check`). Frontend work (hero, settings, metrics, theme) keeps `pnpm lint` clean. GitHub Actions workflow executes both.
- Confirm backend testing: Add unit suites for config persistence, flag evaluation, metrics aggregation plus integration for `/api/config`, `/api/metrics`. Verification command remains `uv run pytest` and will be run locally and in CI.
- Confirm UV usage: All Python commands go through `uv`: `uv sync` if dependencies shift, `uv run ruff check`, `uv run pytest`, `uv run uvicorn` (manual smoke), `uv lock` if needed. No direct `pip` usage.
- Confirm UI accessibility and responsiveness: New components use Tailwind + shadcn/ui primitives and Framer Motion; we will run axe (`pnpm test --run --filter accessibility`) and manual keyboard/screen-reader sweeps, validating light/dark contrast and reduced-motion fallbacks.
- Confirm performance budget: `/api/metrics` will track latency data and we will log timing each request; frontend monitors via `performance.mark`. Hero animation will lazy-load media and respect prefers-reduced-motion to avoid exceeding budgets.
- Confirm credential hygiene: Hafnia keys stored hashed/encrypted in SQLite; env overrides documented in `docs/credentials.md`. New envs (`ENABLE_LIVE_MODE`, `CLIPNOTES_THEME_DEFAULT`) go into `.env.example` with rotation guidance.
- Confirm hackathon velocity: Deliver in three slices (Visual shell, SaaS settings/flags, Metrics+CI). After each slice we log findings in `specs/004-design-saas-polish/research.md` and ensure incremental demos.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── reasoning/
│   └── services/
├── db/
└── tests/
  ├── integration/
  └── unit/

frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── types/
│   └── utils/
└── tests/
  └── reasoning/

docs/
└── performance/

specs/
└── 004-design-saas-polish/
  ├── spec.md
  ├── plan.md
  ├── research.md
  ├── data-model.md
  ├── quickstart.md
  └── contracts/
```

**Structure Decision**: Maintain existing dual-project layout with `backend/` FastAPI app and `frontend/` Vite React client, extending current directories (components/pages/hooks, app/api/services) plus feature documentation under `specs/004-design-saas-polish/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

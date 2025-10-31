# Implementation Plan: ClipNotes Monitoring Wave 1

**Branch**: `002-clip-monitoring` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-clip-monitoring/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Wave 1 evolves ClipNotes from a single summary screen into a monitoring-style app. We will add REST endpoints for clip registration and Hafnia-triggered analysis, introduce a storage abstraction with a SQLite default, and refactor the frontend into modular panels featuring a severity-colored timeline and session history. This lays the groundwork for future analytics without reorganizing the repo.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript ES2020 (frontend)  
**Primary Dependencies**: FastAPI, HTTPX, Pydantic, SQLAlchemy 2.x (for SQLite store), pytest/pytest-asyncio, React 18, TailwindCSS, shadcn/ui, Vitest  
**Storage**: Pluggable store interface with SQLite (`DATABASE_URL` default `sqlite:///./clipnotes.db`) and in-memory implementation for tests  
**Testing**: Backend via `uv run pytest` (unit + integration), frontend via `npm run test` (Vitest) and axe a11y checks  
**Target Platform**: Local development on macOS/Linux with containerized deployment via Docker Compose  
**Project Type**: Web application with decoupled backend (`backend/`) and frontend (`frontend/`) packages  
**Performance Goals**: Hafnia analysis turnaround ≤10s for 15–30 s clips (target 5 s median) with latency logged per request  
**Constraints**: 100 MB clip metadata limit, consistent error envelope `{ "error": { ... } }`, WCAG 2.1 AA accessibility, `uv`-only Python workflows  
**Scale/Scope**: Single-team hackathon deliverable supporting dozens of concurrent clips and timelines during demo sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Lint coverage**: Backend work continues to run `uv run ruff check backend`, while frontend updates run `npm run lint`; both scripts already exist in CI and will be documented for this wave.
- **Backend testing**: New pytest modules (store abstraction, clips/analysis APIs, Hafnia client fake) will execute through `uv run pytest`, with focused markers called out in docs.
- **UV usage**: All Python package changes use `uv` (`uv lock`, `uv run uvicorn`, `uv run pytest`); no alternate tooling will be introduced.
- **UI accessibility**: Refactored panels rely on Tailwind + shadcn/ui components and will undergo keyboard walkthrough plus axe scans recorded in quickstart notes to uphold WCAG 2.1 AA.
- **Performance budget**: Clip registration and analysis endpoints will capture start/finish timestamps, store `latency_ms`, and surface the values in responses to evidence the ≤10 s requirement.
- **Credential hygiene**: Variables `DATABASE_URL`, `HAFNIA_API_KEY`, and `HAFNIA_BASE_URL` stay in `.env` (example only) with rotation guidance in README/quickstart; no secrets committed.
- **Hackathon velocity**: Delivery occurs in three slices (store + clips API, analysis service, frontend UI) with findings logged in `research.md` to maintain rapid iteration alignment.

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
│   └── services/
├── main.py
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── styles/
├── tests/
└── vite.config.ts

docs/
└── performance/

specs/
├── 001-video-summary/
└── 002-clip-monitoring/
```

**Structure Decision**: Retain the existing monorepo split—FastAPI backend under `backend/app` and Vite/React frontend under `frontend/`. New store modules live in `backend/app/store` (or equivalent) with tests in `backend/tests`, while frontend refactors stay inside `frontend/src/components` and `frontend/tests` to preserve current tooling.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |

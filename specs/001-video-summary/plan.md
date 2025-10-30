# Implementation Plan: ClipNotes Video Summary

**Branch**: `001-video-summary` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-video-summary/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver an MVP web experience where users upload short CCTV/dashcam clips and receive Hafnia VLM generated
summaries within 10 seconds. Architecture comprises a FastAPI backend (Python 3.11, managed through `uv`) handling
validation, Hafnia asset creation, and structured response formatting, plus a Vite/React frontend with Tailwind +
shadcn/ui for accessible, responsive interaction. Performance logs, secure environment handling, and pytest-backed
validation ensure the demo remains reliable during hackathon judging.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite)  
**Primary Dependencies**: FastAPI, Uvicorn, HTTPX, Pydantic, pytest, Ruff; React 18, React Router, shadcn/ui, TailwindCSS  
**Storage**: None (stateless processing; temporary files kept in memory/disk for the request lifecycle only)  
**Testing**: Pytest (unit + integration with Hafnia client mocked), React Testing Library + Playwright smoke (stretch)  
**Target Platform**: Local development on macOS/Linux, deployable to containerized Linux target  
**Project Type**: Web application with decoupled backend (`backend/`) and frontend (`frontend/`) workspaces  
**Performance Goals**: Return Hafnia summaries for 15–30s clips within ≤10s (target 5s) including upload + processing  
**Constraints**: Accept .mp4/.mkv ≤100MB; secrets must stay server-side; accessible UI (WCAG 2.1 AA); `uv`-only Python workflows  
**Scale/Scope**: Hackathon demo scope supporting single-user sequential uploads; no multi-tenant persistence required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Confirm lint coverage: Backend PRs will surface `uv run ruff check` (or `uv run ruff format --check` as needed),
  while the frontend exposes `npm run lint` (ESLint) enforced in CI.
- Confirm backend testing: Add pytest suites (`uv run pytest -k "video_summary"`) covering upload validation,
  Hafnia success, and failure paths; CI blocks merges without passing runs.
- Confirm UV usage: Document canonical commands (`uv lock`, `uv run uvicorn backend.main:app --reload`,
  `uv run pytest`) in README/quickstart; prohibit `pip` or raw python invocations.
- Confirm UI accessibility and responsiveness: Tailwind + shadcn/ui upload form, status panel, and summary display will
  be audited via keyboard navigation checklist and axe scans recorded in quickstart notes.
- Confirm performance budget: Instrument backend to log upload + Hafnia round-trip time; QA checklist validates ≤10s
  completion for representative clips with logs stored in `docs/performance/clipnotes.md`.
- Confirm credential hygiene: `.env.example` enumerates `HAFNIA_API_KEY`, `HAFNIA_BASE_URL`; docs explain loading via
  `uv run` + `dotenv`, with rotation guidance in README.
- Confirm hackathon velocity: Plan broken into half-day slices (backend skeleton, Hafnia client, frontend UI,
  integration + polish) with experiment notes appended to `research.md` after each slice.

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
│   │   └── routes.py
│   ├── core/
│   │   ├── config.py
│   │   └── logging.py
│   ├── services/
│   │   ├── hafnia_client.py
│   │   └── summarizer.py
│   └── models/
│       └── schemas.py
├── tests/
│   ├── unit/
│   │   └── test_hafnia_client.py
│   └── integration/
│       └── test_analyze_endpoint.py
└── main.py

frontend/
├── src/
│   ├── components/
│   │   ├── UploadForm.tsx
│   │   └── SummaryPanel.tsx
│   ├── hooks/
│   │   └── useAnalyze.ts
│   ├── pages/
│   │   └── App.tsx
│   └── styles/
│       └── globals.css
├── public/
└── tests/
  └── analyze.spec.tsx
```

**Structure Decision**: Establish separate `backend/` and `frontend/` workspaces to respect framework tooling,
support independent lint/test commands, and simplify Vite proxy configuration. Tests mirror the constitution’s
expectation for pytest coverage and future frontend smoke checks.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* |  |  |

## Phase 0 – Research & Unknowns

1. Confirm Hafnia `/assets` + `/chat/completions` workflow specifics (payload fields, authentication headers).
2. Document FastAPI + HTTPX best practices for streaming uploads while enforcing 100MB/30s limits.
3. Capture prompt engineering template ensuring JSON-first responses with graceful fallback copy.
4. Collect accessibility checklist (axe workflow, keyboard map) for Tailwind + shadcn components.
5. Define Vite proxy and CORS settings enabling seamless local full-stack testing.

Status: Completed. Findings captured in `research.md`; no outstanding NEEDS CLARIFICATION markers remain.

## Phase 1 – Design & Contracts

1. Data model defined in `data-model.md` (VideoSubmission, ProcessingStatus, SummaryReport).
2. OpenAPI contract saved at `contracts/api.yaml` with validation/error schemas.
3. Quickstart instructions (`quickstart.md`) outline canonical `uv` and lint/test commands plus proxy workflow.
4. Copilot agent context updated via `.specify/scripts/bash/update-agent-context.sh copilot` to broadcast stack info.
5. Constitution re-check complete: lint/test tooling, performance instrumentation, accessibility plan, and secret
   handling all documented.

## Phase 2 – Implementation Planning Preview

- Backend sequence: scaffold FastAPI app shell → validation guards → Hafnia client + retries → summary formatter →
  pytest coverage and latency logging.
- Frontend sequence: build upload form with shadcn/ui → integrate analyze hook with loading + error states → render
  summary (bullets + JSON view) → run accessibility + responsive sweeps.
- Integration: configure Vite proxy, align CORS, smoke test end-to-end via mocked Hafnia responses before live key use.
- Stretch: author Dockerfiles and docker-compose once MVP paths pass performance + accessibility checks.

# Implementation Plan: Reasoning & Comparison

**Branch**: `003-reasoning-comparison` | **Date**: 2025-10-31 | **Spec**: `/specs/003-reasoning-comparison/spec.md`
**Input**: Feature specification from `/specs/003-reasoning-comparison/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable operators to compare two analyzed clips and ask contextual questions without reprocessing media. The backend will expose FastAPI endpoints under `/api/reasoning` that fetch stored analyses, assemble prompts for the Hafnia Cosmos-Reason1-7B API, and persist reasoning history. The frontend will add a "Compare & Reason" tab in the monitoring view that orchestrates comparison flows, conversational follow-ups, and visualization panels fed by reasoning metrics.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11 (backend), TypeScript ES2020 (frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy 2.x, HTTPX, Pydantic, React 18, React Query, TailwindCSS, shadcn/ui  
**Storage**: SQLite via SQLAlchemy (existing `DATABASE_URL`), browser local storage for chat history cache  
**Testing**: `uv run pytest`, `uv run pytest backend/tests/unit`, `pnpm test --run --filter reasoning`  
**Target Platform**: FastAPI service on Linux container + Vite/React client in modern browsers  
**Project Type**: Web application with decoupled backend/frontend  
**Performance Goals**: ≤3s reasoning answers observed at browser boundary, ≤10s end-to-end budget  
**Constraints**: External Hafnia API latency, limit prompts to stored analysis summaries, maintain WCAG 2.1 AA, reuse existing auth context  
**Scale/Scope**: Operators comparing handful of clips per incident (<10 concurrent sessions), initial release limited to two-clip comparisons with follow-up Q&A

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Lint coverage: Python additions in `backend/reasoning` will run through `uv run ruff check backend` and formatting guard `uv run ruff format --check backend`. Frontend tab work will rely on existing CI job running `pnpm lint` (ESLint). Both commands will be executed locally before PR submission.
- Backend testing: New services and routers gain unit tests under `backend/tests/unit/reasoning/` and integration coverage in `backend/tests/integration/test_reasoning_api.py`, all executed with `uv run pytest`. Failure triage will block merges per Constitution II.
- UV usage: All backend scripts, dependency sync, and server runs continue via `uv sync`, `uv run pytest`, `uv run ruff check`, and `uv run uvicorn backend.main:app --reload` for manual validation. No direct `pip` or alternative tooling introduced.
- UI accessibility/responsiveness: The Compare & Reason tab will extend shadcn/ui tabs, cards, and charts. Keyboard nav and focus order will be verified through Storybook smoke checks and manual testing with VoiceOver, supplemented by `pnpm test --run --filter accessibility`.
- Performance budget: Instrument endpoint latency via FastAPI middleware logging and capture browser `performance.mark` around reasoning requests. Acceptance requires ≤3s average response and ≤10s p95 for clip pairs, with findings stored in `docs/performance/reasoning.md`.
- Credential hygiene: Feature reuses `HAFNIA_API_KEY` and `HAFNIA_BASE_URL` already documented in `.env.example`. No new secrets added; rotation guidance remains in `docs/credentials.md`.
- Hackathon velocity: Deliver in three slices—(1) compare endpoint + UI stub, (2) chat/history persistence, (3) metrics visualizations and graph view. Each slice concludes with status notes in `specs/003-reasoning-comparison/research.md` and a demo clip for stakeholders.

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

```text
backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── services/
│   └── reasoning/        # new package (compare.py, chat.py, transformers.py)
├── db/
├── main.py
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   │   └── CompareReason.tsx
│   └── services/
└── tests/
    └── reasoning/
```

**Structure Decision**: Use the existing two-project layout (`backend/`, `frontend/`). Backend gains a dedicated `app/reasoning` package and accompanying tests; frontend introduces a monitoring tab page with supporting components and hooks.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

# Implementation Plan: ClipNotes Insight Layer

**Branch**: `005-insight-layer` | **Date**: 2025-11-06 | **Spec**: [/specs/005-insight-layer/spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-insight-layer/spec.md`

## Summary

We are extending the Insight Layer to include a polished, single-page report export on top of the existing aggregation, narrative, and share capabilities. The backend continues to aggregate clip analyses via FastAPI services, cache snapshots, and expose share tokens, while the frontend renders the insights dashboard, share view, and now a downloadable PDF-quality report that captures the summary, severity mix, top labels, and chart snapshot for stakeholders.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript ES2020 + React 18 (frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy 2.x, HTTPX, Pydantic, React Query, TailwindCSS, shadcn/ui, Framer Motion, charting via existing components; evaluate lightweight HTML-to-PDF tooling (e.g., `@react-pdf/renderer` or client-side print-to-PDF) during implementation  
**Storage**: PostgreSQL/SQLite through SQLAlchemy for insights and share tokens  
**Testing**: `uv run pytest` (backend unit + integration suites), `pnpm --prefix frontend test -- --run` (Vitest/Testing Library), axe accessibility sweeps  
**Target Platform**: Render-hosted FastAPI service with Vercel SPA frontend  
**Project Type**: Web application with decoupled backend/frontend workspaces  
**Performance Goals**: Insight generation and report export complete ≤10s (target 5s) for 15–30s clip windows; cached responses served <1s  
**Constraints**: Maintain WCAG 2.1 AA compliance, keep exported document within a single page, avoid introducing heavyweight server-side rendering  
**Scale/Scope**: Operators reviewing dozens of clips per day; share links and reports circulated to small leadership groups (<50 concurrent viewers)

## Constitution Check

- Confirm lint coverage: Backend changes will pass `uv run ruff check backend`; frontend work will run `pnpm --prefix frontend lint`, both enforced by CI.  
- Confirm backend testing: Add regression coverage for aggregation edge cases and share/report flows, executed via `uv run pytest backend/tests/...`; document command outputs in PRs.  
- Confirm UV usage: All Python actions (tests, servers, scripts) continue through `uv run` and `uv sync`; any migration or seeding scripts will follow the same pattern.  
- Confirm UI accessibility and responsiveness: Report export UI will use Tailwind and shadcn/ui buttons/modals; run axe and keyboard checks, ensure contrast in generated document, and verify responsive layout before sign-off.  
- Confirm performance budget: Instrument insight generation + export timing via structured logs, capturing evidence in `docs/performance/insights.md` to show ≤10s compliance.  
- Confirm credential hygiene: Reuse documented env vars (`DATABASE_URL`, Hafnia creds, `INSIGHTS_CACHE_TTL_SECONDS`, `INSIGHTS_SHARE_TOKEN_SALT`); note any optional report configuration in `.env.example` without storing secrets in git.  
- Confirm hackathon velocity: Deliver increments per spec (US1–US4), logging experiment outcomes and demo screenshots in `research.md` and `quickstart.md` for rapid iteration.

## Project Structure

### Documentation (this feature)

```text
specs/005-insight-layer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   ├── models/
│   ├── services/
│   └── templates/            # potential HTML export helpers (to be added if needed)
└── tests/
    ├── unit/insights/
    └── integration/

frontend/
├── src/
│   ├── components/insights/
│   ├── hooks/
│   ├── pages/
│   └── utils/
└── tests/
```

**Structure Decision**: Continue with the existing web application split. Backend `app/services/insights` extends aggregation, caching, share, and export helpers; frontend `src/pages/Insights.tsx` and related components gain report controls while reusing shared hooks.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| None | n/a | n/a |

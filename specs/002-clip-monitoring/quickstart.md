# ClipNotes Monitoring Wave 1 – Quickstart

## Prerequisites
- Python 3.11 with `uv` installed and available on PATH.
- Node.js 20 LTS with npm (or pnpm) configured for the frontend workspace.
- Hafnia credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`).
- Optional: Docker and Docker Compose for containerized runs.

## Environment Setup
1. Copy `.env.example` to `.env` and populate `HAFNIA_API_KEY`, `HAFNIA_BASE_URL`, and (optionally) override `DATABASE_URL`.
2. Set `HAFNIA_USE_FAKE=true` only if you need offline demos; otherwise leave it `false` (default) to hit the real Hafnia service. Ensure each registered clip references an existing Hafnia asset ID (the clip UUID is reused as the asset identifier during local demos).
3. Resolve backend dependencies: `uv lock` (regenerates `uv.lock` if dependencies change).
4. Install frontend dependencies: `cd frontend && npm install`.

## Running the Backend
```bash
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- Lint: `uv run ruff check backend`
- Tests: `uv run pytest`
- Health: `curl http://localhost:8000/healthz`

## Running the Frontend
```bash
cd frontend
npm run dev
```
- Dev server proxies `/api` to `http://localhost:8000`.
- Lint: `npm run lint`
- Unit/UI tests: `npm run test -- --run tests/analyze.spec.tsx`
- Timeline rendering: `npm run test -- --run tests/ui-timeline.spec.tsx`
- Accessibility sweep: `npm run test -- --run tests/accessibility.monitoring.spec.tsx` plus manual keyboard walkthrough.

## Verification Workflow
1. Register a clip via the UploadPanel – frontend calls `POST /api/clips` and refreshes the clip list banner.
2. Trigger analysis with AnalyzeClipButton – backend logs Hafnia latency and the timeline renders severity-colored segments.
3. Hover timeline bars to confirm label and timestamps surface through tooltips and sr-only descriptions.
4. Run `npm run test -- --run tests/accessibility.monitoring.spec.tsx` to ensure the composed dashboard remains axe-clean, then keyboard the interface to confirm focus treatment on timeline and follow-up controls.
5. Review SessionHistory for registered clips, static follow-up prompts, and the ability to delete a session while the status banner resets to "Ready to analyze".

## Containerized Option
```bash
docker compose up --build
```
- Backend listens on `http://localhost:8000` with CORS configured for `5173` hosts.
- Frontend served via nginx on `http://localhost:5173` consuming the same API routes.

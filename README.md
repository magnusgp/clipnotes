# ClipNotes

ClipNotes is a hackathon-ready web experience that turns short CCTV or dashcam clips into quick, readable summaries
powered by the Hafnia VLM API. The stack pairs a FastAPI backend (Python 3.11, managed via `uv`) with a Vite + React
frontend styled using Tailwind CSS and shadcn/ui components.

## Prerequisites

- Python 3.11
- [`uv`](https://docs.astral.sh/uv/) package manager
- Node.js 20 LTS with npm or pnpm
- Hafnia API credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`)
- Optional: set `HAFNIA_USE_FAKE=true` when you need the stubbed Hafnia responses (default is the real API).

## Getting Started

```bash
# Install backend dependencies
uv lock

# Launch FastAPI locally
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, install frontend deps and start Vite
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:8000`, so the frontend can call the backend without additional CORS
configuration. The backend reads `DATABASE_URL` (defaults to `sqlite+aiosqlite:///./clipnotes.db`) along with Hafnia
credentials from `.env`.

## Linting & Tests

- Backend lint: `uv run ruff check backend`
- Backend tests: `uv run pytest`
- Backend targeted suites: `uv run pytest -k "clips_api"` (clip registry) and `uv run pytest -k "analysis_api"` (Hafnia analysis)
- Frontend lint: `npm run lint`
- Frontend tests: `npm run test`
- Frontend monitoring specs: `npm run test -- tests/monitoring.clips.spec.tsx`
- Compare & Reason backend: `uv run pytest backend/tests/integration/test_reasoning_api.py`
- Compare & Reason frontend: `pnpm --prefix frontend test --run --filter reasoning`

## Monitoring Wave 1 Overview

- REST endpoints:
	- `POST /api/clips` registers a clip filename and returns the clip ID and status metadata.
	- `GET /api/clips?limit=25` lists recent clips with `latency_ms` and `last_analysis_at` for the monitoring sidebar.
	- `POST /api/analysis/{clip_id}` triggers Hafnia by calling `/chat/completions` with the clip's asset identifier, returning the structured summary, timeline moments, and latency stamp.
	- `GET /api/analysis/{clip_id}` fetches the latest analysis payload for replays or refresh states.
	- `POST /api/chat` (follow-up assistant) logs threaded questions against an existing submission.
- Frontend flows:
	- **Upload & Analyze**: `UploadForm` posts to `/api/clips`, then calls `/api/analysis/{clip_id}` and streams status updates through `StatusBanner` and `SummaryPanel`.
	- **Timeline review**: `Timeline` renders Hafnia `moments` with severity color-coding, sr-only descriptions, and tooltips for quick scanning.
	- **Session history**: `SessionHistory` hydrates from `GET /api/clips`, supports clip re-selection, follow-up prompts, and asset deletion with optimistic UI state.
	- **Accessibility**: The monitoring canvas passes axe checks via `npm run test -- --run tests/accessibility.monitoring.spec.tsx`, and all interactive controls have keyboard focus styles.
	- **Asset IDs**: Monitoring assumes each clip maps to an existing Hafnia asset; by default we reuse the clip UUID as the asset identifier when requesting `/chat/completions`.

## Environment Variables

Copy `.env.example` to `.env` and populate the Hafnia credentials (do **not** commit real secrets):

```bash
cp .env.example .env
```

`HAFNIA_USE_FAKE` defaults to `false`, so uv and Docker runs will call the live Hafnia API. Flip it to `true` only when you need offline demos or tests.

## Project Structure

```text
backend/
	app/
		api/
		core/
		services/
		models/
	tests/

frontend/
	src/
		components/
		hooks/
		pages/
		styles/
	tests/

specs/001-video-summary/
	plan.md
	tasks.md
	research.md
	data-model.md
	contracts/

specs/002-clip-monitoring/
	plan.md
	tasks.md
	research.md
	data-model.md
	contracts/
	quickstart.md

docs/
	performance/
		clipnotes.md
```

## Performance & Accessibility

- Backend logs will capture Hafnia round-trip latency to confirm the ≤10s turnaround requirement.
- Frontend components are built with shadcn/ui primitives and audited with keyboard navigation + axe scans (see
	`specs/001-video-summary/quickstart.md`).

## Release Checklist

Run these commands before tagging a release or sharing a demo build:

```bash
uv run ruff check .
uv run pytest
npm --prefix frontend run lint
npm --prefix frontend run test -- run tests/analyze.spec.tsx
# Optional: docker compose build && docker compose up
```

# ClipNotes

ClipNotes is a hackathon-ready web experience that turns short CCTV or dashcam clips into quick, readable summaries
powered by the Hafnia VLM API. The stack pairs a FastAPI backend (Python 3.11, managed via `uv`) with a Vite + React
frontend styled using Tailwind CSS and shadcn/ui components.

## Prerequisites

- Python 3.11
- [`uv`](https://docs.astral.sh/uv/) package manager
- Node.js 20 LTS with npm or pnpm
- Hafnia API credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`)

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
configuration.

## Linting & Tests

- Backend lint: `uv run ruff check backend`
- Backend tests: `uv run pytest`
- Frontend lint: `npm run lint`
- Frontend tests: `npm run test`

## Environment Variables

Copy `.env.example` to `.env` and populate the Hafnia credentials (do **not** commit real secrets):

```bash
cp .env.example .env
```

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
```

## Performance & Accessibility

- Backend logs will capture Hafnia round-trip latency to confirm the ≤10s turnaround requirement.
- Frontend components are built with shadcn/ui primitives and audited with keyboard navigation + axe scans (see
	`specs/001-video-summary/quickstart.md`).

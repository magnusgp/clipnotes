# ClipNotes Video Summary – Quickstart

## Prerequisites
- Python 3.11 installed locally
- `uv` package manager available on PATH
- Node.js 20 LTS + pnpm or npm
- Hafnia VLM API credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`)

## Environment Setup
1. Copy `.env.example` to `.env` and populate the Hafnia credentials (keep actual values out of version control).
2. Run `uv lock` in the repository root to resolve backend dependencies.
3. Install frontend dependencies: `cd frontend && npm install` (or `pnpm install`).

## Running the Backend
```bash
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- Lint: `uv run ruff check backend`
- Tests: `uv run pytest -k "video_summary"`
- Logs capture upload latency per request for performance evidence.

## Running the Frontend
```bash
cd frontend
npm run dev
```
- Dev server listens on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.
- Lint: `npm run lint`
- Accessibility: run `npm run test:axe` (script to be added) or execute manual keyboard walkthrough.

## Usage Flow
1. Open the frontend and select an MP4/MKV under 100MB and 30 seconds.
2. Click **Analyze** to trigger `POST /api/analyze`.
3. Observe loading spinner; once complete, review bullet summary or JSON view.
4. Check browser console and backend logs for latency metrics.

## Accessibility Audit Notes
- Run `npm run test:axe` (to be added) or execute `npx @axe-core/playwright` during manual sweeps.
- Keyboard path: `Tab` into **Analyze clip**, `Shift+Tab` to return to file input, confirm focus rings match contrast guidelines.
- Status Banner announces updates via `aria-live="polite"`; verify with screen readers (VoiceOver, NVDA).
- Ensure error alerts provide remediation text and are reachable via `Shift+Tab` immediately after submission failures.
- Record findings and any remediation work in this section after each audit cycle.

## Stretch Goal – Containers
- Backend image: build with `docker build -f backend/Dockerfile -t clipnotes-backend .`
- Frontend image: build with `docker build -f frontend/Dockerfile -t clipnotes-frontend .`
- Compose file will bind the two services and inject `.env` values once MVP stabilises.

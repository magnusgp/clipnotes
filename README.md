# ClipNotes ![CI](https://github.com/magnusgp/clipnotes/actions/workflows/ci.yml/badge.svg) ![Ruff](https://img.shields.io/badge/lint-ruff-%23f97316?logo=ruff&logoColor=white) ![Bandit](https://img.shields.io/badge/security-bandit-%230b7285)

> Summaries you can trust, in seconds. ClipNotes turns raw CCTV or dashcam footage into brief, actionable recaps for training, safety, and incident reviews.

## Why ClipNotes

- **Lightning-fast summaries** – Upload a clip and receive a structured brief with key moments, latency data, and remediation tips.
- **Live operator console** – Monitor active analyses, revisit previous sessions, and triage follow-up questions without leaving the dashboard.
- **SaaS-ready controls** – Tweak Hafnia model parameters, feature flags, and theme preferences in a dedicated settings workspace.
- **Usage & health metrics** – Track request cadence, clip throughput, and latency warnings from a real-time metrics view.

The platform combines a FastAPI backend (Python 3.11 via `uv`) with a Vite + React frontend styled using Tailwind CSS, shadcn/ui, and Framer Motion. Production runs a managed Postgres instance on Neon, serves the frontend from Vercel, and deploys the backend on Render.

## Quick Start

1. **Install prerequisites**
   - Python 3.11 with [`uv`](https://docs.astral.sh/uv/)
   - Node.js 20 LTS with [`pnpm`](https://pnpm.io/) (npm works too)
   - Hafnia API credentials (`HAFNIA_API_KEY`, `HAFNIA_BASE_URL`)

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Add Hafnia credentials, Neon Postgres connection string, and optional defaults (ENABLE_LIVE_MODE, ENABLE_GRAPH_VIEW, CLIPNOTES_THEME_DEFAULT)
   ```

3. **Launch the backend**

   ```bash
   uv sync
   uv run alembic upgrade head
   uv run uvicorn backend.main:app --reload
   ```

4. **Launch the frontend**

   ```bash
   cd frontend
   pnpm install
   pnpm dev -- --host
   ```

Visit `http://localhost:5173` to access the monitoring console. Vite proxies API calls to `http://localhost:8000`, so no extra CORS setup is required.

## Feature Tour

### Monitoring Workspace

- Drag-and-drop upload for short clips
- Real-time status banner with latency tracking
- Summary panel with structured Hafnia output
- Session history to revisit or delete processed clips
- Follow-up assistant for additional questions about any clip

### SaaS Settings

- `GET/PUT /api/config` exposes persisted model parameters, theme overrides, and feature flags
- Accessible tab interface lets operators adjust FPS, temperature, default prompts, and live/demo flags
- `/api/keys/hafnia` securely stores the hashed Hafnia key while surfacing configuration status
- Theme toggle and provider respect user preference, system defaults, and reduced-motion settings

### Metrics Dashboard

- `/api/metrics?window=12h|24h|7d` returns total clips, analyses, request counts, latency averages, and error rates
- Request counter middleware records API usage per day without touching OPTIONS or non-API traffic
- Animated tiles showcase today’s usage, lifetime totals, and latency warnings
- Sparkline visualises hourly activity while the table summarises daily aggregates
- Feature flag gating (`ENABLE_GRAPH_VIEW`) allows environments to hide the dashboard when needed

## Deployment Notes

- Production database uses Neon Postgres; set `DATABASE_URL` accordingly for local development or staging.
- Frontend deploys to Vercel, while the FastAPI backend runs on Render. Keep credentials and environment variables aligned across both platforms.
- Set `HAFNIA_USE_FAKE=true` to run against the built-in stub during demos or automated tests.
- Metrics counters rely on wall-clock UTC; ensure the hosting environment maintains accurate time.

## Tooling & Verification

| Stage | Command |
|-------|---------|
| Backend lint | `uv run ruff check backend` |
| Backend tests | `uv run pytest` |
| Frontend lint | `pnpm --prefix frontend lint` |
| Frontend tests | `pnpm --prefix frontend test:ci` |
| Build artefacts | `pnpm --prefix frontend build` |

GitHub Actions (`.github/workflows/ci.yml`) executes the same sequence on every push, keeping the badge above in sync.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.x, HTTPX, Alembic, Pydantic, asyncpg — deployed to Render
- **Database**: Postgres on Neon with async connections (asyncpg)
- **Frontend**: React 18, React Router, React Query, Tailwind CSS, shadcn/ui, Framer Motion, Vitest, Testing Library — deployed to Vercel
- **CI & Security**: GitHub Actions, Ruff, Bandit
- **Tooling**: `uv` for Python dependency management, `pnpm` for workspace installs

Need help or curious about the Hafnia integration? Review the OpenAPI contract in `contracts/api.yaml` or reach out via issues. ClipNotes aims to make safety reviews faster—let us know how it can help you.

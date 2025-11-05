# Quickstart: Design & SaaS Polish Feature

## Backend

1. Sync dependencies (adds any new crypto/metrics helpers):
   ```bash
   uv sync
   ```
2. Apply SQLite migration adding `config` table and request counters:
   ```bash
   uv run alembic upgrade head
   ```
3. Launch FastAPI locally with refreshed endpoints:
   ```bash
   uv run uvicorn backend.main:app --reload
   ```
4. Run focused tests:
   ```bash
   uv run pytest backend/tests/unit/test_config_api.py
   uv run pytest backend/tests/unit/test_metrics_service.py
   uv run pytest backend/tests/integration/test_config_and_metrics.py
   uv run pytest backend/tests/integration/test_metrics_endpoint.py
   ```

## Frontend

1. Install packages (adds `@fontsource` and `framer-motion`):
   ```bash
   pnpm install
   ```
2. Start Vite dev server:
   ```bash
   pnpm dev
   ```
3. Execute UI-focused tests and lint:
   ```bash
   pnpm test --run --filter ui-theming
   pnpm test --run --filter saas-settings
   pnpm test --run --filter metrics-dashboard
   pnpm lint
   pnpm build
   ```

## Environment Variables

Ensure `.env` (or shell) contains:
- `HAFNIA_API_KEY` (optional override; otherwise configure via settings UI)
- `ENABLE_LIVE_MODE` (default `false`)
- `ENABLE_GRAPH_VIEW` (default `true`)
- `CLIPNOTES_THEME_DEFAULT` (e.g., `dark`)

Update `.env.example` to reflect new variables and rotation notes.

## Manual Verification

1. Load the monitoring view — confirm hero animation, typography, and theme toggle persistence.
2. Use the Settings page to rotate the Hafnia key and adjust FPS/temperature; trigger a new analysis and verify logs reflect new parameters.
3. Visit the Metrics page; confirm stats update within 15 seconds and warnings appear when thresholds exceeded (simulate by raising latency).
4. Confirm GitHub Actions workflow badge is green after pushing branch (lint + pytest + build).
5. Verify CI completes without retries: `uv run pytest`, `pnpm lint`, `pnpm test:ci`, `pnpm build`.

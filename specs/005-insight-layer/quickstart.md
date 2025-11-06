# Quickstart: ClipNotes Insight Layer

## Backend

1. Install/refresh Python dependencies (ensures alembic + HTTPX ready):
   ```bash
   uv sync
   ```
2. Apply schema updates (adds `insight_shares` table):
   ```bash
   uv run alembic upgrade head
   ```
3. Launch FastAPI locally to exercise the new `/api/insights` endpoints:
   ```bash
   uv run uvicorn backend.main:app --reload
   ```
4. Run focused backend tests before broader suites:
   ```bash
   uv run pytest backend/tests/unit/insights
   uv run pytest backend/tests/integration/test_insights_endpoint.py
   uv run pytest backend/tests/integration/test_insights_share.py
   ```

## Frontend

1. Install packages (shares existing Vite/React setup, adds insight components):
   ```bash
   pnpm install
   ```
2. Start the dev server and confirm navigation includes Insights:
   ```bash
   pnpm dev
   ```
3. Execute UI tests and linting focused on insights flow:
   ```bash
   pnpm test --run --filter insights
      pnpm test --run --filter "insights-report"
   pnpm test --run --filter accessibility.insights
   pnpm lint
   pnpm build
   ```

## Environment Variables

Add the following to `.env` / deployment config and mirror updates in `.env.example`:
- `INSIGHTS_CACHE_TTL_SECONDS=60` (optional override; defaults to 60 if unset)
- `INSIGHTS_SHARE_TOKEN_SALT` (random string used to hash share tokens; store in secret manager)
- Existing Hafnia credentials remain (`HAFNIA_API_KEY`, `HAFNIA_API_SECRET`, `HAFNIA_BASE_URL`).

## Manual Verification

1. Seed sample analyses (existing upload + analyze flow) and hit `GET /api/insights?window=24h`; verify payload contains series buckets, severity totals, labels, and summary.
2. Toggle the UI window selector (24h ↔ 7d) and use the "Regenerate" button; ensure backend busts cache (observe logs) and timestamps advance.
3. Simulate Hafnia outage (point reasoning client to fake or raise error) and confirm deterministic fallback summary returns while charts still render.
4. Generate a share link, open it via the public route (`http://localhost:5173/share/<token>`), and confirm the read-only snapshot matches the cached payload while reflecting TTL-based refreshes.
5. Run `pnpm --prefix frontend test -- --runTestsByPath src/pages/Insights.tsx` once to smoke-check the operator flow; rely on manual QA for additional coverage.
6. Open a fresh Insights snapshot and trigger "Download stakeholder report"; confirm the browser launches a new tab with the printable layout, then save as PDF to ensure timeline tables render correctly.
7. Review `docs/performance/insights.md` with latest latency numbers and attach screenshots of chart + summary for demo readiness.

## Demo Checklist

| Item | Expected Outcome |
|------|------------------|
| `/api/clips` | Upload + list works |
| `/api/analysis/{clip_id}` | Returns summary & moments |
| `/api/metrics` | Displays counts |
| `/api/insights` | Shows trend + AI summary |
| Public share | `/share/<token>` renders read-only snapshot |
| UI | Tabs: Upload → Metrics → Insights flow works |
| Live demo | 3–4 seeded clips with varying severities |
| GitHub Actions | Badge green ✅ |
| README | Includes live URL + short usage snippet |

> Bonus: simulate live ingestion by looping public traffic clips every ~20 seconds, show "Last updated X seconds ago," then open Insights so charts and summary visibly refresh during the demo.

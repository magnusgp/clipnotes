# ClipNotes Latency Instrumentation

## Overview

ClipNotes measures Hafnia round-trip timings using the `latency_timer` helper inside
`backend/app/services/hafnia.py`. The `HafniaAnalysisClient` wraps the `POST /chat/completions`
request to Hafnia (referencing the clip UUID as the asset identifier), records elapsed
time locally, and ensures the computed `latency_ms` travels back through the API response
and into the persistent store.

```python
with latency_timer("hafnia.analysis", logger=self._logger) as elapsed:
  response = await client.post("/analysis", json=payload, headers=headers)

latency_ms = int(elapsed())
payload = AnalysisPayload(..., latency_ms=response.json().get("latency_ms", latency_ms))
```

## Local Verification

1. Start the backend with reload enabled:
   ```bash
   uv run uvicorn backend.main:app --reload
   ```
2. Register a clip to obtain an identifier:
  ```bash
  curl -s -X POST http://localhost:8000/api/clips \
    -H "Content-Type: application/json" \
    -d '{"filename": "dock.mp4"}'
  ```
3. Trigger analysis for the returned `clip_id` and inspect the response:
  ```bash
  curl -s -X POST http://localhost:8000/api/analysis/<clip_id> \
    -H "Content-Type: application/json"
  ```
  The JSON payload should surface `latency_ms`, `moments`, and persist those values via
  `save_analysis`. Ensure the `clip_id` you supply corresponds to an uploaded Hafnia
  asset; by default we reuse the clip UUID as the asset reference during demos.
4. Tail the application logs while issuing requests to confirm latency reporting:
  ```bash
  uv run python -m backend.scripts.tail_logs
  ```
  Successful runs log entries similar to:
  ```text
  INFO hafnia.analysis completed clip_id=... latency_ms=3200
  ```

## Collecting Metrics During Demos

- Use the built-in `/api/analyze` endpoint with `curl` or the frontend to gather
  timings for representative clips (15–30 seconds, <100 MB).
- Record the following per run:
  - Submission ID
  - Clip filename and size
  - Observed `latency_ms`
  - Any Hafnia errors surfaced via the status banner
- Store aggregated measurements here, grouped by scenario:

| Scenario | File | Size | Latency (ms) | Notes |
|----------|------|------|--------------|-------|
| Happy path | `crosswalk.mp4` | 28 MB | 4,612 | Baseline sample |
| Hafnia retry | `harbor.mp4` | 31 MB | 7,905 | 2nd attempt succeeded |

## Deployment Readiness & Docker Compose

- The `docker-compose.yml` stack builds two images (`backend`, `frontend`) and marks the backend healthy when `GET /healthz` returns `{ "status": "ok" }` within 200 ms.
- `backend/main.py` already whitelists `http://localhost:5173` and `http://127.0.0.1:5173`; add extra origins via `BACKEND_CORS_ORIGINS` before rebuilding if the dashboard must be shared across LAN.
- Recommended boot sequence:
  1. `docker compose build` (forces fresh node/uv layers).
  2. `docker compose up -d`.
  3. Tail logs with `docker compose logs -f backend frontend` until the backend reports `hafnia.analysis` latency instrumentation.
- Post-boot validation:
  - `curl http://localhost:8000/healthz` → `{"status":"ok"}`.
  - `curl -I http://localhost:5173` shows `access-control-allow-origin` headers.
  - Uploading a sample clip via the UI registers a clip (POST `/api/clips`) and populates session history; deleting the clip should clear the panel and reset the status banner to "Ready to analyze".
- To run against real Hafnia, set `HAFNIA_API_KEY`/`HAFNIA_BASE_URL` in `.env` or Docker secrets; the compose file mounts `.env` by default for local demos.
- To run the stack offline, export `HAFNIA_USE_FAKE=true` (or add it to `.env`); otherwise it targets the live Hafnia API by default.
- For production hardening, pin image tags in compose, enable HTTPS on the nginx ingress, and supply a persistent volume for `clipnotes.db`.

## Verification – US1 Clip Registration

- `uv run pytest backend/tests/unit/test_store_clips.py` → ✅ 2025-10-30
- `uv run pytest backend/tests/integration/test_clips_endpoint.py` → ✅ 2025-10-30
- `npm run test -- --run tests/monitoring.clips.spec.tsx` → ✅ 2025-10-30
- `npm run lint` → ✅ 2025-10-30 (ESLint ignore deprecation warning only)

## Verification – US2 Hafnia Analysis

- `uv run pytest backend/tests/unit/test_hafnia_client.py` → ✅ 2025-10-31
- `uv run pytest backend/tests/integration/test_analysis_endpoint.py` → ✅ 2025-10-31
- `npm run test -- --run tests/monitoring.analysis.spec.tsx` → ✅ 2025-10-31

## Verification – US3 Monitoring UI

- `npm run test -- --run tests/ui-timeline.spec.tsx` → ✅ 2025-10-31
- `npm run test -- --run tests/accessibility.monitoring.spec.tsx` → ✅ 2025-10-31
- `npm run test -- --run tests/history.spec.tsx` → ✅ 2025-10-31
- `npm run test -- --run tests/analyze.spec.tsx` → ✅ 2025-10-31

## Phase N – Validation Sweep

- `uv run ruff check .` → ✅ 2025-10-31
- `uv run pytest` → ✅ 2025-10-31
- `npm run lint` → ✅ 2025-10-31 (ESLint ignore deprecation warning only)
- `npm run test -- --run` → ✅ 2025-10-31

## Follow-up Actions

- If latencies exceed the 10s budget, enable trace logging (`HAFNIA_DEBUG=1`) and
  capture Hafnia response codes for debugging.
- Consider batching demo clips in advance to avoid cold-start penalties.
- Update this document with real measurements before hand-off or release.

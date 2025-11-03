# Quickstart: Reasoning & Comparison Feature

## Backend

1. Ensure dependencies are synced:
   ```bash
   uv sync
   ```
2. Apply database migrations once the `reasoning_history` table is defined:
   ```bash
   uv run alembic upgrade head
   ```
3. Launch the FastAPI server for manual validation:
   ```bash
   uv run uvicorn backend.main:app --reload
   ```
4. Run focused tests:
   ```bash
   uv run pytest backend/tests/unit/reasoning
   uv run pytest backend/tests/integration/test_reasoning_api.py
   ```

## Frontend

1. Install/update packages:
   ```bash
   pnpm install
   ```
2. Start the Vite dev server:
   ```bash
   pnpm dev
   ```
3. Execute feature-focused tests and lint:
   ```bash
   pnpm test --run --testNamePattern reasoning  # Vitest v2 replacement for --filter
   pnpm lint
   ```

## Environment Variables

Ensure the following entries exist in `.env` or your shell before starting services:
- `HAFNIA_API_KEY`
- `HAFNIA_BASE_URL`
- `DATABASE_URL` (defaults to `sqlite:///./clipnotes.db` if omitted)

## Manual Verification Flow

1. In the UI, navigate to the **Compare & Reason** tab.
2. Select two clips with completed analyses and submit a comparative question.
3. Ask a follow-up question in the chat panel and confirm the history persists after refresh.
4. Open the Auto Charts section and validate that bar and pie charts reflect the selected clip metrics.

## Verification Snapshot · 2025-11-02

- `uv run pytest` – 45 tests passed (unit + integration suites)
- `pnpm test --run --testNamePattern reasoning` – pattern run supported but skipped suites; full `pnpm test --run` subsequently executed with 22 reasoning/monitoring tests passing
- `pnpm lint` – ESLint clean (no warnings or errors)

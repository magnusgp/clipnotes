# clipnotes Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-30

## Active Technologies
- Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, HTTPX, Pydantic, SQLAlchemy 2.x (for SQLite store), pytest/pytest-asyncio, React 18, TailwindCSS, shadcn/ui, Vites (002-clip-monitoring)
- Pluggable store interface with SQLite (`DATABASE_URL` default `sqlite:///./clipnotes.db`) and in-memory implementation for tests (002-clip-monitoring)
- Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, SQLAlchemy 2.x, HTTPX, Pydantic, React 18, React Query, TailwindCSS, shadcn/ui (003-reasoning-comparison)
- SQLite via SQLAlchemy (existing `DATABASE_URL`), browser local storage for chat history cache (003-reasoning-comparison)
- Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite/React) + FastAPI, SQLAlchemy, HTTPX, TailwindCSS, shadcn/ui, Framer Motion, React Query (existing), GitHub Actions (004-design-saas-polish)
- SQLite (existing app store) for persisted config, feature flags, metrics aggregation (004-design-saas-polish)

- Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite) + FastAPI, Uvicorn, HTTPX, Pydantic, pytest, Ruff; React 18, React Router, shadcn/ui, TailwindCSS (001-video-summary)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite): Follow standard conventions

## Recent Changes
- 004-design-saas-polish: Added Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite/React) + FastAPI, SQLAlchemy, HTTPX, TailwindCSS, shadcn/ui, Framer Motion, React Query (existing), GitHub Actions
- 003-reasoning-comparison: Added Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, SQLAlchemy 2.x, HTTPX, Pydantic, React 18, React Query, TailwindCSS, shadcn/ui
- 002-clip-monitoring: Added Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, HTTPX, Pydantic, SQLAlchemy 2.x (for SQLite store), pytest/pytest-asyncio, React 18, TailwindCSS, shadcn/ui, Vites


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

# clipnotes Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-30

## Active Technologies
- Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, HTTPX, Pydantic, SQLAlchemy 2.x (for SQLite store), pytest/pytest-asyncio, React 18, TailwindCSS, shadcn/ui, Vites (002-clip-monitoring)
- Pluggable store interface with SQLite (`DATABASE_URL` default `sqlite:///./clipnotes.db`) and in-memory implementation for tests (002-clip-monitoring)

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
- 002-clip-monitoring: Added Python 3.11 (backend), TypeScript ES2020 (frontend) + FastAPI, HTTPX, Pydantic, SQLAlchemy 2.x (for SQLite store), pytest/pytest-asyncio, React 18, TailwindCSS, shadcn/ui, Vites

- 001-video-summary: Added Python 3.11 (backend via FastAPI), TypeScript ES2020 (frontend via Vite) + FastAPI, Uvicorn, HTTPX, Pydantic, pytest, Ruff; React 18, React Router, shadcn/ui, TailwindCSS

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

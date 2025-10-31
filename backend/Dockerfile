# syntax=docker/dockerfile:1.8

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv

RUN pip install --no-cache-dir uv==0.9.7

WORKDIR /app

COPY backend ./backend
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY main.py ./main.py

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

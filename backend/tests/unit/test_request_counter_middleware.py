from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.api.middleware.request_counter import RequestCounterMiddleware
from backend.app.models.config import RequestCountModel


@pytest.mark.asyncio
async def test_request_counter_tracks_api_requests(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'request-count.db'}"

    app = FastAPI()
    app.add_middleware(RequestCounterMiddleware, database_url=database_url)

    @app.get("/api/ping")
    async def ping() -> dict[str, str]:  # pragma: no cover - exercised via client
        return {"status": "ok"}

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:  # pragma: no cover - exercised via client
        return {"status": "ok"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # Non-API path should be ignored.
        response = await client.get("/healthz")
        assert response.status_code == 200

        # OPTIONS preflight is also ignored.
        response = await client.options("/api/ping")
        assert response.status_code == 200

        # Two API hits we expect to be counted.
        response = await client.get("/api/ping")
        assert response.status_code == 200
        response = await client.get("/api/ping")
        assert response.status_code == 200

    engine = create_async_engine(database_url, echo=False, connect_args={
        "ssl": True
    })
    sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(engine, expire_on_commit=False)

    today = datetime.now(timezone.utc).date()

    async with sessions() as session:
        row = await session.get(RequestCountModel, today)
        assert row is not None
        assert row.requests == 2

    await engine.dispose()

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.api import deps
from backend.app.models.config import RequestCountModel
from backend.app.services.metrics_service import MetricsService
from backend.app.store.base import AnalysisPayload, Moment
from backend.app.store.sqlite import AnalysisModel, SqliteStore
from backend.main import app


@pytest.mark.asyncio
async def test_metrics_endpoint_returns_snapshot(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'metrics.db'}"
    store = SqliteStore(database_url)
    metrics_service = MetricsService(database_url, latency_warning_threshold_ms=5000)

    app.dependency_overrides[deps.get_store] = lambda: store
    app.dependency_overrides[deps.get_metrics_service] = lambda: metrics_service

    now = datetime(2025, 11, 3, 15, 0, tzinfo=timezone.utc)

    clip = await store.create_clip(filename="demo.mp4")
    await store.save_analysis(
        clip.id,
        AnalysisPayload(
            summary="ok",
            moments=[Moment(start_s=0.0, end_s=1.0, label="intro", severity="low")],
            raw={},
            latency_ms=6400,
        ),
    )

    engine = create_async_engine(database_url, echo=False, connect_args={
        "ssl": True
    })
    sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as session:
        analysis = (await session.execute(select(AnalysisModel))).scalars().first()
        assert analysis is not None
        analysis.created_at = now
        session.add(RequestCountModel(date=now.date(), requests=5))
        await session.commit()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/api/metrics")
    finally:
        app.dependency_overrides.clear()
        await metrics_service.close()
        await store.close()
        await engine.dispose()

    assert response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
async def test_metrics_endpoint_rejects_invalid_window(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'invalid-window.db'}"
    metrics_service = MetricsService(database_url)

    app.dependency_overrides[deps.get_metrics_service] = lambda: metrics_service

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/api/metrics?window=1h")
    finally:
        app.dependency_overrides.clear()
        await metrics_service.close()

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    payload = response.json()
    assert payload["error"]["code"] == "invalid_window"
    assert "invalid" in payload["error"]["message"].lower()

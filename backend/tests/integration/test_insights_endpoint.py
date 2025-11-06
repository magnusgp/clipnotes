from __future__ import annotations

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from backend.app.api import deps
from backend.app.services.insights import InsightService
from backend.app.store.base import AnalysisPayload, Moment
from backend.app.store.sqlite import SqliteStore
from backend.main import app


@pytest.mark.asyncio
async def test_get_insights_24h_success(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'insights.db'}"
    store = SqliteStore(database_url)
    insight_service = InsightService(database_url=database_url)

    app.dependency_overrides[deps.get_store] = lambda: store
    app.dependency_overrides[deps.get_insight_service] = lambda: insight_service

    clip = await store.create_clip(filename="demo.mp4")
    await store.save_analysis(
        clip.id,
        AnalysisPayload(
            summary="Vehicle entered restricted zone",
            moments=[
                Moment(start_s=0.0, end_s=5.0, label="intrusion", severity="high"),
                Moment(start_s=6.0, end_s=8.0, label="intrusion", severity="medium"),
            ],
            raw={"window": "24h"},
            latency_ms=3200,
        ),
    )

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/api/insights")
    finally:
        app.dependency_overrides.clear()
        await store.close()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["window"] == "24h"
    assert payload["severity_totals"]["high"] >= 1
    assert payload["summary"]
    assert payload["series"], "Expected series buckets in response"


@pytest.mark.asyncio
async def test_regenerate_insights_refreshes_cache(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'insights_regen.db'}"
    store = SqliteStore(database_url)
    insight_service = InsightService(database_url=database_url, cache_ttl_seconds=60)

    app.dependency_overrides[deps.get_store] = lambda: store
    app.dependency_overrides[deps.get_insight_service] = lambda: insight_service

    first_clip = await store.create_clip(filename="first.mp4")
    await store.save_analysis(
        first_clip.id,
        AnalysisPayload(
            summary="Initial event",
            moments=[Moment(start_s=0.0, end_s=4.0, label="intrusion", severity="high")],
            raw={"window": "24h"},
            latency_ms=2100,
        ),
    )

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            initial_response = await client.get("/api/insights")
            initial_payload = initial_response.json()
            initial_high = initial_payload["severity_totals"]["high"]
            assert initial_high >= 1
            assert initial_payload["cache_expires_at"] is not None

            second_clip = await store.create_clip(filename="second.mp4")
            await store.save_analysis(
                second_clip.id,
                AnalysisPayload(
                    summary="Follow-up event",
                    moments=[Moment(start_s=1.0, end_s=3.0, label="intrusion", severity="high")],
                    raw={"window": "24h"},
                    latency_ms=1900,
                ),
            )

            cached_response = await client.get("/api/insights")
            cached_payload = cached_response.json()
            assert cached_payload["severity_totals"]["high"] == initial_high

            regen_response = await client.post("/api/insights/regenerate", json={"window": "24h"})
            assert regen_response.status_code == status.HTTP_200_OK
            assert regen_response.headers.get("Cache-Control") == "public, max-age=60"
            regen_payload = regen_response.json()
            assert regen_payload["severity_totals"]["high"] >= initial_high + 1
            assert regen_payload["cache_expires_at"] is not None
    finally:
        app.dependency_overrides.clear()
        await store.close()

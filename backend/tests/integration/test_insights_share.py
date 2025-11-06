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
async def test_share_token_round_trip(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'insights_share.db'}"
    store = SqliteStore(database_url)
    insight_service = InsightService(
        database_url=database_url,
        cache_ttl_seconds=30,
        share_token_salt="test-share-salt",
        share_base_url="http://localhost:5173",
    )

    app.dependency_overrides[deps.get_store] = lambda: store
    app.dependency_overrides[deps.get_insight_service] = lambda: insight_service

    clip = await store.create_clip(filename="share-demo.mp4")
    await store.save_analysis(
        clip.id,
        AnalysisPayload(
            summary="Operator tagged an intrusion",
            moments=[
                Moment(start_s=0.0, end_s=4.0, label="intrusion", severity="high"),
                Moment(start_s=4.0, end_s=8.0, label="intrusion", severity="medium"),
            ],
            raw={"window": "24h"},
            latency_ms=2800,
        ),
    )

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            create_response = await client.post("/api/insights/share", json={"window": "24h"})
            assert create_response.status_code == status.HTTP_200_OK
            share_result = create_response.json()
            token = share_result["token"]
            assert token
            assert share_result["url"].endswith(token)
            assert share_result["window"] == "24h"

            fetch_response = await client.get(f"/api/insights/share/{token}")
            assert fetch_response.status_code == status.HTTP_200_OK
            snapshot = fetch_response.json()
            assert snapshot["window"] == "24h"
            assert snapshot["summary"], "Expected narrative summary in share payload"
            assert snapshot["series"], "Expected series data returned"
    finally:
        app.dependency_overrides.clear()
        await store.close()


@pytest.mark.asyncio
async def test_share_url_strips_path_component(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'insights_share_path.db'}"
    service = InsightService(
        database_url=database_url,
        cache_ttl_seconds=30,
        share_token_salt="test-share-salt",
        share_base_url="https://clipnotes.example.com/insights",
    )

    url = service._build_share_url("abc123")

    assert url == "https://clipnotes.example.com/share/abc123"

from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("HAFNIA_API_KEY", "test-key")
os.environ.setdefault("HAFNIA_BASE_URL", "https://hafnia.example.com")
os.environ.setdefault("DATABASE_URL", "memory://")

from backend.app.api import deps
from backend.main import app


@pytest.mark.asyncio
async def test_trigger_analysis_persists_result(memory_store):
    from backend.app.services.hafnia import FakeHafniaClient

    clip = await memory_store.create_clip(filename="dock.mp4")
    await memory_store.attach_asset(clip.id, asset_id="asset-dock")
    client = FakeHafniaClient(latency_ms=3200)

    app.dependency_overrides[deps.get_store] = lambda: memory_store
    app.dependency_overrides[deps.get_hafnia_client] = lambda: client

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http_client:
            response = await http_client.post(
                f"/api/analysis/{clip.id}",
                json={"prompt": "Highlight risky moments"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_202_ACCEPTED
    payload = response.json()

    assert payload["clip_id"] == str(clip.id)
    assert payload["summary"].startswith("Analysis for dock.mp4")
    assert payload["latency_ms"] == 3200
    assert payload["prompt"] == "Highlight risky moments"
    assert payload["error_code"] is None

    stored = await memory_store.get_clip(clip.id)
    assert stored is not None
    assert stored.status == "ready"
    assert stored.last_analysis_at is not None
    assert stored.latency_ms == 3200


@pytest.mark.asyncio
async def test_get_analysis_returns_latest_payload(memory_store):
    from backend.app.services.hafnia import FakeHafniaClient

    clip = await memory_store.create_clip(filename="marina.mp4")
    await memory_store.attach_asset(clip.id, asset_id="asset-marina")
    client = FakeHafniaClient(latency_ms=2100)

    app.dependency_overrides[deps.get_store] = lambda: memory_store
    app.dependency_overrides[deps.get_hafnia_client] = lambda: client

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http_client:
            await http_client.post(f"/api/analysis/{clip.id}")
            response = await http_client.get(f"/api/analysis/{clip.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["clip_id"] == str(clip.id)
    assert payload["summary"].startswith("Analysis for marina.mp4")
    assert payload["latency_ms"] == 2100
    assert isinstance(payload["moments"], list)
    assert payload["raw"]["clip_id"] == str(clip.id)


@pytest.mark.asyncio
async def test_trigger_analysis_handles_errors(memory_store):
    from backend.app.services.hafnia import FakeHafniaClient

    clip = await memory_store.create_clip(filename="failed.mp4")
    await memory_store.attach_asset(clip.id, asset_id="asset-failed")
    client = FakeHafniaClient()
    client.set_next_error(code="hafnia_unavailable", message="Service offline")

    app.dependency_overrides[deps.get_store] = lambda: memory_store
    app.dependency_overrides[deps.get_hafnia_client] = lambda: client

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http_client:
            response = await http_client.post(f"/api/analysis/{clip.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    payload = response.json()
    assert payload["error"]["code"] == "hafnia_unavailable"
    assert "Service offline" in payload["error"]["message"]

    stored = await memory_store.get_clip(clip.id)
    assert stored is not None
    assert stored.status == "failed"


@pytest.mark.asyncio
async def test_analysis_endpoints_validate_clip_identifier(memory_store):
    from backend.app.services.hafnia import FakeHafniaClient

    client = FakeHafniaClient()

    app.dependency_overrides[deps.get_store] = lambda: memory_store
    app.dependency_overrides[deps.get_hafnia_client] = lambda: client

    missing_clip_id = uuid4()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http_client:
            response = await http_client.post(f"/api/analysis/{missing_clip_id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_404_NOT_FOUND
    body = response.json()
    assert body["error"]["code"] == "clip_not_found"
    assert str(missing_clip_id) in body["error"]["detail"]

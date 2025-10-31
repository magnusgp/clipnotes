from __future__ import annotations

import os
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("HAFNIA_API_KEY", "test-key")
os.environ.setdefault("HAFNIA_BASE_URL", "https://hafnia.example.com")
os.environ.setdefault("DATABASE_URL", "memory://")

from backend.app.api import deps
from backend.main import app


@pytest.mark.asyncio
async def test_register_clip_returns_pending(memory_store):
    app.dependency_overrides[deps.get_store] = lambda: memory_store

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.post("/api/clips", json={"filename": "  dock.mp4  "})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()

    clip_id = UUID(payload["clip_id"])
    assert payload["filename"] == "dock.mp4"
    assert payload["status"] == "pending"
    assert "created_at" in payload

    stored = await memory_store.get_clip(clip_id)
    assert stored is not None
    assert stored.filename == "dock.mp4"


@pytest.mark.asyncio
async def test_register_clip_validates_filename(memory_store):
    app.dependency_overrides[deps.get_store] = lambda: memory_store

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.post("/api/clips", json={"filename": "   "})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    payload = response.json()
    assert payload["error"]["code"] == "invalid_filename"
    assert "Filename is required" in payload["error"]["message"]


@pytest.mark.asyncio
async def test_list_clips_returns_recent_items(memory_store):
    first = await memory_store.create_clip(filename="harbor.mp4")
    second = await memory_store.create_clip(filename="crosswalk.mp4")

    app.dependency_overrides[deps.get_store] = lambda: memory_store

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/api/clips")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()

    items = payload["items"]
    assert len(items) == 2
    assert [item["clip_id"] for item in items] == [str(second.id), str(first.id)]
    assert all(item.get("last_analysis_at") is None for item in items)
    assert all(item.get("latency_ms") is None for item in items)


@pytest.mark.asyncio
async def test_get_clip_returns_detail(memory_store):
    record = await memory_store.create_clip(filename="bridge.mp4")

    app.dependency_overrides[deps.get_store] = lambda: memory_store

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get(f"/api/clips/{record.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["clip"]["clip_id"] == str(record.id)
    assert payload["clip"]["filename"] == "bridge.mp4"
    assert payload["analysis"] is None

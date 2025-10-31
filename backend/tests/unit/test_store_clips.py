from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import timezone

import pytest
import pytest_asyncio

from backend.app.store import ClipRecord, ClipStore


@pytest_asyncio.fixture(params=["memory", "sqlite"], name="clip_store")
async def fixture_clip_store(
    request: pytest.FixtureRequest,
    memory_store,
    sqlite_store,
) -> AsyncIterator[ClipStore]:
    if request.param == "sqlite":
        yield sqlite_store
    else:
        yield memory_store


@pytest.mark.asyncio
async def test_create_clip_returns_pending_clip(clip_store: ClipStore) -> None:
    record = await clip_store.create_clip(filename="  dockside.mp4  ")

    assert isinstance(record, ClipRecord)
    assert record.filename == "dockside.mp4"
    assert record.status == "pending"
    assert record.id
    assert record.created_at.tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_list_clips_orders_newest_first(clip_store: ClipStore) -> None:
    first = await clip_store.create_clip(filename="harbor.mp4")
    second = await clip_store.create_clip(filename="crosswalk.mp4")

    results = await clip_store.list_clips(limit=10)

    assert [item.id for item in results] == [second.id, first.id]
    assert results[0].created_at >= results[1].created_at


@pytest.mark.asyncio
async def test_list_clips_honors_limit(clip_store: ClipStore) -> None:
    for index in range(4):
        await clip_store.create_clip(filename=f"clip-{index}.mp4")

    results = await clip_store.list_clips(limit=2)

    assert len(results) == 2
    assert len({item.id for item in results}) == 2

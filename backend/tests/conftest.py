from __future__ import annotations

import os
from dataclasses import replace
from collections.abc import AsyncIterator
from typing import Awaitable, Callable
from uuid import uuid4

import pytest
import pytest_asyncio

from backend.app.store import AnalysisPayload, ClipRecord, InMemoryStore, Moment, SqliteStore

os.environ.setdefault("HAFNIA_API_KEY", "test-key")
os.environ.setdefault("HAFNIA_BASE_URL", "https://hafnia.example.com")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")


@pytest_asyncio.fixture
async def memory_store() -> AsyncIterator[InMemoryStore]:
    """Yield a fresh in-memory store for unit tests."""

    store = InMemoryStore()
    yield store


@pytest_asyncio.fixture
async def sqlite_store(tmp_path) -> AsyncIterator[SqliteStore]:
    """Provide a temporary SQLite-backed store for integration-style tests."""

    db_path = tmp_path / "clipnotes.db"
    store = SqliteStore(f"sqlite+aiosqlite:///{db_path}")
    try:
        yield store
    finally:
        await store.close()


@pytest.fixture
def clip_factory(memory_store: InMemoryStore) -> Callable[[str | None], Awaitable[ClipRecord]]:
    async def _create(filename: str | None = None) -> ClipRecord:
        target = filename or f"clip-{uuid4().hex[:8]}.mp4"
        return await memory_store.create_clip(filename=target)

    return _create


@pytest.fixture
def analysis_payload_factory() -> Callable[..., AnalysisPayload]:
    def _factory(**overrides) -> AnalysisPayload:
        payload = AnalysisPayload(
            summary="Clip processed successfully.",
            moments=[
                Moment(start_s=0.0, end_s=5.0, label="opening", severity="low"),
            ],
            raw={"moments": []},
            latency_ms=4200,
            prompt=None,
            error_code=None,
            error_message=None,
        )
        return replace(payload, **overrides)

    return _factory

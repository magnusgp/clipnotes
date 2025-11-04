from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio

from backend.app.db import Base
from backend.app.services.config_store import ConfigStore
from backend.app.services.key_store import KeyStore

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def config_store() -> AsyncIterator[ConfigStore]:
    store = ConfigStore(DATABASE_URL)
    async with store._engine.begin() as connection:  # type: ignore[attr-defined]
        await connection.run_sync(Base.metadata.create_all)
    try:
        yield store
    finally:
        await store.close()


@pytest.mark.asyncio
async def test_store_key_hashes_value(config_store: ConfigStore) -> None:
    key_store = KeyStore(config_store)

    status = await key_store.store_key(key="  demo-secret-key  ")

    assert status.configured is True
    snapshot = await config_store.fetch()
    expected = hashlib.sha256("demo-secret-key".encode("utf-8")).hexdigest()
    assert snapshot.hafnia_key_hash == expected


@pytest.mark.asyncio
async def test_clear_key_unsets_hash(config_store: ConfigStore) -> None:
    key_store = KeyStore(config_store)

    await key_store.store_key(key="config-secret")
    cleared = await key_store.clear_key()

    assert cleared.configured is False
    snapshot = await config_store.fetch()
    assert snapshot.hafnia_key_hash is None
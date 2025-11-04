from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import pytest
import pytest_asyncio

from backend.app.db import Base
from backend.app.services.config_store import ConfigSnapshot, ConfigStore

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


async def _prepare_store() -> ConfigStore:
    store = ConfigStore(DATABASE_URL)
    async with store._engine.begin() as connection:  # type: ignore[attr-defined]
        await connection.run_sync(Base.metadata.create_all)
    return store


@pytest_asyncio.fixture
async def config_store() -> AsyncIterator[ConfigStore]:
    store = await _prepare_store()
    try:
        yield store
    finally:
        await store.close()


@pytest.mark.asyncio
async def test_fetch_sets_defaults_when_empty(config_store: ConfigStore) -> None:
    snapshot = await config_store.fetch()

    assert_snapshot_matches(
        snapshot,
        expected_flags={},
        expected_model_params={},
        expected_theme_overrides=None,
    )


@pytest.mark.asyncio
async def test_env_feature_flags_override_persisted_values(
    config_store: ConfigStore,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await config_store.update(
        model_params={"fps": 24},
        feature_flags={"ENABLE_LIVE_MODE": True, "ENABLE_GRAPH_VIEW": False},
    )

    monkeypatch.setenv("ENABLE_LIVE_MODE", "0")
    monkeypatch.setenv("CLIPNOTES_FEATURE_FLAGS", json.dumps({"ENABLE_GRAPH_VIEW": True, "EXPERIMENTAL_FLAG": True}))

    snapshot = await config_store.fetch()

    assert snapshot.feature_flags["ENABLE_LIVE_MODE"] is False
    assert snapshot.feature_flags["ENABLE_GRAPH_VIEW"] is True
    assert snapshot.feature_flags["EXPERIMENTAL_FLAG"] is True
    assert snapshot.model_params["fps"] == 24


@pytest.mark.asyncio
async def test_theme_default_env_applies_even_without_saved_overrides(
    config_store: ConfigStore,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await config_store.update(theme_overrides=None)

    monkeypatch.setenv("CLIPNOTES_THEME_DEFAULT", "dark")

    snapshot = await config_store.fetch()

    assert snapshot.theme_overrides == {"mode": "dark"}


@pytest.mark.asyncio
async def test_env_overrides_respected_after_store_updates(
    config_store: ConfigStore,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await config_store.update(feature_flags={"ENABLE_LIVE_MODE": False})

    monkeypatch.setenv("ENABLE_LIVE_MODE", "true")

    snapshot_initial = await config_store.fetch()
    assert snapshot_initial.feature_flags["ENABLE_LIVE_MODE"] is True

    await config_store.update(feature_flags={"ENABLE_LIVE_MODE": False})

    snapshot_after_update = await config_store.fetch()
    assert snapshot_after_update.feature_flags["ENABLE_LIVE_MODE"] is True


def assert_snapshot_matches(
    snapshot: ConfigSnapshot,
    *,
    expected_flags: dict[str, Any],
    expected_model_params: dict[str, Any],
    expected_theme_overrides: dict[str, Any] | None,
) -> None:
    assert snapshot.feature_flags == expected_flags
    assert snapshot.model_params == expected_model_params
    assert snapshot.theme_overrides == expected_theme_overrides
    assert snapshot.updated_at is not None


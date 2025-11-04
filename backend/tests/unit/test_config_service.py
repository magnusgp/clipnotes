from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio

from backend.app.db import Base
from backend.app.models.config import ConfigUpdateRequest, ModelParams
from backend.app.services.config_service import ConfigService
from backend.app.services.config_store import ConfigStore

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def config_service() -> AsyncIterator[ConfigService]:
    store = ConfigStore(DATABASE_URL)
    async with store._engine.begin() as connection:  # type: ignore[attr-defined]
        await connection.run_sync(Base.metadata.create_all)
    service = ConfigService(store)
    try:
        yield service
    finally:
        await store.close()


@pytest.mark.asyncio
async def test_get_configuration_returns_defaults(config_service: ConfigService) -> None:
    response = await config_service.get_configuration()

    assert response.model.fps == 24
    assert response.model.temperature == pytest.approx(0.7)
    assert response.flags == {}
    assert response.theme is None


@pytest.mark.asyncio
async def test_update_configuration_persists_model_and_flags(config_service: ConfigService) -> None:
    payload = ConfigUpdateRequest(
        model=ModelParams(fps=30, temperature=0.5, max_tokens=4096, default_prompt="  Summarize " ),
        flags={"ENABLE_LIVE_MODE": True},
        theme={"mode": "dark"},
    )

    response = await config_service.update_configuration(payload)

    assert response.model.fps == 30
    assert response.model.max_tokens == 4096
    assert response.model.default_prompt == "Summarize"
    assert response.flags["ENABLE_LIVE_MODE"] is True
    assert response.theme == {"mode": "dark"}

    subsequent = await config_service.get_configuration()
    assert subsequent.model.fps == 30
    assert subsequent.flags["ENABLE_LIVE_MODE"] is True


@pytest.mark.asyncio
async def test_get_flags_coerces_truthy_strings(config_service: ConfigService) -> None:
    await config_service._store.update(  # type: ignore[attr-defined]
        feature_flags={"ENABLE_GRAPH_VIEW": "true", "EXPERIMENTAL": 0}
    )

    flags_response = await config_service.get_flags()

    assert flags_response.flags == {"ENABLE_GRAPH_VIEW": True, "EXPERIMENTAL": False}

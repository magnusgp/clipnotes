from __future__ import annotations

import json
import os
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Any, Mapping, MutableMapping, cast

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.app.models.config import ConfigModel
from backend.app.db import ensure_database_ready, get_sessionmaker

_GLOBAL_CONFIG_ID = "global"
_UNSET = object()
# Sentinel exported for consumers that need to skip optional updates explicitly.
UNSET = _UNSET


@dataclass(frozen=True, slots=True)
class ConfigSnapshot:
    """In-memory view of the persisted operator configuration."""

    hafnia_key_hash: str | None
    model_params: dict[str, Any]
    feature_flags: dict[str, Any]
    theme_overrides: dict[str, Any] | None
    updated_at: datetime
    updated_by: str | None


@dataclass(frozen=True, slots=True)
class KeyStatus:
    """Lightweight representation of Hafnia API key availability."""

    configured: bool
    last_updated: datetime | None


class ConfigStore:
    """Low-level helper for reading and writing operator configuration in SQLite."""

    def __init__(self, database_url: str, *, env: Mapping[str, str] | None = None) -> None:
        self._database_url = database_url
        self._sessions: async_sessionmaker[AsyncSession] = get_sessionmaker(database_url)
        self._schema_ready = False
        self._env: Mapping[str, str] = env if env is not None else cast(MutableMapping[str, str], os.environ)

    async def fetch(self) -> ConfigSnapshot:
        """Return the current configuration, seeding defaults when empty."""

        await self._ensure_schema()
        async with self._sessions() as session:
            config = await self._get_or_create(session)
            snapshot = self._to_snapshot(config)
            return self._apply_env_overrides(snapshot)

    async def update(
        self,
        *,
        model_params: dict[str, Any] | None = None,
        feature_flags: dict[str, Any] | None = None,
        theme_overrides: Mapping[str, Any] | None | object = _UNSET,
        updated_by: str | None = None,
    ) -> ConfigSnapshot:
        """Persist provided configuration sections and return the refreshed snapshot."""

        await self._ensure_schema()
        async with self._sessions() as session:
            config = await self._get_or_create(session)

            if model_params is not None:
                config.model_params = dict(model_params)
            if feature_flags is not None:
                config.feature_flags = dict(feature_flags)
            if theme_overrides is not _UNSET:
                overrides_payload = cast(Mapping[str, Any] | None, theme_overrides)
                config.theme_overrides = None if overrides_payload is None else dict(overrides_payload)

            config.updated_at = datetime.now(timezone.utc)
            config.updated_by = updated_by

            await session.commit()
            await session.refresh(config)

            snapshot = self._to_snapshot(config)
            return self._apply_env_overrides(snapshot)

    async def store_hafnia_key_hash(self, *, key_hash: str | None, updated_by: str | None = None) -> ConfigSnapshot:
        """Persist the hashed Hafnia API key reference and return the refreshed configuration."""

        await self._ensure_schema()
        async with self._sessions() as session:
            config = await self._get_or_create(session)
            config.hafnia_key_hash = key_hash
            config.updated_at = datetime.now(timezone.utc)
            config.updated_by = updated_by

            await session.commit()
            await session.refresh(config)

            snapshot = self._to_snapshot(config)
            return self._apply_env_overrides(snapshot)

    async def get_key_status(self) -> KeyStatus:
        """Return whether a Hafnia key is configured along with the last update timestamp."""

        await self._ensure_schema()
        async with self._sessions() as session:
            config = await session.get(ConfigModel, _GLOBAL_CONFIG_ID)
            if config is None:
                return KeyStatus(configured=False, last_updated=None)
            return KeyStatus(configured=config.hafnia_key_hash is not None, last_updated=config.updated_at)

    async def close(self) -> None:
        return None

    async def _get_or_create(self, session: AsyncSession) -> ConfigModel:
        config = await session.get(ConfigModel, _GLOBAL_CONFIG_ID)
        if config is not None:
            self._apply_defaults(config)
            return config

        config = ConfigModel(
            id=_GLOBAL_CONFIG_ID,
            model_params={},
            feature_flags={},
            theme_overrides=None,
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        return config

    async def _ensure_schema(self) -> None:
        if self._schema_ready:
            return
        await ensure_database_ready(self._database_url)
        self._schema_ready = True

    @staticmethod
    def _apply_defaults(config: ConfigModel) -> None:
        """Ensure JSON columns never surface as ``None`` to calling code."""

        if config.model_params is None:
            config.model_params = {}
        if config.feature_flags is None:
            config.feature_flags = {}
        if config.theme_overrides is not None and not isinstance(config.theme_overrides, dict):
            config.theme_overrides = dict(config.theme_overrides)

    @staticmethod
    def _to_snapshot(config: ConfigModel) -> ConfigSnapshot:
        ConfigStore._apply_defaults(config)
        return ConfigSnapshot(
            hafnia_key_hash=config.hafnia_key_hash,
            model_params=dict(config.model_params or {}),
            feature_flags=dict(config.feature_flags or {}),
            theme_overrides=dict(config.theme_overrides) if config.theme_overrides is not None else None,
            updated_at=config.updated_at,
            updated_by=config.updated_by,
        )

    def _apply_env_overrides(self, snapshot: ConfigSnapshot) -> ConfigSnapshot:
        overrides = self._collect_feature_flag_overrides()
        updated_snapshot = snapshot

        if overrides:
            merged_flags = dict(snapshot.feature_flags)
            merged_flags.update(overrides)
            updated_snapshot = replace(updated_snapshot, feature_flags=merged_flags)

        theme_override = self._theme_override_from_env()
        if theme_override is not _UNSET:
            updated_snapshot = replace(
                updated_snapshot,
                theme_overrides=cast(dict[str, Any] | None, theme_override),
            )

        return updated_snapshot

    def _collect_feature_flag_overrides(self) -> dict[str, Any]:
        overrides: dict[str, Any] = {}

        for flag_env in ("ENABLE_LIVE_MODE", "ENABLE_GRAPH_VIEW"):
            raw = self._env.get(flag_env)
            if raw is None:
                continue

            parsed = self._parse_bool(raw)
            if parsed is not None:
                overrides[flag_env] = parsed

        raw_feature_flags = self._env.get("CLIPNOTES_FEATURE_FLAGS")
        if raw_feature_flags:
            try:
                payload = json.loads(raw_feature_flags)
            except json.JSONDecodeError:
                payload = None

            if isinstance(payload, Mapping):
                for key, value in payload.items():
                    overrides[str(key)] = value

        return overrides

    def _theme_override_from_env(self) -> dict[str, Any] | None | object:
        raw = self._env.get("CLIPNOTES_THEME_DEFAULT")
        if raw is None:
            return _UNSET

        normalized = raw.strip()
        if not normalized:
            return None

        lowered = normalized.lower()
        if lowered in {"light", "dark"}:
            return {"mode": lowered}

        return {"mode": normalized}

    @staticmethod
    def _parse_bool(value: str) -> bool | None:
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return None

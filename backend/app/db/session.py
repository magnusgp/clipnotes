from __future__ import annotations

import asyncio
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.config import get_settings
from backend.app.db.base import Base

_MODELS_LOADED = False
_MODELS_LOCK = asyncio.Lock()
_SCHEMA_LOCK = asyncio.Lock()
_INITIALIZED_URLS: set[str] = set()


def _load_models() -> None:
    """Ensure SQLAlchemy models are imported before metadata reflection."""

    global _MODELS_LOADED
    if _MODELS_LOADED:
        return

    # Lazy imports avoid circular dependencies during module import.
    from backend.app import models  # noqa: F401
    from backend.app.store import sqlite as _sqlite_models  # noqa: F401

    _MODELS_LOADED = True


@lru_cache(maxsize=4)
def get_engine(database_url: str | None = None) -> AsyncEngine:
    """Return a cached async engine for the provided database URL."""

    if database_url is None:
        database_url = get_settings().database_url

    engine_kwargs: dict[str, object] = {
        "echo": False,
        "pool_pre_ping": True,
        "future": True,
        "ssl": True
    }

    if database_url.startswith("sqlite+"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in database_url:
            engine_kwargs["poolclass"] = StaticPool

    return create_async_engine(database_url, **engine_kwargs)


@lru_cache(maxsize=4)
def get_sessionmaker(database_url: str | None = None) -> async_sessionmaker[AsyncSession]:
    """Return a cached async session factory bound to the shared engine."""

    engine = get_engine(database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


async def ensure_database_ready(database_url: str | None = None) -> None:
    """Create database tables if they are not already present."""

    url = database_url or get_settings().database_url

    async with _MODELS_LOCK:
        _load_models()

    if url in _INITIALIZED_URLS:
        return

    async with _SCHEMA_LOCK:
        if url in _INITIALIZED_URLS:
            return

        engine = get_engine(url)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

        _INITIALIZED_URLS.add(url)


async def dispose_engine(database_url: str | None = None) -> None:
    """Dispose the cached engine for the given database URL if initialised."""

    url = database_url or get_settings().database_url

    engine = get_engine(url)
    await engine.dispose()

    if url in _INITIALIZED_URLS:
        _INITIALIZED_URLS.remove(url)

    # Clear caches so the next startup rebuilds state.
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()

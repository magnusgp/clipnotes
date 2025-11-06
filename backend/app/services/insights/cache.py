from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable


@dataclass(slots=True)
class CacheEntry:
    value: Any
    expires_at: datetime | None

    def is_valid(self, now: datetime) -> bool:
        return self.expires_at is None or self.expires_at > now


class InsightCache:
    """Simple per-window TTL cache guarded by async locks."""

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl_seconds = int(ttl_seconds)
        self._entries: dict[str, CacheEntry] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._locks_guard = asyncio.Lock()

    async def get(self, key: str) -> CacheEntry | None:
        entry = self._entries.get(key)
        if entry is None:
            return None

        now = self._now()
        if entry.is_valid(now):
            return entry

        # Expired entry -> remove and signal miss
        self._entries.pop(key, None)
        return None

    async def set(self, key: str, value: Any, *, expires_at: datetime | None = None) -> CacheEntry:
        now = self._now()
        expiry = expires_at
        if expiry is None:
            expiry = self._expiry(now)

        entry = CacheEntry(value=value, expires_at=expiry)
        self._entries[key] = entry
        return entry

    async def invalidate(self, key: str | None = None) -> None:
        if key is None:
            self._entries.clear()
            return
        self._entries.pop(key, None)

    async def get_or_set(self, key: str, factory: Callable[[], Awaitable[Any]]) -> CacheEntry:
        cached = await self.get(key)
        if cached is not None:
            return cached

        lock = await self._get_lock(key)
        async with lock:
            cached = await self.get(key)
            if cached is not None:
                return cached

            value = await factory()
            return await self.set(key, value)

    async def _get_lock(self, key: str) -> asyncio.Lock:
        async with self._locks_guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    def _expiry(self, now: datetime) -> datetime | None:
        if self._ttl_seconds <= 0:
            return now  # immediate expiry -> treated as miss on next get
        return now + timedelta(seconds=self._ttl_seconds)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
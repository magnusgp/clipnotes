from __future__ import annotations

import asyncio
import hashlib
import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.app.db import ensure_database_ready, get_sessionmaker
from backend.app.models.insights import InsightShareModel, InsightWindow


_DEFAULT_TOKEN_SALT = "clipnotes-share-token"
_logger = logging.getLogger(__name__)


class ShareTokenNotFoundError(Exception):
    """Raised when a share token lookup fails."""


class InsightShareStore:
    """Persist and retrieve insight share tokens and payloads."""

    def __init__(self, database_url: str, token_salt: str | None) -> None:
        if not token_salt:
            _logger.warning(
                "INSIGHTS_SHARE_TOKEN_SALT is not configured; falling back to a default development salt."
            )
        resolved_salt = token_salt or _DEFAULT_TOKEN_SALT
        self._database_url = database_url
        self._token_salt = resolved_salt
        self._sessions: async_sessionmaker[AsyncSession] = get_sessionmaker(database_url)
        self._initialized = False
        self._lock = asyncio.Lock()

    async def create_share(
        self,
        *,
        window: InsightWindow,
        payload: dict[str, Any],
        cache_expires_at: datetime | None,
    ) -> tuple[str, InsightShareModel]:
        await self._ensure_schema()

        attempt = 0
        while True:
            token = secrets.token_urlsafe(16)
            token_hash = self._hash_token(token)
            record = InsightShareModel(
                token_hash=token_hash,
                window=window,
                payload=payload,
                expires_at=cache_expires_at,
            )

            async with self._sessions() as session:
                session.add(record)
                try:
                    await session.commit()
                    await session.refresh(record)
                    return token, record
                except IntegrityError:
                    await session.rollback()
                    attempt += 1
                    if attempt >= 5:
                        raise RuntimeError("Unable to generate unique share token")

    async def get_share(self, token: str) -> InsightShareModel:
        await self._ensure_schema()
        token_hash = self._hash_token(token)

        async with self._sessions() as session:
            record = await session.get(InsightShareModel, token_hash)
            if record is None:
                raise ShareTokenNotFoundError(token)

            record.last_accessed_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(record)
            return record

    async def update_payload(
        self,
        token: str,
        *,
        payload: dict[str, Any],
        cache_expires_at: datetime | None,
    ) -> None:
        await self._ensure_schema()
        token_hash = self._hash_token(token)

        async with self._sessions() as session:
            record = await session.get(InsightShareModel, token_hash)
            if record is None:
                raise ShareTokenNotFoundError(token)

            record.payload = payload
            record.expires_at = cache_expires_at
            record.last_accessed_at = datetime.now(timezone.utc)
            await session.commit()

    async def _ensure_schema(self) -> None:
        if self._initialized:
            return
        async with self._lock:
            if self._initialized:
                return
            await ensure_database_ready(self._database_url)
            self._initialized = True

    def _hash_token(self, token: str) -> str:
        digest = hashlib.sha256()
        digest.update(self._token_salt.encode("utf-8"))
        digest.update(b":")
        digest.update(token.encode("utf-8"))
        return digest.hexdigest()

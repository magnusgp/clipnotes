from __future__ import annotations

import logging
import asyncio
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.db import Base
from backend.app.models.config import RequestCountModel

logger = logging.getLogger(__name__)


class RequestCounterMiddleware(BaseHTTPMiddleware):
    """Record daily API request totals for usage metrics."""

    def __init__(self, app, *, database_url: str) -> None:  # type: ignore[override]
        super().__init__(app)
        self._engine = create_async_engine(database_url, echo=False, future=True)
        self._sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(self._engine, expire_on_commit=False)
        self._initialised = False
        self._schema_lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:  # type: ignore[override]
        if request.method == "OPTIONS":
            # Allow CORS preflight checks to succeed even when no handler is defined.
            return Response(status_code=200)

        response = await call_next(request)

        if not self._should_track(request):
            return response

        try:
            await self._increment_counter()
        except Exception:  # pragma: no cover - defensive logging
            logger.exception("Failed to record request count")

        return response

    def _should_track(self, request: Request) -> bool:
        # Skip CORS preflight and non-API paths to keep counts focused on operator traffic.
        if request.method == "OPTIONS":
            return False
        path = request.url.path
        return path.startswith("/api")

    async def _increment_counter(self) -> None:
        today = datetime.now(timezone.utc).date()

        now = datetime.now(timezone.utc)

        await self._ensure_schema()

        async with self._sessions() as session:

            stmt = select(RequestCountModel).where(RequestCountModel.date == today)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()

            if row is None:
                row = RequestCountModel(date=today, requests=1, updated_at=now)
                session.add(row)
            else:
                row.requests += 1
                row.updated_at = now

            await session.commit()

    async def _ensure_schema(self) -> None:
        if self._initialised:
            return

        async with self._schema_lock:
            if self._initialised:
                return
            async with self._engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            self._initialised = True

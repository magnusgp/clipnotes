"""Persistence interfaces for reasoning history."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol, Sequence
from uuid import UUID, uuid4

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from backend.app.db import Base
from backend.app.models.reasoning import ReasoningChatResponse
from backend.app.models.reasoning_history import ReasoningHistoryModel


@dataclass(slots=True)
class ReasoningHistoryRecord:
    """Representation of a persisted reasoning history entry."""

    id: UUID
    clip_selection_hash: str
    clip_ids: list[UUID]
    question: str
    answer: ReasoningChatResponse
    answer_type: str
    created_at: datetime


class ReasoningHistoryStore(Protocol):
    """Persistence contract for saving and retrieving reasoning history."""

    async def list_recent(
        self,
        *,
        clip_selection_hash: str | None,
        clip_id: UUID | None,
        limit: int,
    ) -> Sequence[ReasoningHistoryRecord]:
        ...

    async def persist_entry(
        self,
        *,
        clip_selection_hash: str,
        clip_ids: Sequence[UUID],
        question: str,
        answer: ReasoningChatResponse,
        answer_type: str,
    ) -> ReasoningHistoryRecord:
        ...


class SqlAlchemyReasoningHistoryStore(ReasoningHistoryStore):
    """SQLAlchemy-backed history store for persisted reasoning entries."""

    def __init__(self, database_url: str) -> None:
        self._engine: AsyncEngine = create_async_engine(database_url, echo=False)
        self._sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(
            self._engine, expire_on_commit=False
        )
        self._init_lock = asyncio.Lock()
        self._initialized = False

    async def list_recent(
        self,
        *,
        clip_selection_hash: str | None,
        clip_id: UUID | None,
        limit: int,
    ) -> Sequence[ReasoningHistoryRecord]:
        await self._ensure_schema()

        async with self._sessions() as session:
            stmt = self._build_select_statement(
                clip_selection_hash=clip_selection_hash,
                clip_id=clip_id,
                limit=limit,
            )
            result = await session.execute(stmt)
            rows = result.scalars().all()

        if clip_selection_hash or clip_id is None:
            limited = rows[:limit]
        else:
            limited = [
                row
                for row in rows
                if clip_id is not None and str(clip_id) in (row.clip_ids or [])
            ][:limit]

        return [self._to_record(row) for row in limited]

    async def persist_entry(
        self,
        *,
        clip_selection_hash: str,
        clip_ids: Sequence[UUID],
        question: str,
        answer: ReasoningChatResponse,
        answer_type: str,
    ) -> ReasoningHistoryRecord:
        await self._ensure_schema()

        stored_at = datetime.now(timezone.utc)
        model = ReasoningHistoryModel(
            id=str(uuid4()),
            clip_selection_hash=clip_selection_hash,
            clip_ids=[str(identifier) for identifier in clip_ids],
            question=question,
            answer=answer.model_dump(mode="json"),
            answer_type=answer_type,
            created_at=stored_at,
        )

        async with self._sessions() as session:
            session.add(model)
            await session.commit()
            await session.refresh(model)

        return self._to_record(model)

    async def close(self) -> None:
        await self._engine.dispose()

    async def _ensure_schema(self) -> None:
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            async with self._engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            self._initialized = True

    def _build_select_statement(
        self,
        *,
        clip_selection_hash: str | None,
        clip_id: UUID | None,
        limit: int,
    ) -> Select[tuple[ReasoningHistoryModel]]:
        stmt = select(ReasoningHistoryModel).order_by(ReasoningHistoryModel.created_at.desc())
        if clip_selection_hash:
            stmt = stmt.where(ReasoningHistoryModel.clip_selection_hash == clip_selection_hash)
            stmt = stmt.limit(limit)
        elif clip_id is None:
            stmt = stmt.limit(limit)
        return stmt

    @staticmethod
    def _to_record(model: ReasoningHistoryModel) -> ReasoningHistoryRecord:
        clip_ids = [UUID(value) for value in model.clip_ids or []]
        answer = ReasoningChatResponse.model_validate(model.answer)
        return ReasoningHistoryRecord(
            id=UUID(model.id),
            clip_selection_hash=model.clip_selection_hash,
            clip_ids=clip_ids,
            question=model.question,
            answer=answer,
            answer_type=model.answer_type,
            created_at=model.created_at,
        )


__all__ = [
    "ReasoningHistoryRecord",
    "ReasoningHistoryStore",
    "SqlAlchemyReasoningHistoryStore",
]

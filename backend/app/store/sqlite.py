from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.store.base import (
    AnalysisPayload,
    AnalysisRecord,
    ClipNotFoundError,
    ClipRecord,
    ClipStatus,
    ClipStore,
    Moment,
    build_clip_record,
)

from backend.app.db import Base, ensure_database_ready, get_sessionmaker
from backend.app.models import reasoning_history as reasoning_history_models  # noqa: F401

class ClipModel(Base):
    __tablename__ = "clips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_analysis_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asset_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)


class AnalysisModel(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clip_id: Mapped[str] = mapped_column(String(36), ForeignKey("clips.id", ondelete="CASCADE"), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    moments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class SqliteStore(ClipStore):
    """SQLAlchemy-powered store implementation backed by an async database engine."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._sessions: async_sessionmaker[AsyncSession] = get_sessionmaker(database_url)
        self._initialized = False

    async def create_clip(self, *, filename: str) -> ClipRecord:
        await self._ensure_schema()

        record = build_clip_record(filename=filename)
        model = ClipModel(
            id=str(record.id),
            filename=record.filename,
            status=record.status,
            created_at=record.created_at,
            asset_id=record.asset_id,
        )

        async with self._sessions() as session:
            session.add(model)
            await session.commit()

        return record

    async def list_clips(self, *, limit: int = 25) -> list[ClipRecord]:
        await self._ensure_schema()

        async with self._sessions() as session:
            stmt = select(ClipModel).order_by(ClipModel.created_at.desc()).limit(limit)
            result = await session.execute(stmt)
            rows = result.scalars().all()

        return [self._to_clip(row) for row in rows]

    async def get_clip(self, clip_id: UUID) -> ClipRecord | None:
        await self._ensure_schema()

        async with self._sessions() as session:
            row = await session.get(ClipModel, str(clip_id))
            return self._to_clip(row) if row is not None else None

    async def update_clip_status(
        self,
        clip_id: UUID,
        *,
        status: ClipStatus,
        last_analysis_at: datetime | None = None,
        latency_ms: int | None = None,
    ) -> ClipRecord:
        await self._ensure_schema()

        async with self._sessions() as session:
            row = await session.get(ClipModel, str(clip_id))
            if row is None:
                raise ClipNotFoundError(clip_id)

            row.status = status
            row.last_analysis_at = last_analysis_at
            row.latency_ms = latency_ms

            await session.commit()
            await session.refresh(row)

        return self._to_clip(row)

    async def attach_asset(
        self,
        clip_id: UUID,
        *,
        asset_id: str,
    ) -> ClipRecord:
        await self._ensure_schema()

        async with self._sessions() as session:
            row = await session.get(ClipModel, str(clip_id))
            if row is None:
                raise ClipNotFoundError(clip_id)

            row.asset_id = asset_id

            await session.commit()
            await session.refresh(row)

        return self._to_clip(row)

    async def save_analysis(
        self,
        clip_id: UUID,
        payload: AnalysisPayload,
    ) -> AnalysisRecord:
        await self._ensure_schema()

        async with self._sessions() as session:
            clip = await session.get(ClipModel, str(clip_id))
            if clip is None:
                raise ClipNotFoundError(clip_id)

            created_at = datetime.now(timezone.utc)
            analysis = AnalysisModel(
                clip_id=str(clip_id),
                summary=payload.summary,
                moments=[asdict(moment) for moment in payload.moments],
                raw=dict(payload.raw),
                created_at=created_at,
                latency_ms=payload.latency_ms,
                prompt=payload.prompt,
                error_code=payload.error_code,
                error_message=payload.error_message,
            )
            session.add(analysis)

            clip.last_analysis_at = created_at
            clip.latency_ms = payload.latency_ms
            clip.status = "failed" if payload.error_code or payload.error_message else "ready"

            await session.commit()
            await session.refresh(clip)
            await session.refresh(analysis)

        return self._to_analysis(analysis)

    async def get_latest_analysis(self, clip_id: UUID) -> AnalysisRecord | None:
        await self._ensure_schema()

        async with self._sessions() as session:
            stmt = (
                select(AnalysisModel)
                .where(AnalysisModel.clip_id == str(clip_id))
                .order_by(AnalysisModel.created_at.desc())
                .limit(1)
            )
            result = await session.execute(stmt)
            row = result.scalars().first()

        return self._to_analysis(row) if row is not None else None

    async def delete_clip(self, clip_id: UUID) -> None:
        await self._ensure_schema()

        async with self._sessions() as session:
            row = await session.get(ClipModel, str(clip_id))
            if row is None:
                raise ClipNotFoundError(clip_id)

            await session.delete(row)
            await session.commit()

    async def close(self) -> None:
        return None

    async def _ensure_schema(self) -> None:
        if self._initialized:
            return
        await ensure_database_ready(self._database_url)
        self._initialized = True

    @staticmethod
    def _to_clip(row: ClipModel) -> ClipRecord:
        return ClipRecord(
            id=UUID(row.id),
            filename=row.filename,
            asset_id=row.asset_id,
            status=row.status,  # type: ignore[arg-type]
            created_at=row.created_at,
            last_analysis_at=row.last_analysis_at,
            latency_ms=row.latency_ms,
        )

    @staticmethod
    def _to_analysis(row: AnalysisModel) -> AnalysisRecord:
        moments = [Moment(**moment) for moment in row.moments]
        return AnalysisRecord(
            clip_id=UUID(row.clip_id),
            summary=row.summary,
            moments=moments,
            raw=row.raw,
            created_at=row.created_at,
            latency_ms=row.latency_ms,
            prompt=row.prompt,
            error_code=row.error_code,
            error_message=row.error_message,
        )

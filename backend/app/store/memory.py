from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import datetime, timezone
from uuid import UUID

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


class InMemoryStore(ClipStore):
    """Simple in-memory store implementation for tests and local development."""

    def __init__(self) -> None:
        self._clips: dict[UUID, ClipRecord] = {}
        self._analyses: dict[UUID, list[AnalysisRecord]] = {}
        self._lock = asyncio.Lock()

    async def create_clip(self, *, filename: str) -> ClipRecord:
        async with self._lock:
            record = build_clip_record(filename=filename)
            self._clips[record.id] = record
            return replace(record)

    async def list_clips(self, *, limit: int = 25) -> list[ClipRecord]:
        async with self._lock:
            items = sorted(
                (replace(record) for record in self._clips.values()),
                key=lambda record: record.created_at,
                reverse=True,
            )
            return list(items)[:limit]

    async def get_clip(self, clip_id: UUID) -> ClipRecord | None:
        async with self._lock:
            record = self._clips.get(clip_id)
            return replace(record) if record is not None else None

    async def update_clip_status(
        self,
        clip_id: UUID,
        *,
    status: ClipStatus,
        last_analysis_at: datetime | None = None,
        latency_ms: int | None = None,
    ) -> ClipRecord:
        async with self._lock:
            record = self._clips.get(clip_id)
            if record is None:
                raise ClipNotFoundError(clip_id)
            record.status = status  # type: ignore[assignment]
            record.last_analysis_at = last_analysis_at
            record.latency_ms = latency_ms
            self._clips[clip_id] = record
            return replace(record)

    async def attach_asset(
        self,
        clip_id: UUID,
        *,
        asset_id: str,
    ) -> ClipRecord:
        async with self._lock:
            record = self._clips.get(clip_id)
            if record is None:
                raise ClipNotFoundError(clip_id)
            record.asset_id = asset_id
            self._clips[clip_id] = record
            return replace(record)

    async def save_analysis(
        self,
        clip_id: UUID,
        payload: AnalysisPayload,
    ) -> AnalysisRecord:
        async with self._lock:
            clip = self._clips.get(clip_id)
            if clip is None:
                raise ClipNotFoundError(clip_id)

            created_at = datetime.now(timezone.utc)
            analysis = AnalysisRecord(
                clip_id=clip_id,
                summary=payload.summary,
                moments=[replace(moment) for moment in payload.moments],
                raw=dict(payload.raw),
                created_at=created_at,
                latency_ms=payload.latency_ms,
                prompt=payload.prompt,
                error_code=payload.error_code,
                error_message=payload.error_message,
            )

            analyses = self._analyses.setdefault(clip_id, [])
            analyses.append(analysis)

            clip.last_analysis_at = created_at
            clip.latency_ms = payload.latency_ms
            clip.status = "failed" if payload.error_code or payload.error_message else "ready"
            self._clips[clip_id] = clip

            return replace(analysis)

    async def get_latest_analysis(self, clip_id: UUID) -> AnalysisRecord | None:
        async with self._lock:
            analyses = self._analyses.get(clip_id)
            if not analyses:
                return None
            return replace(analyses[-1])

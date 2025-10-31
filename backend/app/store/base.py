from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal, Protocol, Sequence
from uuid import UUID, uuid4

ClipStatus = Literal["pending", "processing", "ready", "failed"]


@dataclass(slots=True)
class Moment:
    """Normalized slice of a clip returned by Hafnia analysis."""

    start_s: float
    end_s: float
    label: str
    severity: Literal["low", "medium", "high"]


@dataclass(slots=True)
class ClipRecord:
    """Represents persisted metadata for a registered clip."""

    id: UUID
    filename: str
    asset_id: str | None = None
    status: ClipStatus = "pending"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_analysis_at: datetime | None = None
    latency_ms: int | None = None


@dataclass(slots=True)
class AnalysisPayload:
    """Input payload describing the outcome of an analysis run."""

    summary: str | None
    moments: Sequence[Moment]
    raw: dict[str, object]
    latency_ms: int | None = None
    prompt: str | None = None
    error_code: str | None = None
    error_message: str | None = None


@dataclass(slots=True)
class AnalysisRecord:
    """Persisted analysis entry stored for a clip."""

    clip_id: UUID
    summary: str | None
    moments: list[Moment]
    raw: dict[str, object]
    created_at: datetime
    latency_ms: int | None = None
    prompt: str | None = None
    error_code: str | None = None
    error_message: str | None = None


class StoreError(RuntimeError):
    """Base exception raised for store operations."""


class ClipNotFoundError(StoreError):
    """Raised when a clip lookup fails."""

    def __init__(self, clip_id: UUID) -> None:
        super().__init__(f"Clip {clip_id} not found")
        self.clip_id = clip_id


class ClipStore(Protocol):
    """Abstract persistence contract for clip metadata and analyses."""

    async def create_clip(self, *, filename: str) -> ClipRecord:
        ...

    async def list_clips(self, *, limit: int = 25) -> Sequence[ClipRecord]:
        ...

    async def get_clip(self, clip_id: UUID) -> ClipRecord | None:
        ...

    async def update_clip_status(
        self,
        clip_id: UUID,
        *,
        status: ClipStatus,
        last_analysis_at: datetime | None = None,
        latency_ms: int | None = None,
    ) -> ClipRecord:
        ...

    async def save_analysis(
        self,
        clip_id: UUID,
        payload: AnalysisPayload,
    ) -> AnalysisRecord:
        ...

    async def get_latest_analysis(self, clip_id: UUID) -> AnalysisRecord | None:
        ...

    async def attach_asset(
        self,
        clip_id: UUID,
        *,
        asset_id: str,
    ) -> ClipRecord:
        ...


def build_clip_record(*, filename: str) -> ClipRecord:
    """Helper used by stores to create freshly registered clip records."""

    return ClipRecord(
        id=uuid4(),
        filename=filename.strip(),
        asset_id=None,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )

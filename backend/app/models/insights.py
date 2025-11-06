from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base

InsightWindow = Literal["24h", "7d"]


class InsightSeverityTotals(BaseModel):
    """Aggregate severity counts for an insight window."""

    low: int = Field(ge=0)
    medium: int = Field(ge=0)
    high: int = Field(ge=0)

    model_config = ConfigDict(extra="forbid")


class InsightSeriesBucket(BaseModel):
    """Time bucket for charting insight data."""

    bucket_start: datetime
    total: int = Field(ge=0)
    severity: InsightSeverityTotals

    model_config = ConfigDict(extra="forbid")


class InsightTopLabel(BaseModel):
    """Frequently occurring label with optional severity heuristic."""

    label: str = Field(max_length=80)
    count: int = Field(ge=0)
    avg_severity: float | None = Field(default=None, ge=0, le=2)

    model_config = ConfigDict(extra="forbid")

    @field_validator("label")
    @classmethod
    def _normalize_label(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Label cannot be blank")
        return cleaned


class InsightSnapshot(BaseModel):
    """Cached snapshot payload returned by insight endpoints."""

    window: InsightWindow
    generated_at: datetime
    summary: str
    summary_source: Literal["hafnia", "fallback"]
    severity_totals: InsightSeverityTotals
    series: list[InsightSeriesBucket]
    top_labels: list[InsightTopLabel] = Field(default_factory=list)
    delta: dict[str, int] | None = None
    cache_expires_at: datetime | None = None

    model_config = ConfigDict(extra="forbid")


class InsightResponse(InsightSnapshot):
    """Response schema for `/api/insights` and share endpoints."""

    model_config = ConfigDict(extra="forbid")


class InsightRegenerateRequest(BaseModel):
    """Request payload to bust cache and regenerate an insight snapshot."""

    window: InsightWindow = "24h"

    model_config = ConfigDict(extra="forbid")


class InsightShareRequest(BaseModel):
    """Request payload to create a share token for an insight window."""

    window: InsightWindow = "24h"

    model_config = ConfigDict(extra="forbid")


class InsightShareResponse(BaseModel):
    """Response payload for a created share link."""

    token: str
    url: str
    window: InsightWindow
    generated_at: datetime
    cache_expires_at: datetime | None = None

    model_config = ConfigDict(extra="forbid")


class InsightShareModel(Base):
    """Persisted share token and payload for read-only access."""

    __tablename__ = "insight_shares"

    token_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    window: Mapped[str] = mapped_column(String(8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
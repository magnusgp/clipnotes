"""SQLAlchemy model definitions for reasoning history persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base


class ReasoningHistoryModel(Base):
    """ORM model storing persisted reasoning exchanges."""

    __tablename__ = "reasoning_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    clip_selection_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    clip_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    answer_type: Mapped[str] = mapped_column(String(32), nullable=False, default="chat")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("ix_reasoning_history_selection", "clip_selection_hash", "created_at"),
    )

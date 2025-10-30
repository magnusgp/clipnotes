from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class SummaryJson(BaseModel):
    """Structured summary payload when Hafnia returns JSON."""

    data: dict[str, Any]


class SummaryResponse(BaseModel):
    submission_id: str = Field(..., description="UUID tracking the upload session")
    summary: List[str] = Field(default_factory=list)
    structured_summary: Optional[SummaryJson] = None
    latency_ms: int
    completed_at: datetime


class ErrorResponse(BaseModel):
    submission_id: str | None = None
    error: str
    detail: Optional[str] = None
    remediation: Optional[str] = None

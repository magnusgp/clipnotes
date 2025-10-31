from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ClipStatusLiteral = Literal["pending", "processing", "ready", "failed"]


class SummaryJson(BaseModel):
    """Structured summary payload when Hafnia returns JSON."""

    data: dict[str, Any]


class SummaryResponse(BaseModel):
    submission_id: str = Field(..., description="UUID tracking the upload session")
    asset_id: str = Field(..., description="Identifier returned by Hafnia for the uploaded asset")
    summary: List[str] = Field(default_factory=list)
    structured_summary: Optional[SummaryJson] = None
    latency_ms: int
    completed_at: datetime
    completion_id: Optional[str] = Field(
        default=None,
        description="Identifier for the Hafnia completion associated with the summary, when available",
    )


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable summary for operators")
    detail: Optional[str] = Field(default=None, description="Optional technical detail for debugging")
    remediation: Optional[str] = Field(default=None, description="Remediation guidance for the user")
    submission_id: Optional[str] = Field(default=None, description="Submission ID associated with the error, when available")


class ErrorResponse(BaseModel):
    error: ErrorDetail


class ChatRequest(BaseModel):
    submission_id: str
    prompt: str


class ChatResponse(BaseModel):
    submission_id: str
    asset_id: str
    message: str
    completion_id: Optional[str] = None


class ClipCreateRequest(BaseModel):
    filename: str = Field(..., description="Original clip filename supplied by the operator")


class ClipSummary(BaseModel):
    clip_id: UUID
    filename: str
    asset_id: Optional[str] = None
    status: ClipStatusLiteral
    created_at: datetime
    last_analysis_at: Optional[datetime] = None
    latency_ms: Optional[int] = None


class ClipResponse(ClipSummary):
    """Response returned after registering a clip."""


class ClipListResponse(BaseModel):
    items: List[ClipSummary] = Field(default_factory=list)


class ClipDetailResponse(BaseModel):
    clip: ClipSummary
    analysis: Optional["AnalysisResponse"] = None


class AnalysisRequest(BaseModel):
    prompt: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("prompt")
    @classmethod
    def _normalize_prompt(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class Moment(BaseModel):
    start_s: float
    end_s: float
    label: str
    severity: Literal["low", "medium", "high"]


class AnalysisResponse(BaseModel):
    clip_id: UUID
    summary: Optional[str] = None
    moments: List[Moment] = Field(default_factory=list)
    raw: dict[str, Any]
    created_at: datetime
    latency_ms: Optional[int] = None
    prompt: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

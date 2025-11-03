"""Pydantic schemas for reasoning endpoints."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ComparisonAnswer(str, Enum):
    """Enumeration of possible comparison outcomes."""

    CLIP_A = "clip_a"
    CLIP_B = "clip_b"
    EQUAL = "equal"
    UNCERTAIN = "uncertain"


class ReasoningCompareRequest(BaseModel):
    """Incoming payload for comparative reasoning requests."""

    clip_a: UUID
    clip_b: UUID
    question: str = Field(min_length=1)

    @model_validator(mode="after")
    def clips_must_differ(self) -> "ReasoningCompareRequest":
        if self.clip_a == self.clip_b:
            msg = "clip_a and clip_b must refer to different clips"
            raise ValueError(msg)
        return self


class ReasoningEvidence(BaseModel):
    """Evidence snippet returned by reasoning endpoints."""

    clip_id: UUID
    label: str
    timestamp_range: tuple[float, float] | None = None
    description: str | None = None


class ReasoningMetrics(BaseModel):
    """Lightweight metrics bundle returned with reasoning answers."""

    counts_by_label: dict[str, int] = Field(default_factory=dict)
    severity_distribution: dict[str, float] = Field(default_factory=dict)


class ReasoningComparisonResponse(BaseModel):
    """Normalized comparative reasoning response."""

    answer: ComparisonAnswer
    explanation: str
    evidence: list[ReasoningEvidence] = Field(default_factory=list)
    metrics: ReasoningMetrics | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class ReasoningChatRequest(BaseModel):
    """Follow-up reasoning request."""

    clips: list[UUID] = Field(min_length=1)
    message: str = Field(min_length=1)


class ReasoningChatResponse(BaseModel):
    """Chat response structure."""

    answer: str
    created_at: datetime
    evidence: list[ReasoningEvidence] | None = None
    clips: list[UUID] | None = None


class ReasoningHistoryEntry(BaseModel):
    """Persisted reasoning exchange entry."""

    id: UUID
    clip_ids: list[UUID]
    question: str
    answer: ReasoningChatResponse
    answer_type: str
    created_at: datetime


class ReasoningHistoryResponse(BaseModel):
    """History payload for the reasoning session."""

    items: list[ReasoningHistoryEntry]


class GraphNode(BaseModel):
    """Node in the object interaction graph."""

    id: str
    label: str
    metadata: dict[str, Any] | None = None


class GraphEdge(BaseModel):
    """Edge in the object interaction graph."""

    source: str
    target: str
    relation: str | None = None
    metadata: dict[str, Any] | None = None


class GraphPayload(BaseModel):
    """Graph report representing object interactions."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ReasoningMetricsResponse(BaseModel):
    """Metrics endpoint response."""

    clip_id: UUID
    counts_by_label: dict[str, int]
    durations_by_label: dict[str, float]
    severity_distribution: dict[str, float]
    object_graph: GraphPayload | None = None
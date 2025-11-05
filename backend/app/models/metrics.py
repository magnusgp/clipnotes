from __future__ import annotations

from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict, Field


class HourlyMetricsBucket(BaseModel):
    hour: datetime = Field(..., description="Start of the hour bucket in UTC")
    requests: int = Field(..., ge=0, description="Number of requests observed in this hour")

    model_config = ConfigDict(extra="forbid")

class DailyMetricsBucket(BaseModel):
    date: date_type = Field(..., description="UTC calendar date for aggregated stats")
    requests: int = Field(..., ge=0, description="Total requests recorded for the day")
    analyses: int = Field(..., ge=0, description="Analyses completed on the day")

    model_config = ConfigDict(extra="forbid")


class MetricsResponse(BaseModel):
    generated_at: datetime = Field(..., description="Timestamp when the snapshot was generated")
    total_clips: int = Field(..., ge=0)
    total_analyses: int = Field(..., ge=0)
    avg_latency_ms: float = Field(..., ge=0.0)
    requests_today: int = Field(..., ge=0)
    clips_today: int = Field(..., ge=0)
    per_hour: list[HourlyMetricsBucket] = Field(default_factory=list)
    per_day: list[DailyMetricsBucket] = Field(default_factory=list)
    latency_flag: bool
    error_rate: float | None = Field(default=None, ge=0.0)

    model_config = ConfigDict(extra="forbid")

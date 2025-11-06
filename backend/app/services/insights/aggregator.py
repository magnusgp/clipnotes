from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.app.db import ensure_database_ready, get_sessionmaker
from backend.app.models.insights import (
    InsightSeriesBucket,
    InsightSeverityTotals,
    InsightTopLabel,
    InsightWindow,
)
from backend.app.store.sqlite import AnalysisModel

_SEVERITY_ORDER: dict[str, Literal["low", "medium", "high"]] = {
    "low": "low",
    "medium": "medium",
    "mid": "medium",
    "med": "medium",
    "high": "high",
    "severe": "high",
}

_SEVERITY_WEIGHT: dict[str, int] = {
    "low": 0,
    "medium": 1,
    "high": 2,
}

_MAX_LABEL_LENGTH = 80


@dataclass(slots=True)
class AggregatedInsights:
    window: InsightWindow
    generated_at: datetime
    severity_totals: InsightSeverityTotals
    series: list[InsightSeriesBucket]
    top_labels: list[InsightTopLabel]
    analyses: int
    high_severity_analyses: int
    delta: dict[str, int] | None


class InsightAggregator:
    """Aggregate analysis results into Insight Layer payloads."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._sessions: async_sessionmaker[AsyncSession] = get_sessionmaker(database_url)
        self._initialized = False

    async def aggregate(self, window: InsightWindow, *, now: datetime | None = None) -> AggregatedInsights:
        current = _as_utc(now or datetime.now(timezone.utc))
        duration = _window_duration(window)
        bucket_count = 24 if window == "24h" else 7
        bucket_size = timedelta(hours=1) if window == "24h" else timedelta(days=1)

        bucket_start = _align_start(current, bucket_size, bucket_count)
        bucket_edges = [bucket_start + i * bucket_size for i in range(bucket_count)]

        await self._ensure_schema()
        async with self._sessions() as session:
            rows = await self._fetch_rows(session, since=bucket_start)
            previous_rows = await self._fetch_rows(session, since=bucket_start - duration, until=bucket_start)

        series_map: dict[datetime, dict[str, Any]] = {
            edge: {
                "total": 0,
                "severity": {"low": 0, "medium": 0, "high": 0},
            }
            for edge in bucket_edges
        }
        severity_totals: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
        label_counts: dict[str, dict[str, Any]] = {}
        analyses = 0
        high_analyses = 0

        for row in rows:
            bucket_key = _bucket_for(row.created_at, bucket_size, bucket_edges)
            if bucket_key is None:
                continue
            analyses += 1
            bucket_entry = series_map[bucket_key]

            saw_high = False
            for moment in row.moments:
                severity_key = _normalize_severity(moment.get("severity"))
                if severity_key is None:
                    continue
                severity_totals[severity_key] += 1
                bucket_entry["severity"][severity_key] += 1

                label = _sanitize_label(moment.get("label"))
                key = label.lower()
                if key not in label_counts:
                    label_counts[key] = {"label": label, "count": 0, "weight": 0.0}
                label_counts[key]["count"] += 1
                label_counts[key]["weight"] += float(_SEVERITY_WEIGHT[severity_key])

                if severity_key == "high":
                    saw_high = True

            if saw_high:
                high_analyses += 1

            bucket_entry["total"] += 1

        top_labels = _build_top_labels(label_counts)
        series = [
            InsightSeriesBucket(
                bucket_start=edge,
                total=series_map[edge]["total"],
                severity=InsightSeverityTotals(**series_map[edge]["severity"]),
            )
            for edge in bucket_edges
        ]

        previous_analyses = len(previous_rows)
        previous_high = _count_high(previous_rows)

        delta = None
        if analyses or previous_analyses:
            delta = {
                "analyses": analyses - previous_analyses,
                "high_severity": high_analyses - previous_high,
            }

        return AggregatedInsights(
            window=window,
            generated_at=current,
            severity_totals=InsightSeverityTotals(**severity_totals),
            series=series,
            top_labels=top_labels,
            analyses=analyses,
            high_severity_analyses=high_analyses,
            delta=delta,
        )

    async def _fetch_rows(
        self,
        session: AsyncSession,
        *,
        since: datetime,
        until: datetime | None = None,
    ) -> list[AnalysisModel]:
        stmt = select(AnalysisModel).where(AnalysisModel.created_at >= since)
        if until is not None:
            stmt = stmt.where(AnalysisModel.created_at < until)
        result = await session.execute(stmt.order_by(AnalysisModel.created_at.asc()))
        return list(result.scalars())

    async def _ensure_schema(self) -> None:
        if self._initialized:
            return
        await ensure_database_ready(self._database_url)
        self._initialized = True


def _align_start(current: datetime, bucket_size: timedelta, bucket_count: int) -> datetime:
    aligned = _truncate_datetime(current, bucket_size)
    start = aligned - (bucket_size * (bucket_count - 1))
    return start


def _truncate_datetime(value: datetime, quantum: timedelta) -> datetime:
    if quantum >= timedelta(days=1):
        return value.replace(hour=0, minute=0, second=0, microsecond=0)
    if quantum >= timedelta(hours=1):
        return value.replace(minute=0, second=0, microsecond=0)
    return value


def _bucket_for(created_at: datetime, bucket_size: timedelta, bucket_edges: list[datetime]) -> datetime | None:
    ts = _truncate_datetime(_as_utc(created_at), bucket_size)
    return ts if ts in bucket_edges else None


def _normalize_severity(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return _SEVERITY_ORDER.get(normalized)


def _build_top_labels(label_counts: dict[str, dict[str, Any]]) -> list[InsightTopLabel]:
    items: list[InsightTopLabel] = []
    for data in label_counts.values():
        count = int(data["count"])
        average = None
        if count > 0:
            average = data["weight"] / count
        items.append(
            InsightTopLabel(
                label=data["label"],
                count=count,
                avg_severity=average,
            )
        )

    items.sort(key=lambda item: (-item.count, item.label))
    return items[:5]


def _count_high(rows: list[AnalysisModel]) -> int:
    total = 0
    for row in rows:
        for moment in row.moments:
            severity_key = _normalize_severity(moment.get("severity"))
            if severity_key == "high":
                total += 1
                break
    return total


def _window_duration(window: InsightWindow) -> timedelta:
    if window == "24h":
        return timedelta(hours=24)
    if window == "7d":
        return timedelta(days=7)
    raise ValueError(f"Unsupported window '{window}'")


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _sanitize_label(raw: str | None) -> str:
    value = (raw or "unknown").strip() or "unknown"
    normalized = value.title()
    if len(normalized) <= _MAX_LABEL_LENGTH:
        return normalized
    return normalized[: _MAX_LABEL_LENGTH].rstrip()

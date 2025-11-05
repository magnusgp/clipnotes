from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import Select, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.db import Base
from backend.app.models.config import RequestCountModel
from backend.app.models.metrics import DailyMetricsBucket, HourlyMetricsBucket, MetricsResponse
from backend.app.store.sqlite import AnalysisModel, ClipModel


class MetricsService:
    """Aggregate ClipNotes usage metrics for the dashboard."""

    def __init__(
        self,
        database_url: str,
        *,
        latency_warning_threshold_ms: int = 5000,
        hourly_window: int = 12,
        daily_window: int = 7,
    ) -> None:
        self._engine = create_async_engine(database_url, echo=False, future=True)
        self._sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(self._engine, expire_on_commit=False)
        self._latency_threshold = float(latency_warning_threshold_ms)
        self._hourly_window = hourly_window
        self._daily_window = daily_window
        self._init_lock = asyncio.Lock()
        self._initialized = False

    async def close(self) -> None:
        await self._engine.dispose()

    async def get_metrics(self, window: str | None = None, *, now: datetime | None = None) -> MetricsResponse:
        await self._ensure_schema()

        current = now.astimezone(timezone.utc) if now else datetime.now(timezone.utc)
        lookback = self._resolve_window(window)
        window_start = current - lookback
        async with self._sessions() as session:
            total_clips = await self._scalar_count(session, select(func.count()).select_from(ClipModel))
            total_analyses = await self._scalar_count(session, select(func.count()).select_from(AnalysisModel))

            avg_latency = await self._average_latency(session, window_start)
            error_rate = await self._error_rate(session)

            requests_today = await self._requests_for_day(session, current.date())
            per_day = await self._daily_buckets(session, current)
            clips_today = sum(bucket.analyses for bucket in per_day if bucket.date == current.date())

            per_hour = await self._hourly_buckets(session, current)

        latency_flag = avg_latency > 0.0 and avg_latency >= self._latency_threshold

        return MetricsResponse(
            generated_at=current,
            total_clips=total_clips,
            total_analyses=total_analyses,
            avg_latency_ms=avg_latency,
            requests_today=requests_today,
            clips_today=clips_today,
            per_hour=per_hour,
            per_day=per_day,
            latency_flag=latency_flag,
            error_rate=error_rate,
        )

    def _resolve_window(self, window: str | None) -> timedelta:
        if window is None:
            return timedelta(hours=24)

        if window == "12h":
            return timedelta(hours=12)
        if window == "24h":
            return timedelta(hours=24)
        if window == "7d":
            return timedelta(days=7)

        raise ValueError("Invalid window parameter; expected '12h', '24h', or '7d'.")

    async def _ensure_schema(self) -> None:
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            async with self._engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            self._initialized = True

    async def _scalar_count(self, session: AsyncSession, stmt: Select) -> int:
        result = await session.execute(stmt)
        value = result.scalar_one_or_none()
        return int(value or 0)

    async def _average_latency(self, session: AsyncSession, window_start: datetime) -> float:
        stmt = (
            select(func.avg(AnalysisModel.latency_ms))
            .where(AnalysisModel.created_at >= window_start)
            .where(AnalysisModel.latency_ms.is_not(None))
        )
        result = await session.execute(stmt)
        value = result.scalar_one_or_none()
        return float(value or 0.0)

    async def _error_rate(self, session: AsyncSession) -> float | None:
        error_case = case(
            (AnalysisModel.error_code.is_not(None), 1),
            (AnalysisModel.error_message.is_not(None), 1),
            else_=0,
        )
        stmt = (
            select(
                func.count(AnalysisModel.id),
                func.coalesce(func.sum(error_case), 0),
            )
        )
        result = await session.execute(stmt)
        total, errors = result.one()

        total_count = int(total or 0)
        error_count = int(errors or 0)

        if total_count == 0:
            return None
        return error_count / total_count

    async def _requests_for_day(self, session: AsyncSession, target: date) -> int:
        stmt = select(RequestCountModel.requests).where(RequestCountModel.date == target)
        result = await session.execute(stmt)
        value = result.scalar_one_or_none()
        return int(value or 0)

    async def _daily_buckets(self, session: AsyncSession, current: datetime) -> list[DailyMetricsBucket]:
        start_day = current.date() - timedelta(days=self._daily_window - 1)
        day_start_dt = datetime.combine(start_day, time.min, tzinfo=timezone.utc)

        request_rows = (
            await session.execute(
                select(RequestCountModel.date, RequestCountModel.requests).where(RequestCountModel.date >= start_day)
            )
        ).all()
        request_map = {row[0]: int(row[1]) for row in request_rows}

        analysis_rows = (
            await session.execute(
                select(AnalysisModel.created_at)
                .where(AnalysisModel.created_at >= day_start_dt)
            )
        ).scalars().all()
        analysis_map: dict[date, int] = defaultdict(int)
        for created_at in analysis_rows:
            day = created_at.astimezone(timezone.utc).date()
            analysis_map[day] += 1

        if not request_map and not analysis_map:
            return []

        request_days = {day for day, count in request_map.items() if count > 0}
        analysis_days = {day for day, count in analysis_map.items() if count > 0}
        populated_days = sorted(request_days | analysis_days)

        buckets: list[DailyMetricsBucket] = []
        for bucket_date in populated_days:
            if bucket_date < start_day or bucket_date > current.date():
                continue
            buckets.append(
                DailyMetricsBucket(
                    date=bucket_date,
                    requests=request_map.get(bucket_date, 0),
                    analyses=analysis_map.get(bucket_date, 0),
                )
            )

        return buckets

    async def _hourly_buckets(self, session: AsyncSession, current: datetime) -> list[HourlyMetricsBucket]:
        start_hour = (current - timedelta(hours=self._hourly_window - 1)).replace(minute=0, second=0, microsecond=0)
        hour_start_dt = start_hour.astimezone(timezone.utc)

        analysis_rows = (
            await session.execute(
                select(AnalysisModel.created_at)
                .where(AnalysisModel.created_at >= hour_start_dt)
            )
        ).scalars().all()

        counts: dict[datetime, int] = defaultdict(int)
        for created_at in analysis_rows:
            bucket = created_at.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
            counts[bucket] += 1

        buckets: list[HourlyMetricsBucket] = []
        for offset in range(self._hourly_window):
            bucket_start = hour_start_dt + timedelta(hours=offset)
            if bucket_start > current:
                break
            count = counts.get(bucket_start, 0)
            if count == 0:
                continue
            buckets.append(HourlyMetricsBucket(hour=bucket_start, requests=count))

        return buckets

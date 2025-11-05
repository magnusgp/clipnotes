from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.models.config import RequestCountModel
from backend.app.services.metrics_service import MetricsService
from backend.app.store.base import AnalysisPayload, Moment
from backend.app.store.sqlite import AnalysisModel, ClipModel, SqliteStore


@pytest.mark.asyncio
async def test_metrics_snapshot_returns_zeros_when_empty(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'metrics.db'}"
    service = MetricsService(database_url)

    snapshot = await service.get_metrics(now=datetime(2025, 1, 1, tzinfo=timezone.utc))

    assert snapshot.total_clips == 0
    assert snapshot.total_analyses == 0
    assert snapshot.requests_today == 0
    assert snapshot.clips_today == 0
    assert snapshot.avg_latency_ms == 0.0
    assert snapshot.latency_flag is False
    assert snapshot.error_rate is None
    assert snapshot.per_hour == []
    assert snapshot.per_day == []

    await service.close()


@pytest.mark.asyncio
async def test_metrics_snapshot_includes_recent_activity(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path/'metrics.db'}"
    store = SqliteStore(database_url)
    now = datetime(2025, 11, 3, 15, 30, tzinfo=timezone.utc)

    # Seed clips
    clip_one = await store.create_clip(filename="first.mp4")
    clip_two = await store.create_clip(filename="second.mp4")

    # Seed analyses with explicit timestamps
    payload_ok = AnalysisPayload(
        summary="ok",
        moments=[Moment(start_s=0.0, end_s=1.0, label="intro", severity="low")],
        raw={},
        latency_ms=5200,
    )
    payload_warn = AnalysisPayload(
        summary="slow",
        moments=[Moment(start_s=1.0, end_s=2.0, label="middle", severity="medium")],
        raw={},
        latency_ms=6800,
    )
    payload_error = AnalysisPayload(
        summary=None,
        moments=[],
        raw={},
        latency_ms=None,
        error_code="timeout",
        error_message="Timed out",
    )

    await store.save_analysis(clip_one.id, payload_ok)
    await store.save_analysis(clip_one.id, payload_warn)
    await store.save_analysis(clip_two.id, payload_error)

    engine = create_async_engine(database_url, echo=False)
    sessions: async_sessionmaker[AsyncSession] = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as session:
        rows = (await session.execute(select(AnalysisModel))).scalars().all()
        # Assign deterministic timestamps: two analyses today, one yesterday
        rows[0].created_at = now - timedelta(hours=1)
        rows[1].created_at = now - timedelta(hours=5)
        rows[2].created_at = now - timedelta(days=1, hours=3)
        await session.commit()

    # Seed request counters for current and previous day
    async with sessions() as session:
        today_row = RequestCountModel(date=now.date(), requests=37)
        yesterday_row = RequestCountModel(date=now.date() - timedelta(days=1), requests=22)
        session.add_all([today_row, yesterday_row])
        await session.commit()

    service = MetricsService(database_url, latency_warning_threshold_ms=5000)
    snapshot = await service.get_metrics(now=now)

    assert snapshot.total_clips == 2
    assert snapshot.total_analyses == 3
    assert snapshot.requests_today == 37
    assert snapshot.clips_today == 2
    assert snapshot.avg_latency_ms == pytest.approx((5200 + 6800) / 2, rel=1e-3)
    assert snapshot.latency_flag is True
    assert snapshot.error_rate == pytest.approx(1 / 3, rel=1e-3)

    # Expect per-day buckets to include current day with values we seeded
    today_bucket = next(bucket for bucket in snapshot.per_day if bucket.date == now.date())
    assert today_bucket.requests == 37
    assert today_bucket.analyses == 2

    await service.close()
    await store.close()
    await engine.dispose()
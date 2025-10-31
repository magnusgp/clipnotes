from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from backend.app.store import AnalysisPayload


@pytest.mark.asyncio
async def test_fake_hafnia_client_returns_structured_payload():
    from backend.app.services.hafnia import FakeHafniaClient

    client = FakeHafniaClient()
    clip_id = uuid4()

    payload = await client.analyze_clip(
        clip_id=clip_id,
        asset_id="asset-123",
        filename="dock.mp4",
        prompt="Focus on safety protocols",
    )

    assert isinstance(payload, AnalysisPayload)
    assert payload.summary is not None
    assert "dock.mp4" in payload.summary
    assert payload.prompt == "Focus on safety protocols"
    assert payload.error_code is None
    assert payload.error_message is None
    assert payload.latency_ms is not None
    assert payload.moments, "Fake client should include at least one moment"
    assert payload.raw.get("clip_id") == str(clip_id)
    assert payload.raw.get("status") == "success"


@pytest.mark.asyncio
async def test_fake_hafnia_client_can_simulate_failure():
    from backend.app.services.hafnia import FakeHafniaClient

    client = FakeHafniaClient()
    client.set_next_error(code="hafnia_timeout", message="Timed out", latency_ms=9100)

    payload = await client.analyze_clip(
        clip_id=uuid4(),
        asset_id="asset-456",
        filename="harbor.mp4",
    )

    assert isinstance(payload, AnalysisPayload)
    assert payload.summary is None
    assert payload.moments == []
    assert payload.error_code == "hafnia_timeout"
    assert payload.error_message == "Timed out"
    assert payload.latency_ms == 9100
    assert payload.raw.get("status") == "error"

import io

import pytest
from fastapi import UploadFile

from backend.app.models.schemas import SummaryResponse
from backend.app.services.sessions import SessionRegistry
from backend.app.services.summarizer import Summarizer, normalize_summary_payload


class StubHafniaClient:
    async def upload_asset(self, upload_file: UploadFile) -> str:
        return "asset-123"

    async def request_summary(self, asset_id: str, *, prompt: str) -> dict[str, object]:
        assert asset_id == "asset-123"
        return {
            "bullets": ["Cyclist crosses street", "Car stops at red light"],
            "structured_summary": {
                "events": [
                    {"actor": "cyclist", "action": "crosses street"},
                    {"actor": "car", "action": "stops at red light"},
                ]
            },
            "completion_id": "comp-123",
        }

    async def close(self) -> None:
        return None


@pytest.mark.asyncio
async def test_summarizer_process_returns_response():
    client = StubHafniaClient()
    summarizer = Summarizer(client=client)  # type: ignore[arg-type]

    upload = UploadFile(
        filename="clip.mp4",
        file=io.BytesIO(b"binary-video"),
    )

    result = await summarizer.process(upload)

    assert isinstance(result, SummaryResponse)
    assert result.summary == ["Cyclist crosses street", "Car stops at red light"]
    assert result.structured_summary is not None
    assert result.asset_id == "asset-123"
    assert result.completion_id == "comp-123"


@pytest.mark.asyncio
async def test_summarizer_records_session_registry():
    client = StubHafniaClient()
    registry = SessionRegistry()
    summarizer = Summarizer(client=client, registry=registry)  # type: ignore[arg-type]

    upload = UploadFile(
        filename="clip.mp4",
        file=io.BytesIO(b"binary-video"),
    )

    result = await summarizer.process(upload)

    stored = registry.get(result.submission_id)
    assert stored.asset_id == "asset-123"
    assert stored.latest_completion_id == "comp-123"


def test_normalize_summary_payload_prefers_bullets():
    bullets, structured = normalize_summary_payload(
        {
            "bullets": ["Event A", "Event B"],
            "structured_summary": {"events": []},
        }
    )
    assert bullets == ["Event A", "Event B"]
    assert structured == {"events": []}


def test_normalize_summary_payload_falls_back_to_text():
    bullets, structured = normalize_summary_payload(
        {"summary": "Cyclist crosses street. Car stops at red light."}
    )
    assert bullets == ["Cyclist crosses street.", "Car stops at red light."]
    assert structured is None

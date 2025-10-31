import io
import os
from datetime import datetime
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("HAFNIA_API_KEY", "test-key")
os.environ.setdefault("HAFNIA_BASE_URL", "https://hafnia.example.com")

from backend.app.api.deps import get_summarizer
from backend.app.models.schemas import SummaryJson, SummaryResponse
from backend.app.services import validators as validators_module
from backend.app.services.hafnia_client import HafniaClientError
from backend.main import app


class StubSummarizer:
    def __init__(self) -> None:
        self.calls = 0

    async def process(self, upload_file):
        self.calls += 1
        return SummaryResponse(
            submission_id=str(uuid4()),
            asset_id="asset-123",
            summary=["Cyclist crosses the street", "Car stops at red light"],
            structured_summary=SummaryJson(
                data={
                    "events": [
                        {"actor": "cyclist", "action": "crosses street"},
                        {"actor": "car", "action": "stops at light"},
                    ]
                }
            ),
            latency_ms=8200,
            completed_at=datetime.now(),
            completion_id="comp-456",
        )


@pytest.mark.asyncio
async def test_analyze_success(monkeypatch):
    stub = StubSummarizer()
    app.dependency_overrides[get_summarizer] = lambda: stub

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.post(
            "/api/analyze",
            files={"file": ("sample.mp4", io.BytesIO(b"video"), "video/mp4")},
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["summary"] == [
        "Cyclist crosses the street",
        "Car stops at red light",
    ]
    assert payload["asset_id"] == "asset-123"
    assert payload["completion_id"] == "comp-456"
    assert payload["structured_summary"] is not None
    assert payload["latency_ms"] == 8200
    assert stub.calls == 1


@pytest.mark.asyncio
async def test_analyze_rejects_invalid_mime(monkeypatch):
    stub = StubSummarizer()
    app.dependency_overrides[get_summarizer] = lambda: stub

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.post(
            "/api/analyze",
            files={"file": ("notes.txt", io.BytesIO(b"hi"), "text/plain")},
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    body = response.json()
    assert body["error"]["code"] == "unsupported_file_type"
    assert body["error"]["message"] == "Unsupported file type"
    assert "MP4 or MKV" in body["error"].get("remediation", "")
    assert stub.calls == 0


@pytest.mark.asyncio
async def test_analyze_rejects_large_files(monkeypatch):
    stub = StubSummarizer()
    app.dependency_overrides[get_summarizer] = lambda: stub

    monkeypatch.setattr(validators_module, "MAX_FILE_BYTES", 10)
    oversized_payload = b"0" * 12

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.post(
            "/api/analyze",
            files={
                "file": ("huge.mp4", io.BytesIO(oversized_payload), "video/mp4"),
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    body = response.json()
    assert body["error"]["code"] == "file_too_large"
    assert body["error"]["message"] == "File too large"
    assert "Compress the clip" in body["error"].get("remediation", "")
    assert stub.calls == 0


@pytest.mark.asyncio
async def test_analyze_handles_hafnia_failure(monkeypatch):
    class FailingSummarizer(StubSummarizer):
        async def process(self, upload_file):  # type: ignore[override]
            raise HafniaClientError("Hafnia timed out")

    stub = FailingSummarizer()
    app.dependency_overrides[get_summarizer] = lambda: stub

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.post(
            "/api/analyze",
            files={"file": ("clip.mp4", io.BytesIO(b"video"), "video/mp4")},
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    payload = response.json()
    assert payload["error"]["code"] == "hafnia_unavailable"
    assert payload["error"]["message"] == "Hafnia is currently unavailable"
    assert payload["error"]["detail"] == "Hafnia timed out"
    assert "Please retry" in payload["error"].get("remediation", "")
    assert stub.calls == 0
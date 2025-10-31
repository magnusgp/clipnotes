import uuid

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from backend.main import app


class FakeChatResult:
    def __init__(self, submission_id: str, asset_id: str, message: str, completion_id: str | None = None) -> None:
        self._payload = {
            "submission_id": submission_id,
            "asset_id": asset_id,
            "message": message,
        }
        if completion_id:
            self._payload["completion_id"] = completion_id

    def model_dump(self, mode: str = "json"):
        return self._payload


class StubConversationService:
    def __init__(self, *, reply: str = "Additional insight.") -> None:
        self.reply = reply
        self.calls: list[tuple[str, str]] = []

    async def chat(self, submission_id: str, prompt: str) -> FakeChatResult:
        self.calls.append((submission_id, prompt))
        return FakeChatResult(
            submission_id=submission_id,
            asset_id="asset-123",
            message=self.reply,
            completion_id="comp-789",
        )


class StubConversationServiceMissing:
    async def chat(self, submission_id: str, prompt: str):  # pragma: no cover - triggered in tests
        from backend.app.services.sessions import SessionNotFoundError

        raise SessionNotFoundError(submission_id)


@pytest.mark.asyncio
async def test_chat_returns_follow_up_message(monkeypatch):
    from backend.app.api import deps

    stub = StubConversationService(reply="Safety concerns detected.")
    app.dependency_overrides[deps.get_conversation_service] = lambda: stub

    submission_id = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post(
            "/api/chat",
            json={
                "submission_id": submission_id,
                "prompt": "Highlight any safety issues",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["submission_id"] == submission_id
    assert payload["message"] == "Safety concerns detected."
    assert payload["asset_id"] == "asset-123"
    assert payload["completion_id"] == "comp-789"
    assert stub.calls == [(submission_id, "Highlight any safety issues")]


@pytest.mark.asyncio
async def test_chat_returns_not_found_when_submission_missing(monkeypatch):
    from backend.app.api import deps

    stub = StubConversationServiceMissing()
    app.dependency_overrides[deps.get_conversation_service] = lambda: stub

    missing_id = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post(
            "/api/chat",
            json={
                "submission_id": missing_id,
                "prompt": "Provide a brief recap",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_404_NOT_FOUND
    body = response.json()
    assert body["error"]["code"] == "submission_not_found"
    assert body["error"]["message"] == "Submission not found"
    assert body["error"].get("submission_id") == missing_id
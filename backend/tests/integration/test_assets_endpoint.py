import uuid

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from backend.app.api import deps
from backend.app.services.sessions import SessionNotFoundError, SessionRegistry
from backend.main import app


@pytest.mark.asyncio
async def test_delete_asset_removes_session():
    registry = SessionRegistry()
    submission_id = str(uuid.uuid4())
    registry.record_summary(
        submission_id=submission_id,
        asset_id="asset-123",
        completion_id="comp-456",
    )

    app.dependency_overrides[deps.get_session_registry] = lambda: registry

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.delete(f"/api/assets/{submission_id}")

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_204_NO_CONTENT
    with pytest.raises(SessionNotFoundError):
        registry.get(submission_id)


@pytest.mark.asyncio
async def test_delete_asset_returns_not_found_when_missing():
    registry = SessionRegistry()
    app.dependency_overrides[deps.get_session_registry] = lambda: registry

    missing_id = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.delete(f"/api/assets/{missing_id}")

    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_404_NOT_FOUND
    body = response.json()
    assert body["error"]["code"] == "submission_not_found"
    assert body["error"]["message"] == "Submission not found"
    assert body["error"].get("submission_id") == missing_id

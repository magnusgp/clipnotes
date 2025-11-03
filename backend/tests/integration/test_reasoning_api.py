"""Integration scaffolding for reasoning endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable, cast
from uuid import UUID, uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from backend.app.models.reasoning import (
	ComparisonAnswer,
	ReasoningChatResponse,
	ReasoningComparisonResponse,
	ReasoningHistoryEntry,
	ReasoningHistoryResponse,
)
from backend.app.store.base import AnalysisRecord, ClipRecord, Moment
from backend.main import app


@pytest.mark.asyncio
async def test_compare_two_clips(monkeypatch):
	from backend.app.api import deps

	class StubCompareService:
		def __init__(self) -> None:
			self.calls: list[tuple[UUID, UUID, str]] = []

		async def compare(self, *, clip_a_id, clip_b_id, question):
			self.calls.append((clip_a_id, clip_b_id, question))
			return ReasoningComparisonResponse(
				answer=ComparisonAnswer.CLIP_A,
				explanation="Clip A recorded the only high severity incident.",
				evidence=[],
				metrics=None,
				confidence=0.7,
			)

	compare_dependency = getattr(deps, "get_compare_service", None)
	if compare_dependency is None:
		pytest.skip("compare service dependency not wired yet")
	compare_provider = cast(Callable[[], object], compare_dependency)

	stub = StubCompareService()
	app.dependency_overrides[compare_provider] = lambda: stub

	clip_a = uuid4()
	clip_b = uuid4()

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
		response = await client.post(
			"/api/reasoning/compare",
			json={
				"clip_a": str(clip_a),
				"clip_b": str(clip_b),
				"question": "Which clip is riskier?",
			},
		)

	app.dependency_overrides.clear()

	assert response.status_code == status.HTTP_200_OK
	payload = response.json()
	assert payload["answer"] == ComparisonAnswer.CLIP_A.value
	assert stub.calls == [(clip_a, clip_b, "Which clip is riskier?")]


@pytest.mark.asyncio
async def test_chat_follow_up_endpoint(monkeypatch):
	from backend.app.api import deps

	clip_a = uuid4()
	clip_b = uuid4()

	class StubChatService:
		def __init__(self) -> None:
			self.chat_calls: list[tuple[list[UUID], str]] = []
			self.history_calls: list[dict[str, object]] = []

		async def ask(self, *, clips, message):
			self.chat_calls.append((clips, message))
			return ReasoningChatResponse(
				answer="Clip B shows reduced congestion.",
				created_at=datetime.now(timezone.utc),
				evidence=[],
				clips=[clip_a, clip_b],
			)

		async def history(self, *, clip_selection_hash=None, clip_id=None, limit=20):  # pragma: no cover - unused here
			self.history_calls.append(
				{
					"clip_selection_hash": clip_selection_hash,
					"clip_id": clip_id,
					"limit": limit,
				}
			)
			return ReasoningHistoryResponse(items=[])

	chat_dependency = getattr(deps, "get_chat_service", None)
	if chat_dependency is None:
		pytest.skip("chat service dependency not wired yet")
	chat_provider = cast(Callable[[], object], chat_dependency)

	stub = StubChatService()
	app.dependency_overrides[chat_provider] = lambda: stub

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
		response = await client.post(
			"/api/reasoning/chat",
			json={
				"clips": [str(clip_a), str(clip_b)],
				"message": "Where is congestion lower now?",
			},
		)

	app.dependency_overrides.clear()

	assert response.status_code == status.HTTP_200_OK
	payload = response.json()
	assert payload["answer"] == "Clip B shows reduced congestion."
	assert stub.chat_calls == [([clip_a, clip_b], "Where is congestion lower now?")]


@pytest.mark.asyncio
async def test_history_endpoint_returns_entries(monkeypatch):
	from backend.app.api import deps

	clip_id = uuid4()
	entry = ReasoningHistoryEntry(
		id=uuid4(),
		clip_ids=[clip_id],
		question="Any changes after the second pass?",
		answer=ReasoningChatResponse(
			answer="Clip shows marginal improvement near dock.",
			created_at=datetime.now(timezone.utc),
			evidence=[],
			clips=[clip_id],
		),
		answer_type="chat",
		created_at=datetime.now(timezone.utc),
	)

	class StubChatService:
		def __init__(self) -> None:
			self.chat_calls: list[tuple[list[UUID], str]] = []
			self.history_calls: list[dict[str, object]] = []

		async def ask(self, *, clips, message):  # pragma: no cover - unused here
			self.chat_calls.append((clips, message))
			return ReasoningChatResponse(
				answer="",
				created_at=datetime.now(timezone.utc),
				evidence=[],
				clips=list(clips),
			)

		async def history(self, *, clip_selection_hash=None, clip_id=None, limit=20):
			self.history_calls.append(
				{
					"clip_selection_hash": clip_selection_hash,
					"clip_id": clip_id,
					"limit": limit,
				}
			)
			return ReasoningHistoryResponse(items=[entry])

	chat_dependency = getattr(deps, "get_chat_service", None)
	if chat_dependency is None:
		pytest.skip("chat service dependency not wired yet")
	chat_provider = cast(Callable[[], object], chat_dependency)

	stub = StubChatService()
	app.dependency_overrides[chat_provider] = lambda: stub

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
		response = await client.get(
			"/api/reasoning/history",
			params={
				"clip_selection_hash": "selection:abc",
				"clip_id": str(clip_id),
				"limit": 5,
			},
		)

	app.dependency_overrides.clear()

	assert response.status_code == status.HTTP_200_OK
	payload = response.json()
	assert payload["items"], "Expected at least one history item"
	assert payload["items"][0]["question"] == "Any changes after the second pass?"
	assert stub.history_calls == [
		{
			"clip_selection_hash": "selection:abc",
			"clip_id": clip_id,
			"limit": 5,
		}
	]


@pytest.mark.asyncio
async def test_metrics_payload(monkeypatch):
	from backend.app.api import deps

	clip_id = uuid4()

	class StubStore:
		def __init__(self) -> None:
			self.calls: list[UUID] = []

		async def get_clip(self, clip: UUID) -> ClipRecord | None:
			return ClipRecord(
				id=clip,
				filename="metrics.mp4",
				asset_id="asset-1",
				created_at=datetime.now(timezone.utc),
			)

		async def get_latest_analysis(self, clip: UUID) -> AnalysisRecord | None:
			self.calls.append(clip)
			return AnalysisRecord(
				clip_id=clip_id,
				summary="",
				moments=[
					Moment(start_s=0.0, end_s=4.5, label="berthing", severity="medium"),
					Moment(start_s=5.0, end_s=12.0, label="collision", severity="high"),
				],
				raw={
					"object_graph": {
						"nodes": [
							{"id": "vessel", "label": "Vessel"},
							{"id": "tug", "label": "Tug"},
						],
						"edges": [
							{"source": "vessel", "target": "tug", "relation": "assisted"}
						],
					}
				},
				created_at=datetime.now(timezone.utc),
				latency_ms=900,
				prompt=None,
				error_code=None,
				error_message=None,
			)

	store_dependency = getattr(deps, "get_store", None)
	if store_dependency is None:
		pytest.skip("store dependency not wired yet")

	stub = StubStore()
	store_provider = cast(Callable[[], object], store_dependency)
	app.dependency_overrides[store_provider] = lambda: stub

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
		response = await client.get(f"/api/reasoning/metrics/{clip_id}")

	app.dependency_overrides.clear()

	assert response.status_code == status.HTTP_200_OK
	payload = response.json()
	assert payload["clip_id"] == str(clip_id)
	assert payload["counts_by_label"]["collision"] == 1
	assert payload["durations_by_label"]["berthing"] == 4.5
	assert payload["object_graph"]["nodes"][0]["id"] == "vessel"


@pytest.mark.asyncio
async def test_metrics_payload_returns_not_found_when_analysis_missing(monkeypatch):
	from backend.app.api import deps

	clip_id = uuid4()

	class EmptyStore:
		def __init__(self) -> None:
			self.calls: list[UUID] = []

		async def get_clip(self, clip: UUID) -> ClipRecord | None:
			return ClipRecord(
				id=clip,
				filename="metrics.mp4",
				asset_id="asset-1",
				created_at=datetime.now(timezone.utc),
			)

		async def get_latest_analysis(self, clip: UUID) -> AnalysisRecord | None:  # pragma: no cover - trivial branch
			self.calls.append(clip)
			return None

	store_dependency = getattr(deps, "get_store", None)
	if store_dependency is None:
		pytest.skip("store dependency not wired yet")

	stub = EmptyStore()
	store_provider = cast(Callable[[], object], store_dependency)
	app.dependency_overrides[store_provider] = lambda: stub

	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
		response = await client.get(f"/api/reasoning/metrics/{clip_id}")

	app.dependency_overrides.clear()

	assert response.status_code == status.HTTP_404_NOT_FOUND
	payload = response.json()
	assert payload["error"]["code"] == "analysis_not_found"

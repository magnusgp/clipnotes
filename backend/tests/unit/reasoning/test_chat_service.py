from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Sequence, cast
from uuid import UUID, uuid4

import pytest

from backend.app.models.reasoning import ReasoningChatResponse
from backend.app.reasoning.chat import (
    DEFAULT_CHAT_SYSTEM_PROMPT,
    ChatService,
    compute_clip_selection_hash,
)
from backend.app.reasoning.compare import MissingAnalysisError
from backend.app.reasoning.store import ReasoningHistoryRecord
from backend.app.store.base import AnalysisRecord, ClipStore, Moment


def _make_analysis(
    *,
    clip_id: UUID | None = None,
    summary: str | None = "",
    moments: list[Moment] | None = None,
) -> AnalysisRecord:
    return AnalysisRecord(
        clip_id=clip_id or uuid4(),
        summary=summary,
        moments=moments or [],
        raw={"moments": []},
        created_at=datetime.now(timezone.utc),
        latency_ms=1200,
        prompt="system",
        error_code=None,
        error_message=None,
    )


class _StubStore:
    def __init__(self, analyses: dict[UUID, AnalysisRecord]):
        self._analyses = analyses
        self.requested: list[UUID] = []

    async def get_latest_analysis(self, clip_id: UUID) -> AnalysisRecord | None:
        self.requested.append(clip_id)
        return self._analyses.get(clip_id)


class _StubHistoryStore:
    def __init__(self) -> None:
        self.persist_calls: list[ReasoningHistoryRecord] = []
        self.history: dict[str, list[ReasoningHistoryRecord]] = {}
        self.list_args: list[dict[str, Any]] = []

    async def list_recent(
        self,
        *,
        clip_selection_hash: str | None,
        clip_id: UUID | None,
        limit: int,
    ) -> list[ReasoningHistoryRecord]:
        self.list_args.append(
            {
                "clip_selection_hash": clip_selection_hash,
                "clip_id": clip_id,
                "limit": limit,
            }
        )

        if clip_selection_hash:
            return list(self.history.get(clip_selection_hash, []))[:limit]

        if clip_id is not None:
            matches: list[ReasoningHistoryRecord] = []
            for entries in self.history.values():
                matches.extend(
                    entry for entry in entries if clip_id in entry.clip_ids
                )
            return matches[:limit]

        return []

    async def persist_entry(
        self,
        *,
        clip_selection_hash: str,
        clip_ids: Sequence[UUID],
        question: str,
        answer: ReasoningChatResponse,
        answer_type: str,
    ) -> ReasoningHistoryRecord:
        record = ReasoningHistoryRecord(
            id=uuid4(),
            clip_selection_hash=clip_selection_hash,
            clip_ids=list(clip_ids),
            question=question,
            answer=answer,
            answer_type=answer_type,
            created_at=datetime.now(timezone.utc),
        )
        self.persist_calls.append(record)
        self.history.setdefault(clip_selection_hash, []).append(record)
        return record


class _StubReasoningClient:
    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload
        self.prompts: list[str] = []
        self.system_prompts: list[str] = []

    async def request_reasoning(
        self, *, system_prompt: str, prompt: str
    ) -> dict[str, Any]:
        self.system_prompts.append(system_prompt)
        self.prompts.append(prompt)
        return self.payload


def test_compute_clip_selection_hash_is_order_invariant():
    clip_ids = [uuid4(), uuid4(), uuid4()]
    forward = compute_clip_selection_hash(clip_ids)
    backward = compute_clip_selection_hash(list(reversed(clip_ids)))
    assert forward == backward
    assert len(forward) == 64


@pytest.mark.asyncio
async def test_chat_service_persists_entry_and_returns_response():
    clip_a = _make_analysis(summary="Clip A overview")
    clip_b = _make_analysis(summary="Clip B details")

    store = _StubStore({clip_a.clip_id: clip_a, clip_b.clip_id: clip_b})
    history_store = _StubHistoryStore()
    client = _StubReasoningClient(
        {
            "answer": "Clip A remains riskier due to repeated high severity events.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "clips": [str(clip_a.clip_id), str(clip_b.clip_id)],
            "evidence": [
                {
                    "clip_id": str(clip_a.clip_id),
                    "label": "collision",
                    "timestamp_range": [4.0, 9.0],
                }
            ],
        }
    )

    service = ChatService(
        store=cast(ClipStore, store),
        history_store=history_store,
        client=client,
    )

    response = await service.ask(
        clips=[clip_a.clip_id, clip_b.clip_id],
        message="  Does clip A still look riskier?  ",
    )

    assert response.answer.startswith("Clip A remains riskier")
    assert response.clips == [clip_a.clip_id, clip_b.clip_id]

    assert len(history_store.persist_calls) == 1
    entry = history_store.persist_calls[0]
    expected_hash = compute_clip_selection_hash([clip_a.clip_id, clip_b.clip_id])
    assert entry.clip_selection_hash == expected_hash
    assert entry.clip_ids == [clip_a.clip_id, clip_b.clip_id]
    assert entry.question == "Does clip A still look riskier?"
    assert entry.answer.answer == response.answer
    assert client.system_prompts == [DEFAULT_CHAT_SYSTEM_PROMPT]
    assert len(client.prompts) == 1
    prompt = client.prompts[0]
    assert "Clip A overview" in prompt
    assert "Does clip A still look riskier?" in prompt


@pytest.mark.asyncio
async def test_chat_service_includes_history_in_prompt():
    clip = _make_analysis(summary="Harbor congestion ongoing")
    store = _StubStore({clip.clip_id: clip})

    history_store = _StubHistoryStore()
    existing_response = ReasoningChatResponse(
        answer="Clip shows continued congestion near dockyard.",
        created_at=datetime.now(timezone.utc),
        evidence=[],
        clips=[clip.clip_id],
    )
    selection_hash = compute_clip_selection_hash([clip.clip_id])
    history_store.history[selection_hash] = [
        ReasoningHistoryRecord(
            id=uuid4(),
            clip_selection_hash=selection_hash,
            clip_ids=[clip.clip_id],
            question="What changed after noon?",
            answer=existing_response,
            answer_type="chat",
            created_at=datetime.now(timezone.utc),
        )
    ]

    client = _StubReasoningClient(
        {
            "answer": "Conditions remain similar with minor delays.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "clips": [str(clip.clip_id)],
        }
    )

    service = ChatService(
        store=cast(ClipStore, store),
        history_store=history_store,
        client=client,
    )

    await service.ask(clips=[clip.clip_id], message="Any improvement now?")

    assert len(client.prompts) == 1
    prompt = client.prompts[0]
    assert "What changed after noon?" in prompt
    assert "Clip shows continued congestion" in prompt
    assert "Any improvement now?" in prompt


@pytest.mark.asyncio
async def test_chat_service_requires_analysis_for_each_clip():
    clip_a = _make_analysis()
    store = _StubStore({clip_a.clip_id: clip_a})
    history_store = _StubHistoryStore()
    client = _StubReasoningClient({"answer": "", "created_at": datetime.now(timezone.utc).isoformat()})

    service = ChatService(
        store=cast(ClipStore, store),
        history_store=history_store,
        client=client,
    )

    missing_clip = uuid4()
    with pytest.raises(MissingAnalysisError):
        await service.ask(clips=[clip_a.clip_id, missing_clip], message="Are both clips similar?")

from __future__ import annotations

from datetime import datetime, timezone
from typing import cast
from uuid import UUID, uuid4

import pytest

from backend.app.models.reasoning import ComparisonAnswer
from backend.app.reasoning.compare import (
    DEFAULT_COMPARE_SYSTEM_PROMPT,
    CompareService,
    DuplicateClipSelectionError,
    MissingAnalysisError,
    build_compare_prompt,
    normalize_compare_response,
)
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


def test_build_compare_prompt_includes_clip_details():
    clip_a = _make_analysis(
        summary="Busy port with multiple near misses",
        moments=[
            Moment(start_s=5.0, end_s=10.0, label="oil spill", severity="high"),
            Moment(start_s=12.5, end_s=19.0, label="crowded lane", severity="medium"),
        ],
    )
    clip_b = _make_analysis(
        summary="Routine docking and cleanup",
        moments=[Moment(start_s=3.0, end_s=4.5, label="deck drill", severity="low")],
    )

    prompt = build_compare_prompt(
        question="Which clip has higher safety risk?",
        clip_a=clip_a,
        clip_b=clip_b,
    )

    assert str(clip_a.clip_id) in prompt
    assert str(clip_b.clip_id) in prompt
    assert "Busy port with multiple near misses" in prompt
    assert "Routine docking and cleanup" in prompt
    assert "00:05-00:10" in prompt
    assert "oil spill" in prompt
    assert "Severity: high" in prompt
    assert "Question: Which clip has higher safety risk?" in prompt
    assert "Respond with" in prompt


def test_normalize_compare_response_parses_payload():
    clip_a_id = uuid4()
    clip_b_id = uuid4()

    result = normalize_compare_response(
        {
            "answer": "clip_b",
            "explanation": "Clip B contains the only high-severity incident.",
            "evidence": [
                {
                    "clip_id": str(clip_b_id),
                    "label": "collision",
                    "timestamp_range": [12.0, 16.5],
                    "description": "Bulk carrier impact",
                }
            ],
            "metrics": {
                "counts_by_label": {"collision": 2},
                "severity_distribution": {"high": 0.6, "medium": 0.4},
            },
            "confidence": 0.73,
        }
    )

    assert result.answer is ComparisonAnswer.CLIP_B
    assert result.explanation == "Clip B contains the only high-severity incident."
    assert pytest.approx(result.confidence, rel=1e-6) == 0.73

    assert len(result.evidence) == 1
    evidence = result.evidence[0]
    assert evidence.clip_id == clip_b_id
    assert evidence.label == "collision"
    assert evidence.timestamp_range == (12.0, 16.5)
    assert evidence.description == "Bulk carrier impact"

    assert result.metrics is not None
    assert result.metrics.counts_by_label == {"collision": 2}
    assert result.metrics.severity_distribution == {"high": 0.6, "medium": 0.4}


def test_normalize_compare_response_handles_string_timestamps():
    clip_b_id = uuid4()

    result = normalize_compare_response(
        {
            "answer": "clip_b",
            "explanation": "Clip B incidents last longer.",
            "evidence": [
                {
                    "clip_id": str(clip_b_id),
                    "label": "extended congestion",
                    "timestamp_range": ["00:02", "01:05.5"],
                }
            ],
            "confidence": 1.0,
        }
    )

    assert result.answer is ComparisonAnswer.CLIP_B
    assert len(result.evidence) == 1
    evidence = result.evidence[0]
    assert evidence.clip_id == clip_b_id
    assert evidence.timestamp_range == (2.0, 65.5)


def test_normalize_compare_response_handles_invalid_payload():
    clip_a_id = uuid4()

    result = normalize_compare_response(
        {
            "answer": "no idea",
            "evidence": [
                {"clip_id": "not-a-uuid", "label": 123},
                {"clip_id": str(clip_a_id), "label": "oil spill"},
            ],
            "confidence": 5,
        }
    )

    assert result.answer is ComparisonAnswer.UNCERTAIN
    assert result.explanation == "No explanation provided."
    assert result.confidence == 1.0

    assert len(result.evidence) == 1
    evidence = result.evidence[0]
    assert evidence.clip_id == clip_a_id
    assert evidence.label == "oil spill"
    assert evidence.timestamp_range is None
    assert evidence.description is None

    assert result.metrics is None


class _StubStore:
    def __init__(self, analyses: dict[UUID, AnalysisRecord]):
        self._analyses = analyses
        self.requested: list[UUID] = []

    async def get_latest_analysis(self, clip_id: UUID) -> AnalysisRecord | None:
        self.requested.append(clip_id)
        return self._analyses.get(clip_id)


class _StubClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.prompts: list[str] = []
        self.system_prompts: list[str] = []

    async def request_reasoning(
        self, *, system_prompt: str, prompt: str
    ) -> dict[str, object]:
        self.system_prompts.append(system_prompt)
        self.prompts.append(prompt)
        return self.payload


@pytest.mark.asyncio
async def test_compare_service_returns_normalized_response():
    clip_a = _make_analysis(
        summary="Clip A risk",
        moments=[Moment(start_s=4.0, end_s=9.0, label="collision", severity="high")],
    )
    clip_b = _make_analysis(summary="Clip B calm seas")

    payload = {
        "answer": "clip_a",
        "explanation": "Clip A shows the only collision.",
        "evidence": [
            {
                "clip_id": str(clip_a.clip_id),
                "label": "collision",
                "timestamp_range": [4.0, 9.0],
            }
        ],
        "confidence": 0.82,
    }

    store = _StubStore({clip_a.clip_id: clip_a, clip_b.clip_id: clip_b})
    client = _StubClient(payload)

    service = CompareService(store=cast(ClipStore, store), client=client)

    response = await service.compare(
        clip_a_id=clip_a.clip_id,
        clip_b_id=clip_b.clip_id,
        question="Which clip has more severe incidents?",
    )

    assert response.answer is ComparisonAnswer.CLIP_A
    assert response.explanation == "Clip A shows the only collision."
    assert response.confidence == 0.82
    assert len(response.evidence) == 1

    assert client.system_prompts == [DEFAULT_COMPARE_SYSTEM_PROMPT]

    assert len(client.prompts) == 1
    prompt = client.prompts[0]
    assert prompt.startswith("Clip A (clip_id=")
    assert "Clip A (clip_id=" in prompt
    assert "Question: Which clip has more severe incidents?" in prompt

    assert store.requested == [clip_a.clip_id, clip_b.clip_id]


@pytest.mark.asyncio
async def test_compare_service_requires_analysis_for_each_clip():
    clip_a = _make_analysis()
    store = _StubStore({clip_a.clip_id: clip_a})
    client = _StubClient({})
    service = CompareService(store=cast(ClipStore, store), client=client)

    missing_clip = uuid4()
    with pytest.raises(MissingAnalysisError) as exc:
        await service.compare(
            clip_a_id=clip_a.clip_id,
            clip_b_id=missing_clip,
            question="Which clip is riskier?",
        )

    assert isinstance(exc.value, MissingAnalysisError)
    assert exc.value.clip_id == missing_clip


@pytest.mark.asyncio
async def test_compare_service_blocks_duplicate_clip_selection():
    clip_id = uuid4()
    clip_analysis = _make_analysis(clip_id=clip_id)
    store = _StubStore({clip_id: clip_analysis})
    client = _StubClient({})
    service = CompareService(store=cast(ClipStore, store), client=client)

    with pytest.raises(DuplicateClipSelectionError):
        await service.compare(
            clip_a_id=clip_id,
            clip_b_id=clip_id,
            question="Is there any difference?",
        )
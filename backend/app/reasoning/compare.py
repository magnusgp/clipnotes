from __future__ import annotations

from collections import Counter
import math
from typing import Any, Iterable, Protocol, Sequence
from uuid import UUID

from backend.app.core.logging import get_logger, latency_timer
from backend.app.models.reasoning import (
    ComparisonAnswer,
    ReasoningComparisonResponse,
    ReasoningEvidence,
    ReasoningMetrics,
)
from backend.app.store.base import AnalysisRecord, ClipStore, Moment

DEFAULT_COMPARE_SYSTEM_PROMPT = (
    "You are ClipNotes, a maritime operations analyst comparing pre-analysed clips. "
    "Always respond using only the provided analysis. Return exactly one JSON object "
    "matching the requested schema and avoid echoing the raw clip summaries or JSON."
)


class ReasoningClientProtocol(Protocol):
    """Protocol describing the reasoning client surface required for comparisons."""

    async def request_reasoning(
        self, *, system_prompt: str, prompt: str
    ) -> dict[str, Any]:
        ...


class DuplicateClipSelectionError(ValueError):
    """Raised when both clip IDs refer to the same clip."""

    def __init__(self, clip_id: UUID) -> None:
        super().__init__("clip_a and clip_b must refer to different clips")
        self.clip_id = clip_id


class MissingAnalysisError(RuntimeError):
    """Raised when the store lacks analysis data for a clip."""

    def __init__(self, clip_id: UUID) -> None:
        super().__init__(f"Analysis missing for clip {clip_id}")
        self.clip_id = clip_id


class CompareService:
    """Coordinates comparative reasoning calls using stored analyses."""

    def __init__(
        self,
        *,
        store: ClipStore,
        client: ReasoningClientProtocol,
        system_prompt: str | None = None,
    ) -> None:
        self._store = store
        self._client = client
        self._system_prompt = system_prompt or DEFAULT_COMPARE_SYSTEM_PROMPT
        self._logger = get_logger("reasoning.compare")

    async def compare(
        self,
        *,
        clip_a_id: UUID,
        clip_b_id: UUID,
        question: str,
    ) -> ReasoningComparisonResponse:
        if clip_a_id == clip_b_id:
            raise DuplicateClipSelectionError(clip_a_id)

        trimmed_question = question.strip()
        if not trimmed_question:
            raise ValueError("question must be a non-empty string")

        analysis_a = await self._store.get_latest_analysis(clip_a_id)
        if analysis_a is None:
            raise MissingAnalysisError(clip_a_id)

        analysis_b = await self._store.get_latest_analysis(clip_b_id)
        if analysis_b is None:
            raise MissingAnalysisError(clip_b_id)

        prompt = build_compare_prompt(
            question=trimmed_question,
            clip_a=analysis_a,
            clip_b=analysis_b,
            system_prompt=self._system_prompt,
            include_system_prompt=False,
        )

        with latency_timer("reasoning.compare", logger=self._logger) as duration:
            payload = await self._client.request_reasoning(
                system_prompt=self._system_prompt,
                prompt=prompt,
            )

        response = normalize_compare_response(payload)

        self._logger.info(
            "comparison completed",
            extra={
                "clip_a_id": str(clip_a_id),
                "clip_b_id": str(clip_b_id),
                "answer": response.answer.value,
                "confidence": response.confidence,
                "latency_ms": duration(),
            },
        )

        return response


def build_compare_prompt(
    *,
    question: str,
    clip_a: AnalysisRecord,
    clip_b: AnalysisRecord,
    system_prompt: str | None = None,
    include_system_prompt: bool = True,
) -> str:
    """Render a deterministic prompt describing the two clips and the question."""

    question = question.strip()
    sections: list[str] = []
    if include_system_prompt:
        sections.append(system_prompt.strip() if system_prompt else DEFAULT_COMPARE_SYSTEM_PROMPT)

    sections.append(_render_clip_section(name="Clip A", record=clip_a))
    sections.append(_render_clip_section(name="Clip B", record=clip_b))

    instructions = (
        "Respond with a single JSON object containing: answer (clip_a, clip_b, equal, uncertain), "
        "explanation, evidence (list with clip_id, label, timestamp_range [start, end], description), "
        "metrics (counts_by_label, severity_distribution), and confidence (0-1). Do not include any "
        "extra narration, markdown, or the raw clip JSON."
    )

    sections.append(f"Question: {question}")
    sections.append(instructions)

    return "\n\n".join(sections)


def normalize_compare_response(payload: dict[str, Any]) -> ReasoningComparisonResponse:
    """Coerce the Hafnia response into the internal comparison schema."""

    answer = _normalize_answer(payload.get("answer"))
    explanation = _normalize_explanation(payload.get("explanation"))
    evidence = _normalize_evidence(payload.get("evidence"))
    metrics = _normalize_metrics(payload.get("metrics"))
    confidence = _normalize_confidence(payload.get("confidence"))

    return ReasoningComparisonResponse(
        answer=answer,
        explanation=explanation,
        evidence=evidence,
        metrics=metrics,
        confidence=confidence,
    )


def _render_clip_section(*, name: str, record: AnalysisRecord) -> str:
    summary = record.summary.strip() if isinstance(record.summary, str) else None
    summary_text = summary or "No summary available."

    lines = [f"{name} (clip_id={record.clip_id})", f"Summary: {summary_text}"]

    lines.append("Key moments:")
    for line in _iter_moment_lines(record.moments):
        lines.append(line)
    if len(lines) == 3:  # no moment lines appended
        lines.append("- No notable moments recorded.")

    label_counts = Counter(_safe_label(moment.label) for moment in record.moments if moment.label)
    if label_counts:
        formatted = ", ".join(f"{label}={count}" for label, count in sorted(label_counts.items()))
        lines.append(f"Label counts: {formatted}")

    severity_counts = Counter(moment.severity for moment in record.moments if moment.severity)
    if severity_counts:
        formatted = ", ".join(
            f"{severity}={count}" for severity, count in sorted(severity_counts.items())
        )
        lines.append(f"Severity counts: {formatted}")

    return "\n".join(lines)


def _iter_moment_lines(moments: Sequence[Moment], *, limit: int = 6) -> Iterable[str]:
    for index, moment in enumerate(sorted(moments, key=lambda item: item.start_s)):
        if index >= limit:
            break
        start = _format_timestamp(moment.start_s)
        end = _format_timestamp(moment.end_s)
        label = _safe_label(moment.label)
        severity = moment.severity
        yield f"- {start}-{end} {label} (Severity: {severity})"


def _format_timestamp(value: float) -> str:
    seconds = max(0.0, float(value))
    minutes = int(seconds // 60)
    remainder = seconds - minutes * 60
    rounded = round(remainder, 2)
    if math.isclose(rounded, round(rounded), abs_tol=1e-3):
        whole = int(round(rounded))
        return f"{minutes:02d}:{whole:02d}"
    formatted = f"{minutes:02d}:{rounded:05.2f}"
    return formatted.rstrip("0").rstrip(".")


def _safe_label(label: str) -> str:
    if not isinstance(label, str):
        return "Unknown event"
    cleaned = label.strip()
    return cleaned or "Unknown event"


def _normalize_answer(candidate: Any) -> ComparisonAnswer:
    if isinstance(candidate, str):
        normalized = candidate.strip().lower()
        for option in ComparisonAnswer:
            if option.value == normalized:
                return option
    return ComparisonAnswer.UNCERTAIN


def _normalize_explanation(candidate: Any) -> str:
    if isinstance(candidate, str):
        stripped = candidate.strip()
        if stripped:
            return stripped
    return "No explanation provided."


def _normalize_evidence(candidate: Any) -> list[ReasoningEvidence]:
    if not isinstance(candidate, Sequence):
        return []

    evidence: list[ReasoningEvidence] = []
    for item in candidate:
        if not isinstance(item, dict):
            continue
        clip = item.get("clip_id")
        try:
            clip_id = UUID(str(clip))
        except (TypeError, ValueError):
            continue
        label = item.get("label")
        if not isinstance(label, str) or not label.strip():
            continue
        timestamp_range = _normalize_timestamp_range(item.get("timestamp_range"))
        description = item.get("description")
        if isinstance(description, str):
            description = description.strip() or None
        else:
            description = None
        evidence.append(
            ReasoningEvidence(
                clip_id=clip_id,
                label=label.strip(),
                timestamp_range=timestamp_range,
                description=description,
            )
        )
    return evidence


def _normalize_timestamp_range(candidate: Any) -> tuple[float, float] | None:
    if not isinstance(candidate, Sequence) or len(candidate) != 2:
        return None
    try:
        start = float(candidate[0])
        end = float(candidate[1])
    except (TypeError, ValueError):
        return None
    return (start, end)


def _normalize_metrics(candidate: Any) -> ReasoningMetrics | None:
    if not isinstance(candidate, dict):
        return None

    counts_source = candidate.get("counts_by_label")
    severity_source = candidate.get("severity_distribution")

    counts = _coerce_int_mapping(counts_source)
    severity = _coerce_float_mapping(severity_source)

    if not counts and not severity:
        return None

    return ReasoningMetrics(
        counts_by_label=counts,
        severity_distribution=severity,
    )


def _coerce_int_mapping(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    result: dict[str, int] = {}
    for key, raw in value.items():
        if not isinstance(key, str):
            continue
        try:
            number = float(raw)
        except (TypeError, ValueError):
            continue
        result[key] = int(round(number))
    return result


def _coerce_float_mapping(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    result: dict[str, float] = {}
    for key, raw in value.items():
        if not isinstance(key, str):
            continue
        try:
            number = float(raw)
        except (TypeError, ValueError):
            continue
        result[key] = float(number)
    return result


def _normalize_confidence(candidate: Any) -> float | None:
    try:
        value = float(candidate)
    except (TypeError, ValueError):
        return None
    if value != value:  # NaN guard
        return None
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value


__all__ = [
    "build_compare_prompt",
    "normalize_compare_response",
    "DEFAULT_COMPARE_SYSTEM_PROMPT",
    "ReasoningClientProtocol",
    "CompareService",
    "DuplicateClipSelectionError",
    "MissingAnalysisError",
]

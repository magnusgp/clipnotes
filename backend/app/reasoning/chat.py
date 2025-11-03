"""Chat reasoning service for follow-up questions and history persistence."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Iterable, Sequence
from uuid import UUID

from backend.app.core.logging import get_logger, latency_timer
from backend.app.models.reasoning import (
    ReasoningChatResponse,
    ReasoningEvidence,
    ReasoningHistoryEntry,
    ReasoningHistoryResponse,
)
from backend.app.reasoning.compare import MissingAnalysisError, ReasoningClientProtocol
from backend.app.reasoning.store import ReasoningHistoryRecord, ReasoningHistoryStore
from backend.app.store.base import AnalysisRecord, ClipStore, Moment

DEFAULT_CHAT_SYSTEM_PROMPT = (
    "You are ClipNotes, a maritime operations analyst continuing a conversation about "
    "stored clip analyses. Use the provided summaries, key moments, and prior answers to "
    "deliver concise follow-up responses with clear evidence."
)


def compute_clip_selection_hash(clip_ids: Sequence[UUID]) -> str:
    """Deterministically hash selected clip IDs for history lookups."""

    unique = sorted({str(value) for value in clip_ids})
    digest = hashlib.sha256("|".join(unique).encode("utf-8")).hexdigest()
    return digest


def build_chat_prompt(
    *,
    message: str,
    analyses: Sequence[AnalysisRecord],
    history: Sequence[ReasoningHistoryRecord],
    system_prompt: str,
) -> str:
    """Render a structured prompt containing clip context and conversational history."""

    sections: list[str] = []
    trimmed_prompt = system_prompt.strip()
    if trimmed_prompt:
        sections.append(trimmed_prompt)

    sections.append(_render_clip_context(analyses))

    if history:
        sections.append("Conversation so far:")
        for entry in history:
            question = entry.question.strip()
            answer_text = entry.answer.answer.strip()
            if not question and not answer_text:
                continue
            sections.append(f"Q: {question}\nA: {answer_text}")

    sections.append("New question:")
    sections.append(message.strip())

    sections.append(
        (
            "Respond with a JSON object containing: answer (string), created_at (ISO-8601), "
            "evidence (list with clip_id, label, timestamp_range [start, end], description), "
            "and clips (array of UUIDs referenced in the response)."
        )
    )

    return "\n\n".join(section for section in sections if section)


def normalize_chat_response(
    payload: dict[str, Any],
    *,
    default_clips: Sequence[UUID],
) -> ReasoningChatResponse:
    """Normalize Hafnia chat responses into the internal schema."""

    answer = _coerce_answer(payload.get("answer"))
    created_at = _coerce_datetime(payload.get("created_at"))
    evidence = _coerce_evidence(payload.get("evidence"))
    clip_values = _coerce_clip_ids(payload.get("clips"))

    clips = clip_values or list(default_clips)

    return ReasoningChatResponse(
        answer=answer,
        created_at=created_at,
        evidence=evidence or None,
        clips=clips,
    )


class ChatService:
    """Coordinates chat-style reasoning interactions and persistence."""

    def __init__(
        self,
        *,
        store: ClipStore,
        history_store: ReasoningHistoryStore,
        client: ReasoningClientProtocol,
        system_prompt: str | None = None,
        history_limit: int = 20,
    ) -> None:
        self._store = store
        self._history_store = history_store
        self._client = client
        self._history_limit = history_limit
        self._system_prompt = system_prompt or DEFAULT_CHAT_SYSTEM_PROMPT
        self._logger = get_logger("reasoning.chat")

    async def ask(self, *, clips: Sequence[UUID], message: str) -> ReasoningChatResponse:
        cleaned_message = message.strip()
        if not cleaned_message:
            raise ValueError("message must be a non-empty string")

        clip_ids = _normalize_clip_ids_sequence(clips)
        if not clip_ids:
            raise ValueError("clips must contain at least one clip identifier")

        analyses = await self._gather_analyses(clip_ids)
        selection_hash = compute_clip_selection_hash(clip_ids)

        history = await self._history_store.list_recent(
            clip_selection_hash=selection_hash,
            clip_id=None,
            limit=self._history_limit,
        )

        prompt = build_chat_prompt(
            message=cleaned_message,
            analyses=analyses,
            history=history,
            system_prompt=self._system_prompt,
        )

        with latency_timer("reasoning.chat", logger=self._logger) as duration:
            payload = await self._client.request_reasoning(
                system_prompt=self._system_prompt,
                prompt=prompt,
            )

        response = normalize_chat_response(payload, default_clips=clip_ids)

        persisted = await self._history_store.persist_entry(
            clip_selection_hash=selection_hash,
            clip_ids=clip_ids,
            question=cleaned_message,
            answer=response,
            answer_type="chat",
        )

        self._logger.info(
            "chat exchange recorded",
            extra={
                "clip_selection_hash": selection_hash,
                "clip_ids": [str(item) for item in clip_ids],
                "latency_ms": duration(),
                "history_length": len(history) + 1,
            },
        )

        return persisted.answer

    async def history(
        self,
        *,
        clip_selection_hash: str | None,
        clip_id: UUID | None,
        limit: int = 20,
    ) -> ReasoningHistoryResponse:
        entries = await self._history_store.list_recent(
            clip_selection_hash=clip_selection_hash,
            clip_id=clip_id,
            limit=limit,
        )

        items = [
            ReasoningHistoryEntry(
                id=record.id,
                clip_ids=record.clip_ids,
                question=record.question,
                answer=record.answer,
                answer_type=record.answer_type,
                created_at=record.created_at,
            )
            for record in entries
        ]
        return ReasoningHistoryResponse(items=items)

    async def _gather_analyses(self, clip_ids: Sequence[UUID]) -> list[AnalysisRecord]:
        analyses: list[AnalysisRecord] = []
        for clip_id in clip_ids:
            analysis = await self._store.get_latest_analysis(clip_id)
            if analysis is None:
                raise MissingAnalysisError(clip_id)
            analyses.append(analysis)
        return analyses


def _normalize_clip_ids_sequence(clips: Sequence[UUID]) -> list[UUID]:
    seen: set[UUID] = set()
    unique: list[UUID] = []
    for clip_id in clips:
        if clip_id not in seen:
            seen.add(clip_id)
            unique.append(clip_id)
    return unique


def _render_clip_context(analyses: Sequence[AnalysisRecord]) -> str:
    lines: list[str] = []
    label_prefix = ord("A")

    for index, record in enumerate(analyses, start=1):
        label = chr(label_prefix + index - 1)
        lines.append(f"Clip {label} (clip_id={record.clip_id})")

        summary = record.summary.strip() if isinstance(record.summary, str) else None
        lines.append(f"Summary: {summary or 'No summary available.'}")

        lines.append("Key moments:")
        moment_lines = list(_iter_moment_lines(record.moments))
        if moment_lines:
            lines.extend(moment_lines)
        else:
            lines.append("- No notable moments recorded.")

    return "\n".join(lines)


def _iter_moment_lines(moments: Sequence[Moment], *, limit: int = 6) -> Iterable[str]:
    for index, moment in enumerate(sorted(moments, key=lambda item: item.start_s)):
        if index >= limit:
            break
        start = _format_timestamp(moment.start_s)
        end = _format_timestamp(moment.end_s)
        label = _safe_label(moment.label)
        lines = f"- {start}-{end} {label} (Severity: {moment.severity})"
        yield lines


def _format_timestamp(value: float) -> str:
    seconds = max(0.0, float(value))
    minutes = int(seconds // 60)
    remainder = seconds - minutes * 60
    rounded = round(remainder, 2)
    if round(rounded) == rounded:
        return f"{minutes:02d}:{int(rounded):02d}"
    return f"{minutes:02d}:{rounded:05.2f}".rstrip("0").rstrip(".")


def _safe_label(label: str | None) -> str:
    if not isinstance(label, str):
        return "Unknown event"
    cleaned = label.strip()
    return cleaned or "Unknown event"


def _coerce_answer(value: Any) -> str:
    if isinstance(value, str):
        trimmed = value.strip()
        if trimmed:
            return trimmed
    return "No answer provided."


def _coerce_datetime(value: Any) -> datetime:
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            parsed = None
        if isinstance(parsed, datetime):
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)

    return datetime.now(timezone.utc)


def _coerce_clip_ids(candidate: Any) -> list[UUID]:
    if not isinstance(candidate, Sequence):
        return []

    clip_ids: list[UUID] = []
    for value in candidate:
        try:
            clip_ids.append(UUID(str(value)))
        except (TypeError, ValueError):
            continue
    return clip_ids


def _coerce_evidence(candidate: Any) -> list[ReasoningEvidence]:
    if not isinstance(candidate, Sequence):
        return []

    items: list[ReasoningEvidence] = []
    for value in candidate:
        if not isinstance(value, dict):
            continue
        clip_identifier = value.get("clip_id")
        try:
            clip_id = UUID(str(clip_identifier))
        except (TypeError, ValueError):
            continue
        label = value.get("label")
        if not isinstance(label, str) or not label.strip():
            continue
        timestamp_range = value.get("timestamp_range")
        normalized_range = _coerce_timestamp_range(timestamp_range)
        description = value.get("description")
        if isinstance(description, str):
            description = description.strip() or None
        else:
            description = None
        items.append(
            ReasoningEvidence(
                clip_id=clip_id,
                label=label.strip(),
                timestamp_range=normalized_range,
                description=description,
            )
        )
    return items


def _coerce_timestamp_range(candidate: Any) -> tuple[float, float] | None:
    if not isinstance(candidate, Sequence) or len(candidate) != 2:
        return None
    try:
        start = float(candidate[0])
        end = float(candidate[1])
    except (TypeError, ValueError):
        return None
    return (start, end)


__all__ = [
    "ChatService",
    "DEFAULT_CHAT_SYSTEM_PROMPT",
    "build_chat_prompt",
    "compute_clip_selection_hash",
    "normalize_chat_response",
]

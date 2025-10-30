from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import UploadFile

from backend.app.core.logging import get_logger, latency_timer
from backend.app.models.schemas import SummaryJson, SummaryResponse
from backend.app.services.hafnia_client import HafniaClient


DEFAULT_SYSTEM_PROMPT = (
    "You are ClipNotes, a helpful assistant that distils marine training"
    " videos into short, actionable bullet points. Focus on key actions,"
    " safety procedures, and compliance call-outs. Provide concise,"
    " plain-language bullets and a JSON payload capturing metadata such"
    " as key_topics, safety_level, and recommended_actions."
)


class Summarizer:
    """Primary orchestration surface for the Hafnia summarisation flow."""

    def __init__(
        self,
        *,
        client: HafniaClient,
        system_prompt: str | None = None,
    ) -> None:
        self._client = client
        self._system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        self._logger = get_logger("summarizer")

    async def process(self, upload_file: UploadFile) -> SummaryResponse:
        """Run the end-to-end summarisation flow for an uploaded video."""

        submission_id = str(uuid4())

        with latency_timer("hafnia.summary", logger=self._logger) as duration:
            asset_id = await self._client.upload_asset(upload_file)
            raw_payload = await self._client.request_summary(
                asset_id=asset_id,
                prompt=self._system_prompt,
            )

        bullets, structured = normalize_summary_payload(raw_payload)
        latency_ms = duration()
        completed_at = datetime.now(timezone.utc)

        self._logger.info(
            "generated summary",
            extra={"submission_id": submission_id, "latency_ms": latency_ms},
        )

        summary_json = SummaryJson(data=structured) if structured else None

        return SummaryResponse(
            submission_id=submission_id,
            summary=bullets or ["No summary available."],
            structured_summary=summary_json,
            latency_ms=latency_ms,
            completed_at=completed_at,
        )


def normalize_summary_payload(payload: dict[str, Any]) -> tuple[list[str], dict[str, Any] | None]:
    """Normalize the raw Hafnia payload into structured bullets + JSON data."""

    bullets = _extract_bullets(payload)
    structured = payload.get("structured_summary")

    if structured is not None and not isinstance(structured, dict):
        structured = None

    return bullets, structured


def _extract_bullets(payload: dict[str, Any]) -> list[str]:
    candidate = payload.get("bullets")
    if isinstance(candidate, str):
        candidate = _split_bullets(candidate)
    elif isinstance(candidate, list):
        candidate = [str(item).strip() for item in candidate if str(item).strip()]

    if candidate:
        return candidate

    summary = payload.get("summary") or payload.get("text")
    if isinstance(summary, str):
        return _split_bullets(summary)
    if isinstance(summary, list):
        return [str(item).strip() for item in summary if str(item).strip()]

    return []


def _split_bullets(text: str) -> list[str]:
    parts = [segment.strip(" \t\r\n-•") for segment in text.splitlines()]
    bullets = [segment for segment in parts if segment]
    if len(bullets) > 1:
        return bullets

    sentence_parts = [
        part.strip()
        for part in re.split(r"(?<=\.)\s+", text.strip())
        if part.strip()
    ]
    if len(sentence_parts) > 1:
        return sentence_parts

    return bullets

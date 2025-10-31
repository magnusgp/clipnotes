from __future__ import annotations

import json
from dataclasses import replace
from typing import Any, Protocol, Sequence, cast
from uuid import UUID

import httpx

from backend.app.core.config import Settings, get_settings
from backend.app.core.logging import get_logger, latency_timer
from backend.app.services.hafnia_client import HafniaClientError
from backend.app.store import AnalysisPayload, Moment


class HafniaAnalysisClientProtocol(Protocol):
    """Protocol describing the ClipNotes Hafnia analysis surface."""

    async def analyze_clip(
        self,
        *,
        clip_id: UUID,
        asset_id: str,
        filename: str,
        prompt: str | None = None,
    ) -> AnalysisPayload:
        """Trigger Hafnia analysis for a clip and normalize the payload."""


class HafniaAnalysisClient:
    """HTTP-aware Hafnia analysis client using the public API surface."""

    _SYSTEM_PROMPT = (
        "You are ClipNotes, a maritime safety analyst. Return JSON summaries "
        "with key incidents and timeline moments for dashboards."
    )

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._settings = settings or get_settings()
        self._timeout = timeout
        self._logger = get_logger("hafnia.analysis")

    async def analyze_clip(
        self,
        *,
        clip_id: UUID,
        asset_id: str,
        filename: str,
        prompt: str | None = None,
    ) -> AnalysisPayload:
        """Call Hafnia to analyse the referenced clip."""
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": self._SYSTEM_PROMPT,
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": self._build_user_prompt(
                            filename=filename,
                            prompt=prompt,
                            asset_id=asset_id,
                        ),
                    },
                    {
                        "type": "asset_id",
                        "asset_id": asset_id,
                    },
                ],
            },
        ]

        request_payload: dict[str, Any] = {
            "messages": messages,
            "temperature": 0.1,
        }

        with latency_timer("hafnia.analysis", logger=self._logger) as elapsed:
            try:
                async with httpx.AsyncClient(
                    base_url=str(self._settings.hafnia_base_url),
                    timeout=self._timeout,
                ) as client:
                    response = await client.post(
                        "/chat/completions",
                        json=request_payload,
                        headers={
                            **self._settings.headers,
                            "Content-Type": "application/json",
                        },
                    )
                response.raise_for_status()
            except httpx.HTTPError as exc:  # pragma: no cover - network failure
                raise HafniaClientError("Failed to request Hafnia analysis") from exc

        latency_ms = int(elapsed())
        data = response.json()

        (
            summary,
            moments_payload,
            error_code,
            error_message,
        ) = self._parse_completion_payload(data)

        moments = self._normalize_moments(moments_payload)

        analysis_payload = AnalysisPayload(
            summary=summary,
            moments=moments,
            raw=data if isinstance(data, dict) else {"data": data},
            latency_ms=data.get("latency_ms") if isinstance(data, dict) else latency_ms,
            prompt=prompt,
            error_code=error_code,
            error_message=error_message,
        )

        if analysis_payload.latency_ms is None:
            analysis_payload = replace(analysis_payload, latency_ms=latency_ms)

        if analysis_payload.error_code or analysis_payload.error_message:
            self._logger.warning(
                "hafnia analysis reported error",
                extra={
                    "clip_id": str(clip_id),
                    "code": analysis_payload.error_code,
                },
            )
        else:
            self._logger.info(
                "hafnia analysis completed",
                extra={
                    "clip_id": str(clip_id),
                    "latency_ms": analysis_payload.latency_ms,
                },
            )

        return analysis_payload

    @staticmethod
    def _build_user_prompt(*, filename: str, prompt: str | None, asset_id: str) -> str:
        base = (
            "Review the referenced maritime training clip and respond with a single JSON object matching exactly:\n"
            "{\n"
            '  "summary": "Two clear sentences highlighting safety or mission-critical events.",\n'
            '  "moments": [\n'
            '    {"start_s": number, "end_s": number, "label": "short title", "severity": "low|medium|high"}\n'
            "  ]\n"
            "}\n"
            "Rules:\n"
            "- Always return valid JSON with double quotes and no trailing commentary.\n"
            "- Provide at least three timeline moments; if the footage is calm, include contextual moments with severity \"low\" to summarise the timeline.\n"
            "- Never include Markdown, bullet lists, or text outside the JSON object.\n"
            "- Ensure start_s and end_s are seconds from video start and that severity reflects operational urgency."
        )

        details = f"The clip filename is {filename}. Hafnia asset id: {asset_id}."
        if prompt:
            details += f" Operator prompt: {prompt.strip()}"

        return f"{base}\n{details}"

    @staticmethod
    def _normalize_moments(candidate: object) -> Sequence[Moment]:
        if not isinstance(candidate, Sequence) or isinstance(candidate, (str, bytes, bytearray)):
            return []

        normalized: list[Moment] = []
        for item in candidate:
            if not isinstance(item, dict):
                continue
            try:
                mapping: dict[str, Any] = dict(item)
                start_s = float(mapping.get("start_s", 0.0))
                end_s = float(mapping.get("end_s", 0.0))
                label = str(mapping.get("label", "")).strip() or "moment"
                severity = str(mapping.get("severity", "medium")).strip().lower()
                if severity not in {"low", "medium", "high"}:
                    severity = "medium"
                normalized.append(
                    Moment(
                        start_s=start_s,
                        end_s=end_s,
                        label=label,
                        severity=severity,  # type: ignore[arg-type]
                    )
                )
            except Exception:  # pragma: no cover - defensive against malformed payloads
                continue
        return normalized

    @staticmethod
    def _to_optional_str(value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return str(value)

    def _parse_completion_payload(
        self,
        payload: object,
    ) -> tuple[str | None, Sequence[dict[str, Any]], str | None, str | None]:
        summary: str | None = None
        moments: Sequence[dict[str, Any]] = []
        error_code: str | None = None
        error_message: str | None = None

        if not isinstance(payload, dict):
            return summary, moments, error_code, error_message
        mapping = cast(dict[str, Any], payload)

        choices = mapping.get("choices")
        if isinstance(choices, Sequence) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get("message")
                text_content = self._extract_text_from_message(message)
                if text_content:
                    parsed = self._extract_json_block(text_content)
                    if parsed is not None:
                        summary = self._to_optional_str(parsed.get("summary"))
                        candidate_moments = parsed.get("moments")
                        if isinstance(candidate_moments, Sequence):
                            moments = candidate_moments

                        error_section = parsed.get("error")
                        if isinstance(error_section, dict):
                            error_code = self._to_optional_str(error_section.get("code"))
                            error_message = self._to_optional_str(error_section.get("message"))
                    elif summary is None:
                        summary = text_content

        if summary is None:
            summary = self._to_optional_str(mapping.get("summary"))

        if not error_code:
            error = mapping.get("error")
            if isinstance(error, dict):
                error_code = self._to_optional_str(error.get("code")) or "hafnia_error"
                error_message = self._to_optional_str(error.get("message"))

        return summary, moments, error_code, error_message

    @staticmethod
    def _extract_text_from_message(message: object) -> str | None:
        if not isinstance(message, dict):
            return None
        mapping = cast(dict[str, Any], message)

        texts: list[str] = []
        content = mapping.get("content")
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text":
                    text = item.get("text")
                    if isinstance(text, str) and text.strip():
                        texts.append(text.strip())
        elif isinstance(content, str) and content.strip():
            texts.append(content.strip())

        fallback_text = mapping.get("text")
        if isinstance(fallback_text, str) and fallback_text.strip():
            texts.append(fallback_text.strip())

        if not texts:
            return None

        return "\n".join(texts)

    @staticmethod
    def _extract_json_block(text: str) -> dict[str, Any] | None:
        text = text.strip()
        if not text:
            return None

        try:
            candidate = json.loads(text)
            if isinstance(candidate, dict):
                return candidate
        except json.JSONDecodeError:
            pass

        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None

        snippet = text[start : end + 1]
        try:
            candidate = json.loads(snippet)
        except json.JSONDecodeError:
            return None

        if isinstance(candidate, dict):
            return candidate
        return None


class FakeHafniaClient:
    """Deterministic fake used in tests and local development."""

    def __init__(
        self,
        *,
        latency_ms: int | None = None,
        default_moments: Sequence[Moment] | None = None,
    ) -> None:
        self._latency_ms = latency_ms or 2800
        self._default_moments = list(default_moments) if default_moments else [
            Moment(start_s=0.0, end_s=5.5, label="introduction", severity="low"),
            Moment(start_s=5.5, end_s=15.0, label="core maneuver", severity="high"),
        ]
        self._next_error: dict[str, object] | None = None
        self._logger = get_logger("hafnia.fake")

    def set_next_error(
        self,
        *,
        code: str,
        message: str,
        latency_ms: int | None = None,
    ) -> None:
        self._next_error = {
            "code": code.strip() if code else "hafnia_error",
            "message": message,
            "latency_ms": latency_ms,
        }

    async def analyze_clip(
        self,
        *,
        clip_id: UUID,
        asset_id: str,
        filename: str,
        prompt: str | None = None,
    ) -> AnalysisPayload:
        payload_latency = self._latency_ms
        summary: str | None = f"Analysis for {filename} completed successfully."
        moments = [replace(moment) for moment in self._default_moments]
        error_code: str | None = None
        error_message: str | None = None
        status = "success"

        if self._next_error is not None:
            error_code = str(self._next_error.get("code") or "hafnia_error")
            error_message = str(self._next_error.get("message") or "Hafnia error")
            status = "error"
            summary = None
            moments = []
            override_latency = self._next_error.get("latency_ms")
            if isinstance(override_latency, int):
                payload_latency = override_latency
            self._next_error = None

        raw_payload: dict[str, object] = {
            "clip_id": str(clip_id),
            "asset_id": asset_id,
            "filename": filename,
            "status": status,
            "moments": [
                {
                    "start_s": moment.start_s,
                    "end_s": moment.end_s,
                    "label": moment.label,
                    "severity": moment.severity,
                }
                for moment in moments
            ],
            "latency_ms": payload_latency,
        }
        if prompt:
            raw_payload["prompt"] = prompt
        if error_code:
            raw_payload["error_code"] = error_code
        if error_message:
            raw_payload["error_message"] = error_message

        self._logger.info(
            "fake hafnia %s",
            status,
            extra={"clip_id": str(clip_id), "latency_ms": payload_latency},
        )

        return AnalysisPayload(
            summary=summary,
            moments=moments,
            raw=raw_payload,
            latency_ms=payload_latency,
            prompt=prompt,
            error_code=error_code,
            error_message=error_message,
        )


__all__ = [
    "FakeHafniaClient",
    "HafniaAnalysisClient",
    "HafniaAnalysisClientProtocol",
    "HafniaClientError",
]

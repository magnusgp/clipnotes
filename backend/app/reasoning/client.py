from __future__ import annotations

import json
import re
import textwrap
from typing import Any

import httpx

from backend.app.core.config import Settings, get_settings
from backend.app.core.logging import get_logger, latency_timer
from backend.app.reasoning.compare import ReasoningClientProtocol
from backend.app.services.hafnia_client import HafniaClientError


class HafniaReasoningClient(ReasoningClientProtocol):
    """HTTP client that sends comparative reasoning prompts to Hafnia."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        timeout: float = 45.0,
        temperature: float = 0.2,
    ) -> None:
        self._settings = settings or get_settings()
        self._timeout = timeout
        self._temperature = temperature
        self._logger = get_logger("hafnia.reasoning")

    async def request_reasoning(
        self, *, system_prompt: str, prompt: str
    ) -> dict[str, Any]:
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": system_prompt,
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        }
                    ],
                }
            ],
            "temperature": self._temperature,
            "response_format": {"type": "json_object"},
        }

        with latency_timer("hafnia.reasoning", logger=self._logger) as elapsed:
            try:
                async with httpx.AsyncClient(
                    base_url=str(self._settings.hafnia_base_url),
                    timeout=self._timeout,
                ) as client:
                    response = await client.post(
                        "/chat/completions",
                        json=payload,
                        headers={
                            **self._settings.headers,
                            "Content-Type": "application/json",
                        },
                    )
                response.raise_for_status()
            except httpx.HTTPError as exc:  # pragma: no cover - network failure
                raise HafniaClientError(
                    "Hafnia comparative reasoning request failed"
                ) from exc

        data = response.json()
        parsed, raw_text = self._extract_payload(data)

        self._logger.info(
            "hafnia reasoning response",
            extra={
                "latency_ms": elapsed(),
                "has_json": parsed is not None,
            },
        )

        if parsed is not None:
            return parsed

        if raw_text:
            structured = self._parse_structured_text(raw_text)
            preview = raw_text[:500]
            self._logger.warning(
                "hafnia reasoning returned non-json payload preview=%s",
                preview,
            )
            if structured is not None:
                return structured

            flattened = " ".join(raw_text.strip().split())
            excerpt = textwrap.shorten(flattened, width=280, placeholder="…") if flattened else ""
            explanation = (
                "Reasoning service returned an unexpected format. "
                "Preview: " + excerpt
            ).strip()
            return {
                "answer": "uncertain",
                "explanation": explanation,
                "evidence": [],
                "confidence": 0.0,
            }

        self._logger.error(
            "hafnia reasoning response missing parseable content",
            extra={"payload_preview": str(data)[:2000]},
        )
        return {
            "answer": "uncertain",
            "explanation": (
                "Reasoning service did not return an interpretable answer. "
                "Please retry the request."
            ),
            "evidence": [],
            "confidence": 0.0,
        }

    @staticmethod
    def _parse_json_snippet(text: str) -> dict[str, Any] | None:
        text = text.strip()
        if not text:
            return None
        candidate = HafniaReasoningClient._loads_relaxed(text)
        if isinstance(candidate, dict):
            return candidate

        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None

        snippet = text[start : end + 1]
        candidate = HafniaReasoningClient._loads_relaxed(snippet)
        if isinstance(candidate, dict):
            return candidate
        return None

    @staticmethod
    def _loads_relaxed(text: str) -> Any:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            sanitized = text
            for _ in range(3):  # keep attempts bounded
                updated = _RELAX_JSON_TRAILING_COMMAS.sub("", sanitized)
                if updated == sanitized:
                    break
                sanitized = updated
                try:
                    return json.loads(sanitized)
                except json.JSONDecodeError:
                    continue
            return None

    def _extract_payload(
        self, payload: Any
    ) -> tuple[dict[str, Any] | None, str | None]:
        if isinstance(payload, dict):
            if self._looks_complete(payload):
                return payload, None

            choices = payload.get("choices")
            if isinstance(choices, list) and choices:
                first = choices[0]
                if isinstance(first, dict):
                    text = self._extract_text_from_choice(first)
                    if text:
                        parsed = self._parse_json_snippet(text)
                        if parsed is not None:
                            return parsed, text
                        return None, text

            for key in ("message", "output_text", "output", "content"):
                text = payload.get(key)
                if not isinstance(text, str):
                    continue
                parsed = self._parse_json_snippet(text)
                if parsed is not None:
                    return parsed, text
                return None, text

        if isinstance(payload, str):
            parsed = self._parse_json_snippet(payload)
            if parsed is not None:
                return parsed, payload
            return None, payload

        return None, None

    @staticmethod
    def _looks_complete(candidate: dict[str, Any]) -> bool:
        required = {"answer", "explanation", "evidence"}
        return required.issubset(candidate.keys())

    @staticmethod
    def _extract_text_from_choice(choice: dict[str, Any]) -> str | None:
        message = choice.get("message")
        text = HafniaReasoningClient._extract_text_from_message(message)
        if text:
            return text

        delta = choice.get("delta")
        text = HafniaReasoningClient._extract_text_from_message(delta)
        if text:
            return text

        for key in ("text", "output_text"):
            content = choice.get(key)
            if isinstance(content, str) and content.strip():
                return content.strip()

        return None

    @staticmethod
    def _parse_structured_text(text: str) -> dict[str, Any] | None:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            return None

        answer_value: str | None = None
        explanation_parts: list[str] = []
        confidence_value: float | None = None

        for line in lines:
            lowered = line.lower()
            if lowered.startswith("answer"):
                value = line.split(":", 1)[1].strip() if ":" in line else line[6:].strip()
                answer_value = value
                continue
            if lowered.startswith("explanation"):
                value = line.split(":", 1)[1].strip() if ":" in line else line[11:].strip()
                explanation_parts.append(value)
                continue
            if lowered.startswith("confidence"):
                value_raw = line.split(":", 1)[1].strip() if ":" in line else line[10:].strip()
                if value_raw.endswith("%"):
                    try:
                        confidence_value = float(value_raw.rstrip("%")) / 100.0
                    except ValueError:
                        confidence_value = None
                else:
                    try:
                        confidence_value = float(value_raw)
                        if confidence_value > 1:
                            confidence_value = min(confidence_value / 100.0, 1.0)
                    except ValueError:
                        confidence_value = None
                continue
            explanation_parts.append(line)

        if not answer_value and not explanation_parts:
            return None

        normalized_answer = HafniaReasoningClient._normalize_answer(answer_value)
        explanation = "\n".join(explanation_parts).strip() or None

        return {
            "answer": normalized_answer,
            "explanation": explanation
            or "Reasoning service responded but the format was unstructured.",
            "evidence": [],
            "confidence": confidence_value if confidence_value is not None else 0.0,
        }

    @staticmethod
    def _normalize_answer(value: str | None) -> str:
        if not value:
            return "uncertain"

        cleaned = value.strip().lower()
        alias_map = {
            "clip a": "clip_a",
            "clip_a": "clip_a",
            "a": "clip_a",
            "clip b": "clip_b",
            "clip_b": "clip_b",
            "b": "clip_b",
            "tie": "equal",
            "equal": "equal",
            "similar": "equal",
            "uncertain": "uncertain",
            "unknown": "uncertain",
        }
        if cleaned in alias_map:
            return alias_map[cleaned]

        if "clip" in cleaned and "a" in cleaned and "b" not in cleaned:
            return "clip_a"
        if "clip" in cleaned and "b" in cleaned and "a" not in cleaned:
            return "clip_b"

        return "uncertain"

    @staticmethod
    def _extract_text_from_message(message: Any) -> str | None:
        if not isinstance(message, dict):
            return None

        content = message.get("content")
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") in {"text", "output_text"}:
                    text = item.get("text")
                    if isinstance(text, str) and text.strip():
                        return text.strip()
                if "text" in item and isinstance(item["text"], str) and item["text"].strip():
                    return item["text"].strip()
        elif isinstance(content, str) and content.strip():
            return content.strip()

        for key in ("text", "output_text"):
            text = message.get(key)
            if isinstance(text, str) and text.strip():
                return text.strip()

        return None


_RELAX_JSON_TRAILING_COMMAS = re.compile(r",(?=\s*[}\]])")


class FakeReasoningClient(ReasoningClientProtocol):
    """Deterministic fake client returning canned comparative answers."""

    def __init__(self) -> None:
        self._logger = get_logger("hafnia.reasoning.fake")

    async def request_reasoning(
        self, *, system_prompt: str, prompt: str
    ) -> dict[str, Any]:
        self._logger.info(
            "fake reasoning invoked",
            extra={
                "prompt_preview": prompt[:80],
                "system_preview": system_prompt[:60],
            },
        )
        return {
            "answer": "equal",
            "explanation": (
                "Synthetic comparison generated by fake client. Review clips manually for details."
            ),
            "evidence": [],
            "confidence": 0.5,
        }



__all__ = ["HafniaReasoningClient", "FakeReasoningClient"]

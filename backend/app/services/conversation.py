from __future__ import annotations

from typing import Any, Tuple

from backend.app.core.logging import get_logger
from backend.app.models.schemas import ChatResponse
from backend.app.services.hafnia_client import HafniaClientError, HafniaClientProtocol
from backend.app.services.sessions import SessionNotFoundError, SessionRegistry

DEFAULT_CHAT_SYSTEM_PROMPT = (
    "You are ClipNotes, a concise maritime safety assistant. "
    "Answer follow-up questions about the previously analysed clip, "
    "highlighting safety issues or next actions when relevant."
)


class ConversationService:
    """Coordinates follow-up questions against Hafnia using stored session data."""

    def __init__(
        self,
        *,
        registry: SessionRegistry,
        client: HafniaClientProtocol,
        system_prompt: str | None = None,
    ) -> None:
        self._registry = registry
        self._client = client
        self._system_prompt = system_prompt or DEFAULT_CHAT_SYSTEM_PROMPT
        self._logger = get_logger("conversation")

    async def chat(self, submission_id: str, prompt: str) -> ChatResponse:
        session = self._registry.get(submission_id)

        payload = await self._client.request_follow_up(
            asset_id=session.asset_id,
            prompt=prompt,
            system_prompt=self._system_prompt,
        )

        message, completion_id = self._extract_message(payload)
        self._registry.update_completion(submission_id, completion_id)

        self._logger.info(
            "generated follow-up",
            extra={
                "submission_id": submission_id,
                "asset_id": session.asset_id,
                "completion_id": completion_id,
            },
        )

        return ChatResponse(
            submission_id=submission_id,
            asset_id=session.asset_id,
            message=message,
            completion_id=completion_id,
        )

    @staticmethod
    def _extract_message(payload: dict[str, Any]) -> Tuple[str, str | None]:
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                completion_id = ConversationService._extract_completion_id(payload, first_choice)
                message = ConversationService._extract_text_from_choice(first_choice)
                if message:
                    return message, completion_id

        if isinstance(payload, dict):
            message = payload.get("message") or payload.get("text")
            if isinstance(message, str) and message.strip():
                return message.strip(), payload.get("id") or payload.get("completion_id")

        raise HafniaClientError("Hafnia response missing chat message")

    @staticmethod
    def _extract_text_from_choice(choice: dict[str, Any]) -> str | None:
        message = choice.get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, list):
                for item in content:
                    if not isinstance(item, dict):
                        continue
                    if item.get("type") == "text":
                        text = item.get("text")
                        if isinstance(text, str) and text.strip():
                            return text.strip()
            if isinstance(content, str) and content.strip():
                return content.strip()
            text = message.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()

        text = choice.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()

        return None

    @staticmethod
    def _extract_completion_id(payload: dict[str, Any], choice: dict[str, Any]) -> str | None:
        potential_ids = [
            choice.get("id"),
            choice.get("completion_id"),
            payload.get("id"),
            payload.get("completion_id"),
        ]
        for candidate in potential_ids:
            if isinstance(candidate, str) and candidate:
                return candidate
        return None

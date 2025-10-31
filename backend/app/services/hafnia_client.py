from __future__ import annotations

import asyncio
from typing import Any, Protocol
from uuid import uuid4

import httpx
from fastapi import UploadFile

from backend.app.core.config import Settings, get_settings
from backend.app.core.logging import get_logger


class HafniaClientError(RuntimeError):
    """Base error for Hafnia client failures."""


class HafniaClientProtocol(Protocol):
    """Protocol describing the async Hafnia client surface used by ClipNotes."""

    async def upload_asset(self, upload: UploadFile) -> str:
        ...

    async def request_summary(self, asset_id: str, *, prompt: str) -> dict[str, Any]:
        ...

    async def request_follow_up(
        self,
        *,
        asset_id: str,
        prompt: str,
        system_prompt: str,
    ) -> dict[str, Any]:
        ...

    async def close(self) -> None:
        ...


class HafniaClient:
    """HTTP client wrapper for Hafnia VLM endpoints."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        timeout: float = 60.0,
        max_attempts: int = 3,
        backoff_base: float = 0.5,
    ) -> None:
        self._settings = settings or get_settings()
        self._timeout = timeout
        self._logger = get_logger("hafnia")
        self._max_attempts = max(1, max_attempts)
        self._backoff_base = max(0.0, backoff_base)

    async def upload_asset(self, upload: UploadFile) -> str:
        """Upload the provided video file and return the Hafnia asset identifier."""

        file_bytes = await upload.read()
        await upload.seek(0)

        files = {
            "file": (
                upload.filename or "clip.mp4",
                file_bytes,
                upload.content_type or "application/octet-stream",
            )
        }

        response = await self._post_with_retry(
            path="/assets",
            request_kwargs={
                "files": files,
                "headers": self._settings.headers,
            },
            error_message="Failed to upload asset to Hafnia",
        )

        payload = response.json()
        asset_id = self._extract_asset_id(payload)
        if not asset_id:
            raise HafniaClientError("Hafnia response missing asset identifier")
        self._logger.info("uploaded asset", extra={"asset_id": asset_id})
        return asset_id

    async def request_summary(self, asset_id: str, *, prompt: str) -> dict[str, Any]:
        """Trigger summarisation for a previously uploaded asset."""

        request_payload = {
            "messages": [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Create a structured summary with bullet highlights and JSON details.",
                        },
                        {
                            "type": "asset_id",
                            "asset_id": asset_id,
                        },
                    ],
                },
            ]
        }

        response = await self._post_with_retry(
            path="/chat/completions",
            request_kwargs={
                "json": request_payload,
                "headers": {
                    **self._settings.headers,
                    "Content-Type": "application/json",
                },
            },
            error_message="Hafnia summarisation request failed",
        )

        payload = response.json()
        self._logger.info(
            "received summary",
            extra={"asset_id": asset_id, "keys": list(payload.keys())},
        )
        return payload

    async def request_follow_up(
        self,
        *,
        asset_id: str,
        prompt: str,
        system_prompt: str,
    ) -> dict[str, Any]:
        """Request a follow-up completion for an existing asset."""

        request_payload = {
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
                        },
                        {
                            "type": "asset_id",
                            "asset_id": asset_id,
                        },
                    ],
                },
            ]
        }

        response = await self._post_with_retry(
            path="/chat/completions",
            request_kwargs={
                "json": request_payload,
                "headers": {
                    **self._settings.headers,
                    "Content-Type": "application/json",
                },
            },
            error_message="Hafnia follow-up request failed",
        )

        payload = response.json()
        self._logger.info(
            "received follow-up",
            extra={"asset_id": asset_id, "keys": list(payload.keys())},
        )
        return payload

    async def close(self) -> None:  # pragma: no cover - placeholder for pooling
        """Placeholder for future persistent client cleanup."""
        return None



    async def _post_with_retry(
        self,
        *,
        path: str,
        request_kwargs: dict[str, Any],
        error_message: str,
    ) -> httpx.Response:
        last_exc: Exception | None = None

        for attempt in range(1, self._max_attempts + 1):
            try:
                async with httpx.AsyncClient(
                    base_url=str(self._settings.hafnia_base_url),
                    timeout=self._timeout,
                ) as client:
                    response = await client.post(path, **request_kwargs)

                response.raise_for_status()
                if attempt > 1:
                    self._logger.info(
                        "hafnia request recovered",
                        extra={"path": path, "attempt": attempt},
                    )
                return response
            except httpx.HTTPError as exc:
                last_exc = exc
                response = getattr(exc, "response", None)
                response_text = None
                status_code = None
                if response is not None:
                    status_code = response.status_code
                    try:
                        response_text = response.text
                    except Exception:  # pragma: no cover - defensive
                        response_text = "<unavailable>"
                self._logger.warning(
                    "hafnia request failed (path=%s attempt=%s status=%s): %s",
                    path,
                    attempt,
                    status_code,
                    (response_text or str(exc))[:500],
                )
                if attempt < self._max_attempts and self._backoff_base:
                    await asyncio.sleep(self._backoff_base * (2 ** (attempt - 1)))

        raise HafniaClientError(error_message) from last_exc

    @staticmethod
    def _extract_asset_id(payload: dict[str, Any]) -> str | None:
        asset_id = payload.get("asset_id")
        if isinstance(asset_id, str) and asset_id:
            return asset_id
        if "id" in payload and isinstance(payload["id"], str):
            return payload["id"]
        if "asset" in payload and isinstance(payload["asset"], dict):
            asset = payload["asset"]
            asset_id = asset.get("id") or asset.get("asset_id")
            if isinstance(asset_id, str):
                return asset_id
        if "data" in payload and isinstance(payload["data"], dict):
            data = payload["data"]
            asset_id = data.get("id") or data.get("asset_id")
            if isinstance(asset_id, str):
                return asset_id
        return None


class FakeHafniaService(HafniaClientProtocol):
    """Deterministic fake client used when Hafnia is unavailable locally."""

    def __init__(self) -> None:
        self._logger = get_logger("hafnia.fake")
        self._assets: dict[str, dict[str, Any]] = {}

    async def upload_asset(self, upload: UploadFile) -> str:
        content = await upload.read()
        await upload.seek(0)
        asset_id = f"asset_{uuid4().hex}"
        self._assets[asset_id] = {
            "filename": upload.filename or "clip.mp4",
            "size": len(content),
        }
        self._logger.info(
            "fake upload",
            extra={"asset_id": asset_id, "bytes": len(content)},
        )
        return asset_id

    async def request_summary(self, asset_id: str, *, prompt: str) -> dict[str, Any]:
        asset = self._assets.get(asset_id)
        if asset is None:
            raise HafniaClientError("Unknown asset identifier in fake client")

        filename = asset["filename"]
        completion_id = f"cmp_{uuid4().hex}"
        bullets = [
            f"Summary generated for {filename}.",
            "Timeline review indicates routine docking with minor adjustments.",
            "Consider scheduling a peer review of the clip for compliance logging.",
        ]

        payload: dict[str, Any] = {
            "asset_id": asset_id,
            "completion_id": completion_id,
            "bullets": bullets,
            "summary": " ".join(bullets),
            "latency_ms": 1800,
            "structured_summary": {
                "key_topics": [
                    "Docking procedure",
                    "Crew coordination",
                    "Safety checks",
                ],
                "safety_level": "medium",
                "recommended_actions": [
                    "Review mooring line handling",
                    "Log maintenance follow-up",
                ],
            },
            "messages": [
                {
                    "role": "system",
                    "content": prompt,
                }
            ],
        }

        self._logger.info(
            "fake summary",
            extra={"asset_id": asset_id, "completion_id": completion_id},
        )
        return payload

    async def request_follow_up(
        self,
        *,
        asset_id: str,
        prompt: str,
        system_prompt: str,
    ) -> dict[str, Any]:
        asset = self._assets.get(asset_id)
        if asset is None:
            raise HafniaClientError("Unknown asset identifier in fake client")

        completion_id = f"cmp_{uuid4().hex}"
        message_text = (
            f"Follow-up for {asset['filename']}: focus on {prompt.strip() or 'the highlighted moments'}."
        )

        payload: dict[str, Any] = {
            "asset_id": asset_id,
            "completion_id": completion_id,
            "choices": [
                {
                    "id": completion_id,
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "type": "text",
                                "text": message_text,
                            }
                        ],
                    },
                }
            ],
            "system_prompt": system_prompt,
            "prompt": prompt,
        }

        self._logger.info(
            "fake follow-up",
            extra={"asset_id": asset_id, "completion_id": completion_id},
        )
        return payload

    async def close(self) -> None:  # pragma: no cover - parity with protocol
        return None

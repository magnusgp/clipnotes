from __future__ import annotations

from __future__ import annotations

from typing import Any

import httpx
from fastapi import UploadFile

from backend.app.core.config import Settings, get_settings
from backend.app.core.logging import get_logger


class HafniaClientError(RuntimeError):
    """Base error for Hafnia client failures."""


class HafniaClient:
    """HTTP client wrapper for Hafnia VLM endpoints."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._settings = settings or get_settings()
        self._timeout = timeout
        self._logger = get_logger("hafnia")

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

        async with httpx.AsyncClient(
            base_url=str(self._settings.hafnia_base_url),
            timeout=self._timeout,
        ) as client:
            response = await client.post(
                "/assets",
                files=files,
                headers=self._settings.headers,
            )

        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:  # pragma: no cover - runtime guard
            raise HafniaClientError("Failed to upload asset to Hafnia") from exc

        payload = response.json()
        asset_id = self._extract_asset_id(payload)
        if not asset_id:
            raise HafniaClientError("Hafnia response missing asset identifier")
        self._logger.info("uploaded asset", extra={"asset_id": asset_id})
        return asset_id

    async def request_summary(self, asset_id: str, *, prompt: str) -> dict[str, Any]:
        """Trigger summarisation for a previously uploaded asset."""

        request_payload = {
            "asset_id": asset_id,
            "prompt": prompt,
            "response_format": "json",
        }

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

        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:  # pragma: no cover - runtime guard
            raise HafniaClientError("Hafnia summarisation request failed") from exc

        payload = response.json()
        self._logger.info(
            "received summary",
            extra={"asset_id": asset_id, "keys": list(payload.keys())},
        )
        return payload

    async def close(self) -> None:  # pragma: no cover - placeholder for pooling
        """Placeholder for future persistent client cleanup."""
        return None

    @staticmethod
    def _extract_asset_id(payload: dict[str, Any]) -> str | None:
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

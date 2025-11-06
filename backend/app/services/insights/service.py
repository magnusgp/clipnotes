from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import urlsplit

from backend.app.models.insights import InsightResponse, InsightShareResponse, InsightWindow
from backend.app.services.insights.aggregator import InsightAggregator
from backend.app.services.insights.cache import InsightCache, CacheEntry
from backend.app.services.insights.generator import SummaryGenerator
from backend.app.services.insights.share_store import InsightShareStore
from backend.app.services.insights.validators import validate_window
from pydantic import ValidationError


class InsightService:
    """Coordinate aggregation, caching, and sharing for the Insight Layer."""

    def __init__(
        self,
        *,
        database_url: str,
        cache_ttl_seconds: int = 60,
        share_token_salt: str | None = None,
        share_base_url: str | None = None,
    ) -> None:
        self._database_url = database_url
        self._cache_ttl_seconds = cache_ttl_seconds
        self._aggregator = InsightAggregator(database_url)
        self._summary_generator = SummaryGenerator()
        self._cache = InsightCache(cache_ttl_seconds)
        self._share_store = InsightShareStore(database_url, share_token_salt)
        self._share_base_url = share_base_url

    @property
    def cache_ttl_seconds(self) -> int:
        return self._cache_ttl_seconds

    async def get_snapshot(self, window: InsightWindow | str, *, regenerate: bool = False) -> InsightResponse:
        window_value = validate_window(window)

        if regenerate:
            await self._cache.invalidate(window_value)

        entry = await self._cache.get_or_set(window_value, lambda: self._build_snapshot(window_value))
        return self._response_with_expiry(entry)

    async def regenerate_snapshot(self, window: InsightWindow) -> InsightResponse:
        return await self.get_snapshot(window, regenerate=True)

    async def create_share(self, window: InsightWindow, *, expires_at: datetime | None = None) -> InsightShareResponse:
        if self._share_store is None:
            raise RuntimeError("Insight sharing is not configured")

        window_value = validate_window(window)
        snapshot = await self.get_snapshot(window_value)
        payload = snapshot.model_dump(mode="json")

        token, _ = await self._share_store.create_share(
            window=window_value,
            payload=payload,
            cache_expires_at=expires_at or snapshot.cache_expires_at,
        )

        url = self._build_share_url(token)
        response = InsightShareResponse(
            token=token,
            url=url,
            window=window_value,
            generated_at=snapshot.generated_at,
            cache_expires_at=snapshot.cache_expires_at,
        )

        return response

    async def get_shared_snapshot(self, token: str, window: InsightWindow | None = None) -> InsightResponse:
        if self._share_store is None:
            raise RuntimeError("Insight sharing is not configured")

        record = await self._share_store.get_share(token)
        window_override = validate_window(window) if window else record.window
        if window_override != record.window:
            raise ValueError("Requested window does not match share token")

        try:
            snapshot = await self.get_snapshot(window_override)
        except Exception as exc:
            try:
                return InsightResponse.model_validate(record.payload)
            except ValidationError:
                raise exc

        await self._share_store.update_payload(
            token,
            payload=snapshot.model_dump(mode="json"),
            cache_expires_at=snapshot.cache_expires_at,
        )
        return snapshot

    async def _build_snapshot(self, window: InsightWindow) -> InsightResponse:
        aggregated = await self._aggregator.aggregate(window)
        summary = self._summary_generator.build_fallback(aggregated)
        return InsightResponse(
            window=aggregated.window,
            generated_at=aggregated.generated_at,
            summary=summary,
            summary_source="fallback",
            severity_totals=aggregated.severity_totals,
            series=aggregated.series,
            top_labels=aggregated.top_labels,
            delta=aggregated.delta,
            cache_expires_at=None,
        )

    def _response_with_expiry(self, entry: CacheEntry) -> InsightResponse:
        value = entry.value
        if isinstance(value, InsightResponse):
            response = value
        else:
            response = InsightResponse.model_validate(value)
            entry.value = response

        if response.cache_expires_at != entry.expires_at:
            # model_copy returns a new model, so update cached reference as well
            response = response.model_copy(update={"cache_expires_at": entry.expires_at})
            entry.value = response

        return response

    def _build_share_url(self, token: str) -> str:
        if not self._share_base_url:
            raise RuntimeError("Share base URL is not configured")
        parsed = urlsplit(self._share_base_url)
        if parsed.scheme and parsed.netloc:
            origin = f"{parsed.scheme}://{parsed.netloc}"
        else:
            origin = self._share_base_url.rstrip("/")
        return f"{origin}/share/{token}"

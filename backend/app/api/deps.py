from __future__ import annotations

from functools import lru_cache

from backend.app.core.config import get_settings
from backend.app.services.hafnia_client import HafniaClient
from backend.app.services.summarizer import Summarizer


@lru_cache(maxsize=1)
def _get_cached_summarizer() -> Summarizer:
    settings = get_settings()
    client = HafniaClient(settings=settings)
    return Summarizer(client=client)


def get_summarizer() -> Summarizer:
    return _get_cached_summarizer()

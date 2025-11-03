from __future__ import annotations

from typing import cast

import pytest
import httpx
from pydantic import HttpUrl

from backend.app.core.config import Settings
from backend.app.reasoning.client import HafniaReasoningClient


class _StubResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._payload


class _StubAsyncClient:
    def __init__(self, response):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *_args, **_kwargs):
        return self._response


@pytest.mark.asyncio
async def test_reasoning_client_parses_output_text_with_relaxed_json(monkeypatch):
    settings = Settings(
        hafnia_api_key="test-key",
        hafnia_base_url=cast(HttpUrl, "https://example.com"),
    )
    text = """
    {
      "answer": "clip_a",
      "explanation": "Clip A prevails.",
      "evidence": [
        {"clip_id": "11111111-1111-1111-1111-111111111111", "label": "Event", "timestamp_range": [0, 1],},
      ],
      "confidence": 0.9,
    }
    """
    response_payload = {
        "choices": [
            {
                "message": {
                    "content": [
                        {"type": "output_text", "text": text},
                    ]
                }
            }
        ]
    }
    stub = _StubResponse(response_payload)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: _StubAsyncClient(stub),
    )

    client = HafniaReasoningClient(settings=settings)
    result = await client.request_reasoning(system_prompt="prompt", prompt="question")

    assert result["answer"] == "clip_a"
    assert result["explanation"] == "Clip A prevails."
    assert result["confidence"] == 0.9


@pytest.mark.asyncio
async def test_reasoning_client_returns_uncertain_when_no_text(monkeypatch):
    settings = Settings(
        hafnia_api_key="test-key",
        hafnia_base_url=cast(HttpUrl, "https://example.com"),
    )
    response_payload = {
        "choices": [
            {
                "message": {
                    "content": [
                        {"type": "image", "image_url": "https://example.com/asset.png"},
                    ]
                }
            }
        ]
    }
    stub = _StubResponse(response_payload)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: _StubAsyncClient(stub),
    )

    client = HafniaReasoningClient(settings=settings)
    result = await client.request_reasoning(system_prompt="prompt", prompt="question")

    assert result["answer"] == "uncertain"
    assert "interpretable" in result["explanation"].lower()
    assert result["evidence"] == []
    assert result["confidence"] == 0.0


@pytest.mark.asyncio
async def test_reasoning_client_parses_string_content(monkeypatch):
    settings = Settings(
        hafnia_api_key="test-key",
        hafnia_base_url=cast(HttpUrl, "https://example.com"),
    )
    response_payload = {
        "choices": [
            {
                "message": {
                    "content": "{\n                        \"answer\": \"clip_b\",\n                        \"explanation\": \"Structured string content.\",\n                        \"evidence\": [],\n                        \"confidence\": 0.7\n                    }",
                }
            }
        ]
    }
    stub = _StubResponse(response_payload)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: _StubAsyncClient(stub),
    )

    client = HafniaReasoningClient(settings=settings)
    result = await client.request_reasoning(system_prompt="prompt", prompt="question")

    assert result["answer"] == "clip_b"
    assert result["explanation"] == "Structured string content."
    assert result["confidence"] == 0.7


@pytest.mark.asyncio
async def test_reasoning_client_handles_top_level_string(monkeypatch):
    settings = Settings(
        hafnia_api_key="test-key",
        hafnia_base_url=cast(HttpUrl, "https://example.com"),
    )
    payload = """
    {"answer": "clip_c", "explanation": "Top level string", "evidence": [], "confidence": 0.55}
    """
    stub = _StubResponse(payload)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: _StubAsyncClient(stub),
    )

    client = HafniaReasoningClient(settings=settings)
    result = await client.request_reasoning(system_prompt="prompt", prompt="question")

    assert result["answer"] == "clip_c"
    assert result["confidence"] == 0.55


@pytest.mark.asyncio
async def test_reasoning_client_parses_structured_text(monkeypatch):
    settings = Settings(
        hafnia_api_key="test-key",
        hafnia_base_url=cast(HttpUrl, "https://example.com"),
    )
    response_payload = {
        "choices": [
            {
                "message": {
                    "content": "Answer: Clip B\nExplanation: Clip B shows more sustained activity.\nConfidence: 78%",
                }
            }
        ]
    }
    stub = _StubResponse(response_payload)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: _StubAsyncClient(stub),
    )

    client = HafniaReasoningClient(settings=settings)
    result = await client.request_reasoning(system_prompt="prompt", prompt="question")

    assert result["answer"] == "clip_b"
    assert "sustained activity" in result["explanation"]
    assert pytest.approx(result["confidence"], rel=1e-2) == 0.78

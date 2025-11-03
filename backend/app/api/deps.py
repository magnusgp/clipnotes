from __future__ import annotations

from functools import lru_cache

from backend.app.core.config import get_settings
from backend.app.reasoning.chat import ChatService
from backend.app.reasoning.client import FakeReasoningClient, HafniaReasoningClient
from backend.app.reasoning.compare import CompareService, ReasoningClientProtocol
from backend.app.reasoning.store import ReasoningHistoryStore, SqlAlchemyReasoningHistoryStore
from backend.app.services.conversation import ConversationService
from backend.app.services.hafnia import FakeHafniaClient, HafniaAnalysisClient, HafniaAnalysisClientProtocol
from backend.app.services.hafnia_client import FakeHafniaService, HafniaClient, HafniaClientProtocol
from backend.app.services.sessions import SessionRegistry
from backend.app.services.summarizer import Summarizer
from backend.app.store import ClipStore, InMemoryStore, SqliteStore


@lru_cache(maxsize=1)
def _get_hafnia_service_client() -> HafniaClientProtocol:
    settings = get_settings()
    if settings.hafnia_use_fake:
        return FakeHafniaService()
    return HafniaClient(settings=settings)


@lru_cache(maxsize=1)
def _get_cached_summarizer() -> Summarizer:
    client = _get_hafnia_service_client()
    return Summarizer(client=client, registry=_get_session_registry())


def get_summarizer() -> Summarizer:
    return _get_cached_summarizer()


@lru_cache(maxsize=1)
def _get_session_registry() -> SessionRegistry:
    return SessionRegistry()


def get_session_registry() -> SessionRegistry:
    return _get_session_registry()


@lru_cache(maxsize=1)
def _get_store() -> ClipStore:
    settings = get_settings()
    database_url = settings.database_url.strip()

    if database_url.lower() in {
        "memory://",
        "sqlite:///:memory:",
        "sqlite+aiosqlite:///:memory:",
    }:
        return InMemoryStore()

    return SqliteStore(database_url)


def get_store() -> ClipStore:
    return _get_store()


@lru_cache(maxsize=1)
def _get_reasoning_history_store() -> ReasoningHistoryStore:
    settings = get_settings()
    return SqlAlchemyReasoningHistoryStore(settings.database_url)


def get_reasoning_history_store() -> ReasoningHistoryStore:
    return _get_reasoning_history_store()


@lru_cache(maxsize=1)
def _get_cached_conversation_service() -> ConversationService:
    client = _get_hafnia_service_client()
    return ConversationService(registry=_get_session_registry(), client=client)


def get_conversation_service() -> ConversationService:
    return _get_cached_conversation_service()


@lru_cache(maxsize=1)
def _get_reasoning_client() -> ReasoningClientProtocol:
    settings = get_settings()
    if settings.hafnia_use_fake:
        return FakeReasoningClient()
    return HafniaReasoningClient(settings=settings)


@lru_cache(maxsize=1)
def _get_compare_service() -> CompareService:
    return CompareService(store=_get_store(), client=_get_reasoning_client())


def get_compare_service() -> CompareService:
    return _get_compare_service()


@lru_cache(maxsize=1)
def _get_chat_service() -> ChatService:
    return ChatService(
        store=_get_store(),
        history_store=_get_reasoning_history_store(),
        client=_get_reasoning_client(),
    )


def get_chat_service() -> ChatService:
    return _get_chat_service()


@lru_cache(maxsize=1)
def _get_hafnia_client() -> HafniaAnalysisClientProtocol:
    settings = get_settings()
    if settings.hafnia_use_fake:
        return FakeHafniaClient()
    return HafniaAnalysisClient(settings=settings)


def get_hafnia_client() -> HafniaAnalysisClientProtocol:
    return _get_hafnia_client()


def get_hafnia_upload_client() -> HafniaClientProtocol:
    return _get_hafnia_service_client()

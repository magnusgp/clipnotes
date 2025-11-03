"""Reasoning package for comparative questions and chat history."""

from .chat import (
    ChatService,
    DEFAULT_CHAT_SYSTEM_PROMPT,
    build_chat_prompt,
    compute_clip_selection_hash,
    normalize_chat_response,
)
from .compare import (
    CompareService,
    DuplicateClipSelectionError,
    MissingAnalysisError,
    build_compare_prompt,
    normalize_compare_response,
)
from .store import ReasoningHistoryRecord, ReasoningHistoryStore, SqlAlchemyReasoningHistoryStore

__all__ = [
    "ChatService",
    "DEFAULT_CHAT_SYSTEM_PROMPT",
    "build_chat_prompt",
    "compute_clip_selection_hash",
    "normalize_chat_response",
    "CompareService",
    "DuplicateClipSelectionError",
    "MissingAnalysisError",
    "build_compare_prompt",
    "normalize_compare_response",
    "ReasoningHistoryRecord",
    "ReasoningHistoryStore",
    "SqlAlchemyReasoningHistoryStore",
]

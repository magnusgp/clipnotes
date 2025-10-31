from __future__ import annotations

from dataclasses import dataclass
from threading import RLock
from typing import Dict, Optional


class SessionNotFoundError(LookupError):
    """Raised when a requested submission does not exist in the registry."""

    def __init__(self, submission_id: str) -> None:
        self.submission_id = submission_id
        super().__init__(f"No session found for submission '{submission_id}'")


@dataclass(slots=True)
class SessionRecord:
    submission_id: str
    asset_id: str
    latest_completion_id: Optional[str] = None


class SessionRegistry:
    """In-memory registry that tracks uploaded assets for follow-up chats."""

    def __init__(self) -> None:
        self._records: Dict[str, SessionRecord] = {}
        self._lock = RLock()

    def record_summary(
        self,
        *,
        submission_id: str,
        asset_id: str,
        completion_id: Optional[str] = None,
    ) -> SessionRecord:
        record = SessionRecord(
            submission_id=submission_id,
            asset_id=asset_id,
            latest_completion_id=completion_id,
        )
        with self._lock:
            self._records[submission_id] = record
        return record

    def update_completion(self, submission_id: str, completion_id: Optional[str]) -> SessionRecord:
        with self._lock:
            try:
                record = self._records[submission_id]
            except KeyError as exc:  # pragma: no cover - defensive guard
                raise SessionNotFoundError(submission_id) from exc
            record.latest_completion_id = completion_id
            return record

    def get(self, submission_id: str) -> SessionRecord:
        with self._lock:
            try:
                return self._records[submission_id]
            except KeyError as exc:
                raise SessionNotFoundError(submission_id) from exc

    def delete(self, submission_id: str) -> None:
        with self._lock:
            if submission_id not in self._records:
                raise SessionNotFoundError(submission_id)
            del self._records[submission_id]

    def clear(self) -> None:
        with self._lock:
            self._records.clear()

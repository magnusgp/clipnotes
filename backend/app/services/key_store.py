from __future__ import annotations

import hashlib

from backend.app.services.config_store import ConfigStore, KeyStatus


class KeyStore:
    """Hashes and persists Hafnia API keys through the ``ConfigStore``."""

    def __init__(self, store: ConfigStore, *, salt: str | None = None) -> None:
        self._store = store
        self._salt = salt.encode("utf-8") if salt is not None else None

    async def store_key(self, *, key: str, updated_by: str | None = None) -> KeyStatus:
        digest = self._hash(key)
        snapshot = await self._store.store_hafnia_key_hash(key_hash=digest, updated_by=updated_by)
        return KeyStatus(configured=snapshot.hafnia_key_hash is not None, last_updated=snapshot.updated_at)

    async def clear_key(self, *, updated_by: str | None = None) -> KeyStatus:
        snapshot = await self._store.store_hafnia_key_hash(key_hash=None, updated_by=updated_by)
        return KeyStatus(configured=False, last_updated=snapshot.updated_at)

    async def get_status(self) -> KeyStatus:
        return await self._store.get_key_status()

    def _hash(self, key: str) -> str:
        normalized = key.strip()
        if not normalized:
            raise ValueError("Hafnia API key cannot be blank.")

        digest = hashlib.sha256()
        digest.update(normalized.encode("utf-8"))
        if self._salt:
            digest.update(b"::")
            digest.update(self._salt)
        return digest.hexdigest()

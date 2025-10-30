from __future__ import annotations

import os
from functools import lru_cache
from typing import Final

from pydantic import BaseModel, Field, HttpUrl, ValidationError


class Settings(BaseModel):
    hafnia_api_key: str
    hafnia_base_url: HttpUrl
    frontend_url: HttpUrl = Field(default="http://localhost:5173")
    api_base_url: HttpUrl = Field(default="http://localhost:8000")

    @property
    def headers(self) -> dict[str, str]:
        """Default headers for Hafnia requests."""
        return {
            "Authorization": f"Bearer {self.hafnia_api_key}",
        }


_REQUIRED_ENV: Final[dict[str, str]] = {
    "hafnia_api_key": "HAFNIA_API_KEY",
    "hafnia_base_url": "HAFNIA_BASE_URL",
}

_OPTIONAL_ENV: Final[dict[str, str]] = {
    "frontend_url": "FRONTEND_URL",
    "api_base_url": "API_BASE_URL",
}


def _read_env_value(name: str) -> str | None:
    return os.environ.get(name)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    values: dict[str, str] = {}
    missing: list[str] = []

    for field, env_name in _REQUIRED_ENV.items():
        value = _read_env_value(env_name)
        if value is None:
            missing.append(env_name)
            continue
        values[field] = value

    if missing:
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(missing)
        )

    for field, env_name in _OPTIONAL_ENV.items():
        value = _read_env_value(env_name)
        if value is not None:
            values[field] = value

    try:
        return Settings(**values)  # type: ignore[arg-type]
    except ValidationError as exc:
        raise RuntimeError("Invalid environment configuration") from exc

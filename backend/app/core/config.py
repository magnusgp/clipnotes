from __future__ import annotations

import os
from functools import lru_cache
from typing import Final, cast

import dotenv
from pydantic import BaseModel, Field, HttpUrl, ValidationError

dotenv.load_dotenv()


class Settings(BaseModel):
    hafnia_api_key: str
    hafnia_api_secret: str | None = None
    hafnia_base_url: HttpUrl
    frontend_url: HttpUrl = Field(default=cast(HttpUrl, "http://localhost:5173"))
    api_base_url: HttpUrl = Field(default=cast(HttpUrl, "http://localhost:8000"))
    database_url: str = Field(default="postgresql+asyncpg://localhost/clipnotes?sslmode=require")
    hafnia_use_fake: bool = Field(default=False)

    @property
    def headers(self) -> dict[str, str]:
        """Default headers for Hafnia requests."""
        credential = self.hafnia_api_key
        if self.hafnia_api_secret:
            credential = f"{self.hafnia_api_key}:{self.hafnia_api_secret}"

        if credential.lower().startswith("apikey "):
            token = credential
        else:
            token = f"ApiKey {credential}"

        return {
            "Authorization": token,
        }


_REQUIRED_ENV: Final[dict[str, str]] = {
    "hafnia_api_key": "HAFNIA_API_KEY",
    "hafnia_base_url": "HAFNIA_BASE_URL",
}

_OPTIONAL_ENV: Final[dict[str, str]] = {
    "hafnia_api_secret": "HAFNIA_API_SECRET",
    "frontend_url": "FRONTEND_URL",
    "api_base_url": "API_BASE_URL",
    "database_url": "DATABASE_URL",
    "hafnia_use_fake": "HAFNIA_USE_FAKE",
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

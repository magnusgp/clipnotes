from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class ConfigModel(Base):
    """Persisted operator configuration including parameters and theme overrides."""

    __tablename__ = "config"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hafnia_key_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_params: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    feature_flags: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    theme_overrides: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_by: Mapped[str | None] = mapped_column(String(128), nullable=True)


class RequestCountModel(Base):
    """Tracks per-day request counts for usage metrics."""

    __tablename__ = "request_counts"

    date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    requests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class ModelParams(BaseModel):
    """Operator-controlled model parameters for subsequent analyses."""

    fps: int = Field(ge=1, le=120)
    temperature: float = Field(ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=64, le=8192)
    default_prompt: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")

    @field_validator("default_prompt")
    @classmethod
    def _normalize_prompt(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ConfigUpdateRequest(BaseModel):
    """API payload describing configuration updates requested by operators."""

    model: ModelParams | None = None
    flags: dict[str, bool] | None = None
    theme: dict[str, Any] | None = None

    model_config = ConfigDict(extra="forbid")


class ConfigResponse(BaseModel):
    """Response envelope for `/api/config`."""

    model: ModelParams
    flags: dict[str, bool] = Field(default_factory=dict)
    theme: dict[str, Any] | None = None
    updated_at: datetime
    updated_by: str | None = None

    model_config = ConfigDict(extra="forbid")


class FlagsResponse(BaseModel):
    """Response envelope for `/api/config/flags`."""

    flags: dict[str, bool] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")


class HafniaKeyRequest(BaseModel):
    """Payload for storing or rotating a Hafnia API key."""

    key: SecretStr = Field(min_length=10, max_length=128)

    model_config = ConfigDict(extra="forbid")

    @field_validator("key")
    @classmethod
    def _ensure_not_blank(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value().strip()
        if not raw:
            raise ValueError("Hafnia API key cannot be blank.")
        return SecretStr(raw)


class KeyStatusResponse(BaseModel):
    """Response payload describing Hafnia key status."""

    configured: bool
    last_updated: datetime | None = None

    model_config = ConfigDict(extra="forbid")

from __future__ import annotations

from typing import Any, Mapping

from backend.app.models.config import ConfigResponse, ConfigUpdateRequest, FlagsResponse, ModelParams
from backend.app.services.config_store import ConfigSnapshot, ConfigStore, UNSET

_DEFAULT_MODEL_PARAMS: dict[str, Any] = {
    "fps": 24,
    "temperature": 0.7,
    "max_tokens": 2048,
    "default_prompt": None,
}


class ConfigService:
    """Higher-level orchestration around the raw ``ConfigStore``."""

    def __init__(self, store: ConfigStore) -> None:
        self._store = store

    async def get_configuration(self) -> ConfigResponse:
        snapshot = await self._store.fetch()
        return self._to_response(snapshot)

    async def get_flags(self) -> FlagsResponse:
        snapshot = await self._store.fetch()
        flags = self._coerce_flags(snapshot.feature_flags)
        return FlagsResponse(flags=flags)

    async def update_configuration(self, payload: ConfigUpdateRequest, *, updated_by: str | None = None) -> ConfigResponse:
        model_params_payload: dict[str, Any] | None = None
        if "model" in payload.model_fields_set:
            if payload.model is None:
                model_params_payload = {}
            else:
                model_params_payload = payload.model.model_dump(mode="json")

        feature_flags_payload: dict[str, Any] | None = None
        if "flags" in payload.model_fields_set:
            feature_flags_payload = dict(payload.flags or {})

        theme_payload: Mapping[str, Any] | None | object = UNSET
        if "theme" in payload.model_fields_set:
            theme_payload = payload.theme

        snapshot = await self._store.update(
            model_params=model_params_payload,
            feature_flags=feature_flags_payload,
            theme_overrides=theme_payload,
            updated_by=updated_by,
        )
        return self._to_response(snapshot)

    def _to_response(self, snapshot: ConfigSnapshot) -> ConfigResponse:
        model = self._model_params_from_snapshot(snapshot.model_params)
        flags = self._coerce_flags(snapshot.feature_flags)
        theme = self._coerce_theme(snapshot.theme_overrides)

        return ConfigResponse(
            model=model,
            flags=flags,
            theme=theme,
            updated_at=snapshot.updated_at,
            updated_by=snapshot.updated_by,
        )

    def _model_params_from_snapshot(self, payload: Mapping[str, Any]) -> ModelParams:
        merged = dict(_DEFAULT_MODEL_PARAMS)
        for key, value in payload.items():
            if key not in merged:
                continue
            merged[key] = value
        try:
            return ModelParams(**merged)
        except Exception as exc:  # pragma: no cover - defensive fallback
            raise ValueError("Invalid model parameters in configuration store") from exc

    @staticmethod
    def _coerce_flags(flags: Mapping[str, Any]) -> dict[str, bool]:
        coerced: dict[str, bool] = {}
        for key, value in flags.items():
            if isinstance(value, bool):
                coerced[key] = value
                continue
            if isinstance(value, str):
                lowered = value.strip().lower()
                if lowered in {"1", "true", "yes", "on"}:
                    coerced[key] = True
                    continue
                if lowered in {"0", "false", "no", "off"}:
                    coerced[key] = False
                    continue
            coerced[key] = bool(value)
        return coerced

    @staticmethod
    def _coerce_theme(theme: Mapping[str, Any] | None) -> dict[str, Any] | None:
        if theme is None:
            return None
        if isinstance(theme, dict):
            return dict(theme)
        return dict(theme)
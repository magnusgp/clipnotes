from __future__ import annotations

from backend.app.models.insights import InsightWindow

SUPPORTED_WINDOWS: tuple[InsightWindow, ...] = ("24h", "7d")


def validate_window(value: str | None) -> InsightWindow:
    """Normalise and validate an insight window string."""
    if not value:
        raise ValueError("Window value is required")

    normalised = value.strip().lower()
    if normalised not in SUPPORTED_WINDOWS:
        raise ValueError(f"Unsupported window '{value}'. Expected one of: {', '.join(SUPPORTED_WINDOWS)}")

    # typing aid: cast to InsightWindow based on membership check above
    return normalised  # type: ignore[return-value]

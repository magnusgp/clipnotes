from __future__ import annotations

import pytest

from backend.app.services.insights.validators import validate_window


@pytest.mark.parametrize("value", ["24h", "7d", " 24h ", "7D", "\t24H\n"])
def test_validate_window_accepts_supported_values(value: str) -> None:
    assert validate_window(value) in {"24h", "7d"}


@pytest.mark.parametrize(
    "value",
    ["", "12h", "30d", "all", "yesterday", None],
)
def test_validate_window_rejects_invalid_values(value: str | None) -> None:
    with pytest.raises(ValueError):
        validate_window(value)

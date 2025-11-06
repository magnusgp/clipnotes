from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from backend.app.api.deps import get_insight_service
from backend.app.models.insights import (
    InsightRegenerateRequest,
    InsightResponse,
    InsightShareRequest,
    InsightShareResponse,
    InsightWindow,
)
from backend.app.services.insights import InsightService
from backend.app.services.insights.share_store import ShareTokenNotFoundError

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightResponse, responses={400: {"description": "Invalid window"}})
async def get_insights(
    response: Response,
    window: str = Query(default="24h"),
    service: InsightService = Depends(get_insight_service),
) -> InsightResponse:
    window_value = _coerce_window(window)
    try:
        snapshot = await service.get_snapshot(window_value)
    except ValueError as exc:  # pragma: no cover - defensive guard until service validates internally
        raise _invalid_window_exception(str(exc)) from exc
    _apply_cache_headers(response, service.cache_ttl_seconds)
    return snapshot


@router.post(
    "/regenerate",
    response_model=InsightResponse,
    responses={400: {"description": "Invalid window"}},
)
async def regenerate_insights(
    response: Response,
    payload: InsightRegenerateRequest,
    service: InsightService = Depends(get_insight_service),
) -> InsightResponse:
    try:
        snapshot = await service.regenerate_snapshot(payload.window)
    except ValueError as exc:  # pragma: no cover
        raise _invalid_window_exception(str(exc)) from exc
    _apply_cache_headers(response, service.cache_ttl_seconds)
    return snapshot


@router.post(
    "/share",
    response_model=InsightShareResponse,
    responses={
        400: {"description": "Invalid window"},
        503: {"description": "Share service unavailable"},
    },
)
async def create_share(
    payload: InsightShareRequest,
    service: InsightService = Depends(get_insight_service),
) -> InsightShareResponse:
    try:
        return await service.create_share(payload.window)
    except ValueError as exc:
        raise _invalid_window_exception(str(exc)) from exc
    except RuntimeError as exc:
        raise _share_unavailable_exception(str(exc)) from exc


@router.get(
    "/share/{token}",
    response_model=InsightResponse,
    responses={
        400: {"description": "Invalid window"},
        404: {"description": "Share token not found"},
        503: {"description": "Share service unavailable"},
    },
)
async def get_share(
    response: Response,
    token: str,
    window: str | None = Query(default=None),
    service: InsightService = Depends(get_insight_service),
) -> InsightResponse:
    try:
        window_value = _coerce_window(window) if window else None
        snapshot = await service.get_shared_snapshot(token, window_value)
    except ValueError as exc:
        raise _invalid_window_exception(str(exc)) from exc
    except ShareTokenNotFoundError:
        raise _share_not_found_exception(token)
    except RuntimeError as exc:
        raise _share_unavailable_exception(str(exc)) from exc

    _apply_cache_headers(response, service.cache_ttl_seconds)
    return snapshot


def _coerce_window(raw: str) -> InsightWindow:
    value = raw.strip().lower()
    if value in {"24h", "7d"}:
        return value  # type: ignore[return-value]
    raise _invalid_window_exception(f"Unsupported window '{raw}'.")


def _apply_cache_headers(response: Response, ttl: int) -> None:
    if ttl <= 0:
        response.headers["Cache-Control"] = "no-store"
    else:
        response.headers["Cache-Control"] = f"public, max-age={ttl}"


def _invalid_window_exception(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "invalid_window",
                "message": "Window parameter is invalid.",
                "detail": detail,
            }
        },
    )


def _share_unavailable_exception(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "error": {
                "code": "share_unavailable",
                "message": "Insight sharing is temporarily unavailable.",
                "detail": detail,
            }
        },
    )


def _share_not_found_exception(token: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error": {
                "code": "share_not_found",
                "message": "Share token was not found.",
                "detail": token,
            }
        },
    )

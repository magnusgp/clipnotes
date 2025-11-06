import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from backend.app.api.deps import (
    get_config_service,
    get_conversation_service,
    get_hafnia_client,
    get_hafnia_upload_client,
    get_key_store,
    get_metrics_service,
    get_session_registry,
    get_store,
    get_summarizer,
)
from backend.app.models.config import (
    ConfigResponse,
    ConfigUpdateRequest,
    FlagsResponse,
    HafniaKeyRequest,
    KeyStatusResponse,
)
from backend.app.models.metrics import MetricsResponse
from backend.app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ChatRequest,
    ChatResponse,
    ClipCreateRequest,
    ClipDetailResponse,
    ClipListResponse,
    ClipResponse,
    ClipSummary,
    ErrorDetail,
    ErrorResponse,
    Moment as MomentSchema,
    SummaryResponse,
)
from backend.app.services.config_service import ConfigService
from backend.app.services.conversation import ConversationService
from backend.app.services.hafnia import HafniaAnalysisClientProtocol, HafniaClientError
from backend.app.services.hafnia_client import HafniaClientProtocol
from backend.app.services.key_store import KeyStore
from backend.app.services.metrics_service import MetricsService
from backend.app.services.sessions import SessionNotFoundError, SessionRegistry
from backend.app.services.summarizer import Summarizer
from backend.app.services.validators import UploadValidationError, validate_upload_file
from backend.app.store import ClipNotFoundError, ClipRecord, ClipStore
from backend.app.api.insights import router as insights_router
from backend.app.reasoning.router import router as reasoning_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])
router.include_router(reasoning_router)
router.include_router(insights_router)
system_router = APIRouter(tags=["system"])


@system_router.get("/healthz", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get(
    "/config",
    response_model=ConfigResponse,
    tags=["config"],
)
async def get_configuration(
    config_service: ConfigService = Depends(get_config_service),
) -> ConfigResponse:
    return await config_service.get_configuration()


@router.put(
    "/config",
    response_model=ConfigResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["config"],
)
async def update_configuration(
    request: ConfigUpdateRequest,
    config_service: ConfigService = Depends(get_config_service),
) -> ConfigResponse | JSONResponse:
    try:
        return await config_service.update_configuration(request)
    except ValueError as exc:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_configuration",
            message="Configuration update rejected.",
            detail=str(exc),
        )


@router.get(
    "/config/flags",
    response_model=FlagsResponse,
    tags=["config"],
)
async def get_flags(
    config_service: ConfigService = Depends(get_config_service),
) -> FlagsResponse:
    return await config_service.get_flags()


@router.get(
    "/metrics",
    response_model=MetricsResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["metrics"],
)
async def get_metrics(
    window: str | None = None,
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> MetricsResponse | JSONResponse:
    try:
        return await metrics_service.get_metrics(window=window)
    except ValueError as exc:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_window",
            message="Window parameter is invalid.",
            detail=str(exc),
        )
    except SQLAlchemyError:
        logger.exception("Failed to fetch metrics; returning zeroed response")
        now = datetime.now(timezone.utc)
        return MetricsResponse(
            generated_at=now,
            total_clips=0,
            total_analyses=0,
            avg_latency_ms=0.0,
            requests_today=0,
            clips_today=0,
            per_hour=[],
            per_day=[],
            latency_flag=False,
            error_rate=None,
        )


@router.get(
    "/keys/hafnia",
    response_model=KeyStatusResponse,
    tags=["config"],
)
async def get_hafnia_key_status(
    key_store: KeyStore = Depends(get_key_store),
) -> KeyStatusResponse:
    status_payload = await key_store.get_status()
    return KeyStatusResponse(configured=status_payload.configured, last_updated=status_payload.last_updated)


@router.post(
    "/keys/hafnia",
    response_model=KeyStatusResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["config"],
)
async def post_hafnia_key(
    request: HafniaKeyRequest,
    key_store: KeyStore = Depends(get_key_store),
) -> KeyStatusResponse | JSONResponse:
    try:
        status_payload = await key_store.store_key(key=request.key.get_secret_value())
    except ValueError as exc:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_hafnia_key",
            message="Provided Hafnia API key is invalid.",
            detail=str(exc),
        )
    return KeyStatusResponse(configured=status_payload.configured, last_updated=status_payload.last_updated)


def _normalize_error_code(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    detail: str | None = None,
    remediation: str | None = None,
    submission_id: str | None = None,
) -> JSONResponse:
    payload = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            detail=detail,
            remediation=remediation,
            submission_id=submission_id,
        )
    )
    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(mode="json"),
    )


def _clip_to_summary(record: ClipRecord) -> ClipSummary:
    return ClipSummary(
        clip_id=record.id,
        filename=record.filename,
        asset_id=record.asset_id,
        status=record.status,
        created_at=record.created_at,
        last_analysis_at=record.last_analysis_at,
        latency_ms=record.latency_ms,
    )


def _clip_to_response(record: ClipRecord) -> ClipResponse:
    summary = _clip_to_summary(record)
    return ClipResponse(**summary.model_dump())


def _analysis_to_payload(analysis: Any) -> AnalysisResponse:
    return AnalysisResponse(
        clip_id=analysis.clip_id,
        summary=analysis.summary,
        moments=[
            MomentSchema(
                start_s=moment.start_s,
                end_s=moment.end_s,
                label=moment.label,
                severity=moment.severity,
            )
            for moment in analysis.moments
        ],
        raw=analysis.raw,
        created_at=analysis.created_at,
        latency_ms=analysis.latency_ms,
        prompt=analysis.prompt,
        error_code=analysis.error_code,
        error_message=analysis.error_message,
    )


@router.post(
    "/clips",
    status_code=status.HTTP_201_CREATED,
    response_model=ClipResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["clips"],
)
async def register_clip(
    request: ClipCreateRequest,
    store: ClipStore = Depends(get_store),
) -> ClipResponse | JSONResponse:
    filename = request.filename.strip()
    if not filename:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_filename",
            message="Filename is required to register a clip.",
        )
    if len(filename) > 255:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_filename",
            message="Filename must be 255 characters or fewer.",
        )

    record = await store.create_clip(filename=filename)
    return _clip_to_response(record)


@router.get(
    "/clips",
    response_model=ClipListResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["clips"],
)
async def list_clips(
    limit: int = 25,
    store: ClipStore = Depends(get_store),
) -> ClipListResponse | JSONResponse:
    if limit < 1 or limit > 100:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_limit",
            message="Limit must be between 1 and 100.",
        )

    records = await store.list_clips(limit=limit)
    items = [_clip_to_summary(record) for record in records]
    return ClipListResponse(items=items)


@router.get(
    "/clips/{clip_id}",
    response_model=ClipDetailResponse,
    responses={404: {"model": ErrorResponse}},
    tags=["clips"],
)
async def get_clip(
    clip_id: UUID,
    store: ClipStore = Depends(get_store),
) -> ClipDetailResponse | JSONResponse:
    record = await store.get_clip(clip_id)
    if record is None:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="clip_not_found",
            message="Clip not found.",
            detail=f"Clip {clip_id} does not exist.",
        )

    analysis = await store.get_latest_analysis(clip_id)
    analysis_payload = _analysis_to_payload(analysis) if analysis is not None else None

    return ClipDetailResponse(
        clip=_clip_to_summary(record),
        analysis=analysis_payload,
    )

@router.post(
    "/clips/{clip_id}/asset",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ClipResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
    tags=["clips"],
)
async def upload_clip_asset(
    clip_id: UUID,
    file: UploadFile = File(...),
    store: ClipStore = Depends(get_store),
    hafnia_client: HafniaClientProtocol = Depends(get_hafnia_upload_client),
) -> ClipResponse | JSONResponse:
    record = await store.get_clip(clip_id)
    if record is None:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="clip_not_found",
            message="Clip not found.",
            detail=f"Clip {clip_id} does not exist.",
        )

    try:
        validate_upload_file(file)
        await file.seek(0)
        asset_id = await hafnia_client.upload_asset(file)
    except UploadValidationError as exc:
        code = _normalize_error_code(exc.error)
        message = exc.error.capitalize()
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
            detail=exc.detail,
            remediation=exc.remediation,
        )
    except HafniaClientError as exc:
        return _error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="hafnia_unavailable",
            message="Hafnia is currently unavailable",
            detail=str(exc),
            remediation="Please retry in a few moments. Contact support if the problem persists.",
        )
    except Exception as exc:  # pragma: no cover - defensive guard
        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
            message="Unable to upload asset",
            detail=str(exc),
        )

    updated = await store.attach_asset(clip_id, asset_id=asset_id)
    return _clip_to_response(updated)


@router.post(
    "/analyze",
    response_model=SummaryResponse,
    responses={502: {"model": ErrorResponse}},
)
async def analyze(
    file: UploadFile = File(...),
    summarizer: Summarizer = Depends(get_summarizer),
) -> SummaryResponse | JSONResponse:
    try:
        validate_upload_file(file)
        await file.seek(0)
        return await summarizer.process(file)
    except UploadValidationError as exc:
        code = _normalize_error_code(exc.error)
        message = exc.error.capitalize()
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
            detail=exc.detail,
            remediation=exc.remediation,
        )
    except HafniaClientError as exc:
        return _error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="hafnia_unavailable",
            message="Hafnia is currently unavailable",
            detail=str(exc),
            remediation="Please retry in a few moments. Contact support if the problem persists.",
        )
    except Exception as exc:  # pragma: no cover - defensive guard
        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
            message="Unable to process summary",
            detail=str(exc),
        )


@router.post(
    "/analysis/{clip_id}",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=AnalysisResponse,
    responses={
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
    tags=["analysis"],
)
async def trigger_analysis(
    clip_id: UUID,
    request: AnalysisRequest | None = None,
    store: ClipStore = Depends(get_store),
    hafnia_client: HafniaAnalysisClientProtocol = Depends(get_hafnia_client),
    registry: SessionRegistry = Depends(get_session_registry),
) -> AnalysisResponse | JSONResponse:
    record = await store.get_clip(clip_id)
    if record is None:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="clip_not_found",
            message="Clip not found.",
            detail=f"Clip {clip_id} does not exist.",
        )

    if not record.asset_id:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="asset_missing",
            message="Clip asset must be uploaded before triggering analysis.",
            remediation="Upload the clip asset first, then retry analysis.",
        )

    prompt = request.prompt if request is not None else None

    await store.update_clip_status(clip_id, status="processing")

    try:
        payload = await hafnia_client.analyze_clip(
            clip_id=clip_id,
            asset_id=record.asset_id,
            filename=record.filename,
            prompt=prompt,
        )
    except HafniaClientError as exc:
        await store.update_clip_status(clip_id, status="failed")
        return _error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="hafnia_unavailable",
            message="Hafnia is currently unavailable",
            detail=str(exc),
            remediation="Retry shortly or contact an operator if the issue persists.",
        )

    analysis_record = await store.save_analysis(clip_id, payload)

    completion_id = None
    raw_payload = analysis_record.raw or {}
    if isinstance(raw_payload, dict):
        candidate = raw_payload.get("completion_id") or raw_payload.get("id")
        if isinstance(candidate, str) and candidate:
            completion_id = candidate

    if record.asset_id:
        registry.record_summary(
            submission_id=str(clip_id),
            asset_id=record.asset_id,
            completion_id=completion_id,
        )

    if payload.error_code or payload.error_message:
        error_code = _normalize_error_code(payload.error_code or "hafnia_error")
        return _error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code=error_code,
            message=payload.error_message or "Hafnia analysis failed",
            detail=payload.error_message,
            remediation="Retry shortly or contact an operator if the issue persists.",
        )

    return _analysis_to_payload(analysis_record)


@router.get(
    "/analysis/{clip_id}",
    response_model=AnalysisResponse,
    responses={
        404: {"model": ErrorResponse},
    },
    tags=["analysis"],
)
async def get_analysis(
    clip_id: UUID,
    store: ClipStore = Depends(get_store),
) -> AnalysisResponse | JSONResponse:
    record = await store.get_clip(clip_id)
    if record is None:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="clip_not_found",
            message="Clip not found.",
            detail=f"Clip {clip_id} does not exist.",
        )

    analysis = await store.get_latest_analysis(clip_id)
    if analysis is None:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="analysis_not_found",
            message="Analysis not found.",
            detail=f"Clip {clip_id} has no analysis results yet.",
            remediation="Trigger a new analysis request for this clip.",
        )

    return _analysis_to_payload(analysis)

@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def chat(
    request: ChatRequest,
    conversation: ConversationService = Depends(get_conversation_service),
) -> ChatResponse | JSONResponse:
    try:
        result = await conversation.chat(request.submission_id, request.prompt)
        if isinstance(result, ChatResponse):
            return result
        if hasattr(result, "model_dump"):
            payload = result.model_dump(mode="json")  # type: ignore[attr-defined]
        elif isinstance(result, dict):
            payload = result
        else:
            raise TypeError("Conversation service returned unsupported payload type")
        return ChatResponse.model_validate(payload)
    except SessionNotFoundError as exc:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="submission_not_found",
            message="Submission not found",
            detail=str(exc),
            remediation="Upload the clip again before requesting a follow-up.",
            submission_id=request.submission_id,
        )
    except HafniaClientError as exc:
        return _error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="hafnia_unavailable",
            message="Hafnia is currently unavailable",
            detail=str(exc),
            remediation="Please retry in a few moments. Contact support if the problem persists.",
            submission_id=request.submission_id,
        )


@router.delete(
    "/assets/{submission_id}",
    responses={
        204: {"description": "Session deleted"},
        404: {"model": ErrorResponse},
    },
)
async def delete_asset(
    submission_id: str,
    registry: SessionRegistry = Depends(get_session_registry),
    store: ClipStore = Depends(get_store),
) -> Response:
    session_missing = False
    session_detail: str | None = None
    try:
        registry.delete(submission_id)
    except SessionNotFoundError as exc:
        session_missing = True
        session_detail = str(exc)

    clip_missing = False
    clip_detail: str | None = None
    try:
        submission_uuid = UUID(submission_id)
    except ValueError:
        submission_uuid = None
        clip_missing = True
        clip_detail = f"Submission {submission_id} is not a valid UUID."
    if submission_uuid is not None:
        try:
            await store.delete_clip(submission_uuid)
        except ClipNotFoundError as exc:
            clip_missing = True
            clip_detail = str(exc)

    if session_missing and clip_missing:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="submission_not_found",
            message="Submission not found",
            detail=clip_detail or session_detail,
            remediation="Upload the clip again if you need to request more actions.",
            submission_id=submission_id,
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)

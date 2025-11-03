from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from backend.app.api.deps import get_chat_service, get_compare_service, get_store
from backend.app.models.reasoning import (
	ReasoningChatRequest,
	ReasoningChatResponse,
	ReasoningCompareRequest,
	ReasoningComparisonResponse,
	ReasoningHistoryResponse,
	ReasoningMetricsResponse,
)
from backend.app.models.schemas import ErrorDetail, ErrorResponse
from backend.app.reasoning.chat import ChatService
from backend.app.reasoning.compare import (
	CompareService,
	DuplicateClipSelectionError,
	MissingAnalysisError,
)
from backend.app.reasoning.transformers import summarize_clip_metrics
from backend.app.store import ClipStore

router = APIRouter(prefix="/reasoning", tags=["reasoning"])


def _error_response(
	*,
	status_code: int,
	code: str,
	message: str,
	detail: str | None = None,
	remediation: str | None = None,
) -> JSONResponse:
	payload = ErrorResponse(
		error=ErrorDetail(
			code=code,
			message=message,
			detail=detail,
			remediation=remediation,
		)
	)
	return JSONResponse(
		status_code=status_code,
		content=payload.model_dump(mode="json"),
	)


@router.post(
	"/compare",
	response_model=ReasoningComparisonResponse,
	responses={
		status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
		status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
	},
)
async def compare_clips(
	request: ReasoningCompareRequest,
	service: CompareService = Depends(get_compare_service),
) -> ReasoningComparisonResponse | JSONResponse:
	try:
		return await service.compare(
			clip_a_id=request.clip_a,
			clip_b_id=request.clip_b,
			question=request.question,
		)
	except DuplicateClipSelectionError:
		return _error_response(
			status_code=status.HTTP_400_BAD_REQUEST,
			code="duplicate_clips",
			message="clip_a and clip_b must refer to different clips",
		)
	except MissingAnalysisError as exc:
		return _error_response(
			status_code=status.HTTP_404_NOT_FOUND,
			code="analysis_not_found",
			message="Analysis not found for one or more clips.",
			detail=f"Clip {exc.clip_id} has no stored analysis.",
			remediation="Run analysis on the clip(s) before requesting comparison.",
		)
	except ValueError as exc:
		return _error_response(
			status_code=status.HTTP_400_BAD_REQUEST,
			code="invalid_request",
			message=str(exc),
		)


@router.post(
	"/chat",
	response_model=ReasoningChatResponse,
	responses={
		status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
		status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
	},
)
async def chat_follow_up(
	request: ReasoningChatRequest,
	service: ChatService = Depends(get_chat_service),
) -> ReasoningChatResponse | JSONResponse:
	try:
		return await service.ask(clips=request.clips, message=request.message)
	except MissingAnalysisError as exc:
		return _error_response(
			status_code=status.HTTP_404_NOT_FOUND,
			code="analysis_not_found",
			message="Analysis not found for one or more clips.",
			detail=f"Clip {exc.clip_id} has no stored analysis.",
			remediation="Run analysis on the clip(s) before requesting chat follow-ups.",
		)
	except ValueError as exc:
		return _error_response(
			status_code=status.HTTP_400_BAD_REQUEST,
			code="invalid_request",
			message=str(exc),
		)


@router.get(
	"/history",
	response_model=ReasoningHistoryResponse,
)
async def list_history(
	clip_selection_hash: str | None = Query(None),
	clip_id: UUID | None = Query(None),
	limit: int = Query(20, ge=1, le=50),
	service: ChatService = Depends(get_chat_service),
) -> ReasoningHistoryResponse:
	return await service.history(
		clip_selection_hash=clip_selection_hash,
		clip_id=clip_id,
		limit=limit,
	)


@router.get(
	"/metrics/{clip_id}",
	response_model=ReasoningMetricsResponse,
	responses={
		status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
	},
)
async def get_clip_metrics(
	clip_id: UUID,
	store: ClipStore = Depends(get_store),
) -> ReasoningMetricsResponse | JSONResponse:
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

	return summarize_clip_metrics(analysis)

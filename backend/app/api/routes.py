from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.api.deps import get_summarizer
from backend.app.models.schemas import ErrorResponse, SummaryResponse
from backend.app.services.hafnia_client import HafniaClientError
from backend.app.services.summarizer import Summarizer
from backend.app.services.validators import (
	UploadValidationError,
	validate_upload_file,
)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/health", tags=["health"])
async def health() -> dict[str, str]:
	return {"status": "ok"}


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
		error_payload = ErrorResponse(
			submission_id=None,
			error=exc.error,
			detail=exc.detail,
			remediation=exc.remediation,
		)
		return JSONResponse(
			status_code=status.HTTP_400_BAD_REQUEST,
			content=error_payload.model_dump(mode="json"),
		)
	except HafniaClientError as exc:
		raise HTTPException(
			status_code=status.HTTP_502_BAD_GATEWAY,
			detail=str(exc),
		) from exc
	except Exception as exc:  # pragma: no cover - defensive guard
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Unable to process summary",
		) from exc

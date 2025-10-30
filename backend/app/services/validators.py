from __future__ import annotations

import io
from dataclasses import dataclass

from fastapi import UploadFile

ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/x-matroska",
}
MAX_FILE_BYTES = 100 * 1024 * 1024


@dataclass(slots=True)
class UploadMetadata:
    filename: str
    content_type: str
    size_bytes: int


class UploadValidationError(ValueError):
    def __init__(self, error: str, *, detail: str | None = None, remediation: str | None = None) -> None:
        super().__init__(error)
        self.error = error
        self.detail = detail
        self.remediation = remediation


def _get_file_size(upload_file: UploadFile) -> int:
    file_obj = upload_file.file
    if file_obj is None:
        return 0

    current_pos = file_obj.tell()
    file_obj.seek(0, io.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(current_pos)
    return size


def validate_upload_file(upload_file: UploadFile) -> UploadMetadata:
    if not upload_file:
        raise UploadValidationError(
            "missing file",
            detail="No file was provided in the request.",
            remediation="Attach an MP4 or MKV clip and try again.",
        )

    filename = upload_file.filename or "uploaded-video"
    content_type = upload_file.content_type or "application/octet-stream"

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UploadValidationError(
            "unsupported file type",
            detail=f"Received content type '{content_type}'.",
            remediation="Please upload an MP4 or MKV clip.",
        )

    size_bytes = _get_file_size(upload_file)
    if size_bytes == 0:
        raise UploadValidationError(
            "empty file",
            detail=f"The file '{filename}' is empty.",
            remediation="Export a clip with visible footage and try again.",
        )

    if size_bytes > MAX_FILE_BYTES:
        raise UploadValidationError(
            "file too large",
            detail=f"The file is {size_bytes} bytes; limit is {MAX_FILE_BYTES} bytes.",
            remediation="Compress the clip or trim footage under 100 MB.",
        )

    upload_file.file.seek(0)

    return UploadMetadata(
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
    )

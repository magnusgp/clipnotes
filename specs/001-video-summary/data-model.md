# Data Model – ClipNotes Video Summary

## Entities

### VideoSubmission
- **Fields**:
  - `id` (UUID) – generated per request to correlate logs
  - `filename` (string)
  - `content_type` (enum: `video/mp4`, `video/x-matroska`)
  - `filesize_bytes` (int)
  - `duration_seconds` (float) – provided by client, validated server-side when possible
  - `uploaded_at` (datetime)
- **Validation Rules**:
  - `filesize_bytes` ≤ 104_857_600 (100 MB)
  - `duration_seconds` ≤ 30.0
  - `content_type` must match supported formats
- **Relationships**: One-to-one with `ProcessingStatus` and `SummaryReport` while the request is active.

### ProcessingStatus
- **Fields**:
  - `submission_id` (UUID, FK → VideoSubmission)
  - `state` (enum: `queued`, `uploading`, `processing`, `success`, `error`)
  - `detail` (string | null) – user-readable status or error copy
  - `updated_at` (datetime)
- **State Transitions**:
  1. `queued` → `uploading` when backend begins forwarding to Hafnia
  2. `uploading` → `processing` once Hafnia asset ID is issued
  3. `processing` → `success` when summary payload returns with valid content
  4. `processing` → `error` (or `uploading` → `error`) if Hafnia call fails or validation breaks

### SummaryReport
- **Fields**:
  - `submission_id` (UUID, FK → VideoSubmission)
  - `summary_text` (string)
  - `summary_json` (JSON | null) – structured response when Hafnia returns valid JSON
  - `completed_at` (datetime)
  - `latency_ms` (int) – measured elapsed time from upload start to summary completion
- **Validation Rules**:
  - At least one of `summary_text` or `summary_json` must be present
  - `latency_ms` must be captured for instrumentation logs

## Derived Data & Logging
- Backend logs attach `submission_id`, `state`, and `latency_ms` for observability per Constitution Principle V.
- Frontend stores summary history in-memory (no persistence) keyed by `submission_id` until the page reloads.

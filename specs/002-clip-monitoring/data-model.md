# Data Model – ClipNotes Monitoring Wave 1

## Entities

### ClipRecord
- **Fields**:
  - `id` (UUID) – server-generated identifier.
  - `filename` (string) – original name, trimmed of whitespace.
  - `status` (enum: `pending`, `processing`, `ready`, `failed`) – reflects latest analysis state.
  - `created_at` (datetime, UTC) – when the clip was registered.
  - `last_analysis_at` (datetime, UTC | null) – timestamp of the most recent analysis attempt.
  - `latency_ms` (int | null) – duration between analysis start and completion, populated on success.
- **Validation Rules**:
  - `filename` MUST be non-empty after trimming and ≤255 characters.
  - Duplicate filenames are allowed but tracked by unique `id`; batch spam is mitigated by frontend UX.
- **Relationships**:
  - One-to-many with `AnalysisResult` via `clip_id`.

### AnalysisResult
- **Fields**:
  - `clip_id` (UUID) – foreign key referencing `ClipRecord.id`.
  - `summary` (string) – Hafnia-provided narrative.
  - `moments` (JSON) – array of `{ start_s, end_s, label, severity }` objects.
  - `raw` (JSON) – unmodified Hafnia data for troubleshooting.
  - `created_at` (datetime, UTC) – when the analysis was stored.
  - `prompt` (string | null) – optional analyst-supplied prompt.
  - `error_code` (string | null) – populated when Hafnia request fails.
  - `error_message` (string | null) – human-readable failure details.
- **Validation Rules**:
  - Moments MUST have `0 <= start_s < end_s`, `label` non-empty, and `severity` in {low, medium, high}.
  - Either `summary` OR `error_message` must be present.
- **Relationships**:
  - Belongs to `ClipRecord`.

## Derived Data & Logging
- Persisted records store `latency_ms` for performance reporting and UI display.
- Audit logging should capture clip ID, status transitions, and Hafnia latency for debugging.
- In-memory store mirrors schema to keep tests representative of SQLite implementation.

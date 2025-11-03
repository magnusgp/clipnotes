# Data Model: Reasoning & Comparison

## Overview

The existing clip analysis tables remain unchanged. New reasoning capabilities introduce a persistent history table and transient response schemas that reuse stored analysis artifacts.

## Entities

### ClipAnalysis (existing)
- **Source**: Reuses current `analysis` table containing clip metadata, structured JSON, and summary text.
- **Relationships**: One-to-many with `ReasoningHistory` via `clip_id` membership.

### ReasoningHistory
- **Fields**:
  - `id` (UUID, primary key)
  - `clip_selection_hash` (TEXT) — deterministic hash of sorted clip IDs participating in the reasoning exchange.
  - `clip_ids` (ARRAY<UUID>) — ordered subset of clips referenced by the answer (max two for comparison, more for chat).
  - `question` (TEXT)
  - `answer` (JSONB) — normalized response containing `answer`, `explanation`, `evidence`, `confidence`.
  - `answer_type` (ENUM: `comparison`, `chat`)
  - `created_at` (TIMESTAMP, default now)
- **Indexes**:
  - `(clip_selection_hash, created_at DESC)` for quick retrieval of latest exchanges.
  - GIN index on `clip_ids` for membership queries when filtering by a single clip.
- **Validation**:
  - `clip_ids` must reference existing clips.
  - `answer` must align with Pydantic response schema using FastAPI validators.

### ReasoningMetrics (materialized view)
- **Description**: Logical view derived on demand by `transformers.py` from `ClipAnalysis.structured_payload`.
- **Fields**:
  - `clip_id` (UUID)
  - `counts_by_label` (JSONB: `{label: count}`)
  - `durations_by_label` (JSONB)
  - `severity_distribution` (JSONB)
  - `object_graph` (JSONB: `nodes`, `edges`)
- **Computation Rules**:
  - Counts accumulate `analysis.moments[].detections[].label` occurrences.
  - Durations sum contiguous segment lengths where label persists.
  - Severity distribution maps to spec-defined categories.
  - `object_graph` merges pairwise interactions if metadata present; absent data yields `null`.

## Relationships

- `ReasoningHistory.clip_ids` references `ClipAnalysis.clip_id`. Cascading deletes are disabled; history remains even if clips purge (retention handled by cron job).
- `ReasoningMetrics` is not persisted; derived per request, so no direct foreign keys.

## State Transitions

- When `/api/reasoning/compare` executes successfully, a new `ReasoningHistory` record is inserted with `answer_type = comparison`.
- `/api/reasoning/chat` inserts similar records tagged as `chat`.
- Retrieval endpoints query by `clip_selection_hash` (compare) or global `clip_id` (chat history view).
- Metrics endpoint reads the latest `ClipAnalysis` JSON and passes through `transformers.py` to shape response payloads.

# Data Model: ClipNotes Insight Layer

## Entities

### InsightSnapshot
- **Description**: Represents the aggregated insight payload for a specific window (`24h` or `7d`) combining series data, severity mix, labels, and summary.
- **Fields**:
  - `window` (ENUM: `24h`, `7d`).
  - `generated_at` (TIMESTAMP with timezone, UTC) — when the payload was computed.
  - `series` (ARRAY) — list of `InsightSeriesBucket` entries ordered chronologically.
  - `severity_totals` (OBJECT) — `{ "low": int, "medium": int, "high": int }`.
  - `top_labels` (ARRAY) — up to five `InsightTopLabel` objects, sorted by count.
  - `summary` (TEXT) — Hafnia narrative or deterministic fallback.
  - `source` (ENUM: `hafnia`, `fallback`).
  - `delta` (OBJECT) — optional `{ "analyses": int, "high_severity": int }` compared to previous period.
- **Validation**:
  - `series` buckets must cover the window: hourly buckets (size 24) for `24h`, daily buckets (size 7) for `7d`.
  - Counts are non-negative integers; `top_labels` trimmed to label length ≤ 80 characters.
  - `summary` limited to 500 characters; fallback summary structured as two sentences maximum.

### InsightSeriesBucket
- **Description**: Time bucket capturing clip counts and severity mix for chart rendering.
- **Fields**:
  - `bucket_start` (TIMESTAMP UTC) — start of the hour/day represented.
  - `total` (INT ≥ 0).
  - `severity` (OBJECT) — `{ "low": int, "medium": int, "high": int }`.
- **Validation**:
  - `bucket_start` aligns to hour (for 24h) or day (for 7d) boundaries.
  - Sum of severity counts equals `total`.

### InsightTopLabel
- **Description**: Aggregated label frequency across analysed moments within the window.
- **Fields**:
  - `label` (TEXT ≤ 80 characters).
  - `count` (INT ≥ 0).
  - `avg_severity` (FLOAT 0–2) — map `low=0`, `medium=1`, `high=2` for quick sorting; optional but stored for UI heuristics.
- **Validation**:
  - Labels normalised to lowercase for grouping but returned in title case (UI friendly).
  - Counts derived from Hafnia moments; exclude records with missing labels.

### InsightShareToken
- **Description**: Persistence layer for shareable read-only snapshots.
- **Fields**:
  - `token_hash` (TEXT PK) — hashed representation of share token (bcrypt or SHA-256 + salt).
  - `window` (ENUM: `24h`, `7d`).
  - `created_at` (TIMESTAMP UTC).
  - `last_accessed_at` (TIMESTAMP UTC, nullable).
  - `expires_at` (TIMESTAMP UTC, nullable) — optional future feature; default `NULL` (no expiry).
  - `payload` (JSON) — cached `InsightSnapshot` data for warm start.
- **Validation**:
  - `payload.window` must match stored `window`.
  - Hash salted with env-defined secret to prevent token enumeration.

## Relationships

- Each `InsightSnapshot` is computed on demand per window and cached in memory; when persisted for sharing (`InsightShareToken`), the JSON payload stores the snapshot for reuse after process restarts.
- `InsightSeriesBucket` and `InsightTopLabel` are embedded structures within `InsightSnapshot`; they are not separate tables but documented for API schema clarity.
- Share tokens link to windows one-to-many: multiple tokens may exist for the same window but represent separate viewers.

## Derived/Supporting Tables

- **analysis_results** (existing) — source of clip analyses; insight aggregation scans this table filtered by `created_at` within the window.
- **insight_cache_metrics** (optional log) — in-memory counters (hits, misses, regenerated) exported via logging for observability; no database table unless we promote metrics later.

## Data Flow Summary

1. Fetch `analysis_results` rows within the window and accumulate counts per severity, label, and bucket.
2. Attempt Hafnia narrative using aggregated JSON context; on failure, build deterministic fallback message referencing totals and deltas.
3. Store snapshot in TTL cache; when `Regenerate` is requested, bypass cache and persist new snapshot.
4. When a share link is requested, create token, persist hashed row + payload, and serve the cached snapshot (refreshing if TTL expired).

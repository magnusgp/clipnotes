# Data Model: Design & SaaS Polish

## Entities

### SaaSConfiguration
- **Description**: Persisted operator-configurable settings that influence new analyses and UI behaviour.
- **Fields**:
  - `id` (PK, constant single-row key such as `"global"`).
  - `hafnia_key_hash` (TEXT, nullable) — salted hash of stored Hafnia API key (full value never returned).
  - `model_params` (JSON) — `{ "fps": int >= 1, "temperature": float 0–2, "default_prompt": string <= 500 }`.
  - `feature_flags` (JSON) — dictionary of flag name → boolean (e.g., `ENABLE_LIVE_MODE`).
  - `theme_overrides` (JSON, optional) — default theme name, accent overrides.
  - `updated_at` (TIMESTAMP, default `now()`)
  - `updated_by` (TEXT, optional operator identifier).
- **Validation**:
  - `fps` must be within 1–120.
  - `temperature` must be within 0–2.
  - `default_prompt` trimmed; reject HTML.
  - Only known flag keys accepted; unknown keys ignored with warning.
- **State Transitions**:
  - `POST /api/keys/hafnia` updates `hafnia_key_hash` and touches `updated_at`.
  - `PUT /api/config` overwrites `model_params`, merges `feature_flags`, updates timestamps.
  - Env variables override read path: if env set, stored value ignored but timestamp still updated for audit.

### UsageMetricsSnapshot
- **Description**: Aggregated operational metrics surfaced in the dashboard.
- **Fields**:
  - `generated_at` (TIMESTAMP) — moment snapshot calculated.
  - `total_clips` (INT) — lifetime clips recorded.
  - `total_analyses` (INT) — lifetime analyses run.
  - `avg_latency_ms` (FLOAT) — rolling average over last N analyses (default 24h).
  - `requests_today` (INT) — requests counted via middleware since midnight.
  - `clips_today` (INT) — analyses started today.
  - `per_hour` (ARRAY) — list of `{ "hour": ISO hour, "requests": INT }` for last 12 hours.
  - `per_day` (ARRAY) — list of `{ "date": ISO date, "requests": INT, "analyses": INT }` for last 7 days.
  - `latency_flag` (BOOL) — true when average latency exceeds configured warning threshold.
- **Validation**:
  - Aggregation queries must fall back to zeros if no records present.
  - Timestamps use UTC to avoid timezone drift.
- **State Transitions**:
  - Middleware increments `requests_today` counter (persisted in memory + resets at midnight).
  - `/api/metrics` recomputes snapshot on demand and returns to frontend.

### BrandThemeProfile
- **Description**: Frontend representation of theme tokens; not persisted server-side but documented for completeness.
- **Fields**:
  - `mode` (ENUM: `light`, `dark`).
  - `font_body` (STRING) — `"Inter"`.
  - `font_display` (STRING) — `"Space Grotesk"`.
  - `accent_palette` (OBJECT) — `primary`, `secondary`, `glow` hex codes.
  - `glass_styles` (OBJECT) — blur/opacity tokens.
  - `motion_prefs` (OBJECT) — `enter`, `hover`, `reduced` variants.
- **State Transitions**:
  - `ThemeProvider` reads localStorage on load; toggle updates storage.
  - When reduced-motion detected, overrides `motion_prefs` to minimal animation.

## Relationships

- `SaaSConfiguration` is a singleton table consumed by config, flags, and keys endpoints.
- `UsageMetricsSnapshot` pulls from analysis/job tables (`clip_analyses`, etc.) but is generated, not stored; request counter stored in memory/SQLite helper table (`request_counts`).
- `BrandThemeProfile` stays client-side but derives default values from optional `theme_overrides` in `SaaSConfiguration`.

## Derived/Supporting Tables

- **request_counts** (SQLite helper)
  - Columns: `date` (DATE PK), `requests` (INT), `updated_at` (TIMESTAMP).
  - Middleware increments `requests`; reset row daily.

- **hafnia_keys** (optional helper if we separate from config)
  - Columns: `id` (PK), `key_hash` (TEXT), `created_at`, `updated_at`.
  - Could be merged back into `SaaSConfiguration` if single-row approach preferred.

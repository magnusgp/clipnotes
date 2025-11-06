# Research Notes: ClipNotes Insight Layer

## Outstanding Questions

- Do we expose cache control to operators (e.g., manual TTL override) beyond the planned `Regenerate` action, or is the 60s window mandatory for demo scope?
- Should the shareable endpoint return raw chart data only, or also include pre-rendered copy blocks for non-React consumers?
- Can we rely on in-process caching alone on Render (single dyno), or do we need a persistence backstop so share links stay fresh after restarts?
- What telemetry (if any) must roll into existing dashboards to evidence insight generation latency for performance sign-off?

## Technical Investigation

- `backend/app/store/sqlite.py` confirms `analysis_results.moments` is stored as JSON arrays; we can deserialize rows in Python to avoid engine-specific JSON aggregation and keep compatibility across SQLite (tests) and Postgres (Neon).
- Metrics service already uses SQLAlchemy session factories via `get_sessionmaker`; the insight aggregator can reuse the same pattern and piggyback on `_ensure_schema` to avoid duplicate connection logic.
- Hafnia clients live in `backend/app/services/hafnia.py` and `backend/app/reasoning/client.py`; narrative generation can call the reasoning client with a bespoke prompt while retaining deterministic fallback by synthesizing the summary from aggregated stats when Hafnia errors.
- Frontend navigation is centralised in `frontend/src/pages/App.tsx`; adding an Insights route requires nav flagging and ensures feature flags can hide/show the tab similar to Metrics.
- Vitest helpers under `frontend/tests/test-utils/providers.tsx` supply routing and flag context; reuse them for new insights page and share view tests to keep coverage consistent.

## Decisions & Assumptions

- Aggregate window statistics in Python (not SQL JSON functions) to sidestep dialect differences and maintain predictable test fixtures.
- Store share-link metadata in a new `insight_shares` table (token hash, window, created_at, last_accessed) so links survive process restarts while still layering an in-process TTL cache for quick reads.
- Cache payloads per window using an async-aware helper guarded by locks to avoid duplicate Hafnia calls under load; TTL defaults to 60s with `.env` override via `INSIGHTS_CACHE_TTL_SECONDS`.
- Deterministic fallback summary will reference severity counts and top labels from the same aggregation payload so UI retains meaningful copy even if Hafnia is unavailable.
- Insight narrative will use a fixed Hafnia prompt emphasising factual tone:
	```python
	prompt = """
	You are an operational insight summarizer.
	Given recent analysis data with label counts and severity distribution over time, write a concise, factual trend summary (1-2 sentences).
	Avoid speculative or conversational language. Use present tense.
	"""
	```
	This keeps summaries observational (e.g., "High-severity events increased by 32 % compared to the previous 24 hours, concentrated in Zone B during afternoon hours.") and demo-ready for judges.

## Export UX Notes

- Stakeholder report dialog surfaced as a secondary CTA on the Insights page to avoid disrupting existing share-link flow.
- Report layout mirrors summary/severity/labels/timeline order so existing walkthrough stays familiar while enabling printable output.
- Pilot review with ops PM showed preparing weekly executive recap dropped from ~6 minutes (manual copy/paste) to ~2 minutes using the export.
- Browser pop-up blockers remain the only friction point; quickstart now highlights allowing `localhost` pop-ups during testing.

## Follow-ups

- Share links ship without expiry UI for this iteration; document future enhancement separately if needed.
- Aggregation query verified during integration tests—hourly/daily bucket logic matches acceptance criteria.
- Hafnia prompt fallback keeps deterministic summary working; telemetry pending.
- Render dyno recycle impact mitigated by persisted share payloads via `insight_shares` table.
- Live ingestion demo remains optional; note in quickstart if exercised during rehearsals.
- Track stakeholder report usage post-launch to confirm reduced review time persists beyond initial pilot.

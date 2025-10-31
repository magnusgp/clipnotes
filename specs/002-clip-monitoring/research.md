# ClipNotes Monitoring Wave 1 – Research

## Storage Abstraction
- **Decision**: Define a `ClipStore` protocol with both `InMemoryStore` (for tests) and `SqliteStore` backed by SQLAlchemy 2.0 async engine using `sqlite+aiosqlite` with scoped sessions.
- **Rationale**: Async SQLAlchemy integrates cleanly with FastAPI dependency injection, keeps the code path consistent with future Postgres plans, and still allows lightweight testing via in-memory implementation.
- **Alternatives Considered**:
  - Direct SQLite via `sqlite3` module (rejected: thread-safety concerns under concurrent FastAPI requests).
  - SQLModel ORM (rejected: additional dependency with similar benefits; plain SQLAlchemy keeps control over schema evolutions).

## Hafnia Service Client
- **Decision**: Build `backend.services.hafnia.HafniaClient` using async HTTPX with injectable base URL and API key, plus a `FakeHafniaClient` for tests returning deterministic payloads.
- **Rationale**: HTTPX async client matches the existing FastAPI stack and simplifies mocking via dependency override; explicit fake keeps pytest deterministic without external calls.
- **Alternatives Considered**:
  - Synchronous `requests` client (rejected: would block event loop).
  - Wrapping existing summary service (rejected: new payload differs, timeline moments required).

## Analysis Payload Normalisation
- **Decision**: Normalize Hafnia responses into `{summary: str, moments: List[Moment], raw: dict}` where moments enforce `start_s`, `end_s`, `label`, `severity` enums.
- **Rationale**: Structured schema aligns backend/frontend contracts and allows timeline rendering without extra parsing in the browser.
- **Alternatives Considered**:
  - Passing Hafnia raw response straight through (rejected: frontend would duplicate parsing logic).

## Timeline Visual Design
- **Decision**: Represent moments as horizontal bars with severity-to-color mapping (`low`→emerald, `medium`→amber, `high`→rose), using Tailwind utility classes and accessible contrast ratios.
- **Rationale**: Distinct colors communicate urgency at a glance while satisfying WCAG contrast; timeline bars match monitoring dashboard expectations.
- **Alternatives Considered**:
  - Numeric severity badges only (rejected: harder to scan quickly).
  - Gradient heatmap (rejected: less accessible for color-blind users without additional symbols).

## Accessibility Validation
- **Decision**: Add `vitest-axe` powered snapshot (`tests/accessibility.monitoring.spec.tsx`) and canvas stubs to guarantee the monitoring dashboard stays free of axe violations.
- **Rationale**: Continuous accessibility checks catch regressions from new gradients/tooltips and ensure timeline segments remain describable through sr-only text.
- **Alternatives Considered**:
  - Rely solely on manual audits (rejected: easy to miss aria regressions during iterative styling).

## Session Guidance Prompts
- **Decision**: Surface curated follow-up prompts in `SessionHistory` when no chat transcripts exist to guide operators toward high-impact questions.
- **Rationale**: Keeps the panel useful before chats appear and reinforces Hafnia follow-up workflows gleaned from facilitator feedback.
- **Alternatives Considered**:
  - Leave the area empty (rejected: panel felt unfinished and provided no direction).

## Error Envelope & Latency Logging
- **Decision**: Centralize error responses via `HTTPException` handlers returning `{ "error": { "code", "message" } }` and log latency metrics stored alongside clips.
- **Rationale**: Consistent envelope simplifies frontend handling and ensures compliance with constitution latency evidence requirement.
- **Alternatives Considered**:
  - Returning FastAPI default detail structure (rejected: inconsistent contract with frontend expectations).

## CORS and Health Check
- **Decision**: Configure FastAPI middleware to allow `http://localhost:5173` and `http://127.0.0.1:5173`, and add `/healthz` route returning `{ "status": "ok" }` for Docker compose probes.
- **Rationale**: Matches existing development hosts and supports dockerized nginx frontend reverse proxy health monitoring.
- **Alternatives Considered**:
  - Wildcard CORS (rejected: unnecessary exposure even in dev).

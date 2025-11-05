# Research Notes: Design & SaaS Polish

## Decision Log

- **Decision**: Adopt Tailwind tokens + Framer Motion for premium shell while respecting reduced-motion.
  - **Rationale**: Tailwind/shadcn already underpin the UI, so layering gradient styles and motion variants keeps the system cohesive. Framer Motion offers declarative entrance/hover effects with reduced-motion guards out of the box.
  - **Alternatives considered**: (1) Raw CSS keyframes — rejected for duplication and reduced accessibility controls. (2) Leveraging a heavyweight design system (e.g., Chakra) — rejected due to migration overhead.

- **Decision**: Persist operator-configurable settings in existing SQLite store with JSON payload per key.
  - **Rationale**: SQLite is already provisioned; extending it avoids introducing new infrastructure. JSON columns let us evolve configs quickly for demo needs.
  - **Alternatives considered**: (1) Environment-only overrides — rejected because operators would still need redeploys. (2) Adding Redis — rejected as unnecessary for demo scale.

- **Decision**: Manage feature flags via environment defaults layered with persisted overrides exposed over `/api/config/flags`.
  - **Rationale**: Keeps flags centrally configured while giving the UI real-time awareness. Operators can toggle demo features without deploys.
  - **Alternatives considered**: (1) Hard-coded flags in frontend — rejected (requires builds). (2) Adopting a third-party flag service — rejected for time and credential complexity.

- **Decision**: Derive metrics from analysis records and lightweight request middleware, returning aggregated payloads suitable for dashboards.
  - **Rationale**: Data already lives in analysis tables. Adding counters lets us show live usage without introducing external telemetry. Middleware ensures request counts include non-analysis endpoints for demo storytelling.
  - **Alternatives considered**: (1) Instrumenting Prometheus — overkill for hackathon. (2) Stubbed/demo data — rejected to ensure authentic metrics during judging.

- **Decision**: Add GitHub Actions workflow running lint, pytest, and production build, publishing a status badge in README.
  - **Rationale**: Aligns with constitution and demonstrates production readiness; GitHub Actions integrates seamlessly with repo.
  - **Alternatives considered**: (1) Manual scripts only — fails acceptance criteria. (2) CircleCI — unnecessary migration effort.
  - **Outcome**: Implemented `.github/workflows/ci.yml` covering `uv run ruff check backend`, `uv run pytest`, `pnpm lint`, `pnpm test:ci`, and `pnpm build`; badge added to README for quick status checks.

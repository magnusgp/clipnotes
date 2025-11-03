# Research Notes: Reasoning & Comparison

## Decision Log

- **Decision**: Persist reasoning exchanges in a dedicated `reasoning_history` table keyed by composite clip selection hashes.
  - **Rationale**: Enables reconstruction of comparative sessions across refreshes and lets backend serve `/api/reasoning/history` efficiently.
  - **Alternatives considered**: (1) Pure client-side storage only — rejected because history must sync across devices. (2) Reusing generic activity log — rejected due to schema mismatch and retention policy conflicts.

- **Decision**: Normalize Hafnia multi-clip prompts into a shared system message template with clip summaries plus structured metric snippets.
  - **Rationale**: Ensures deterministic context for Cosmos-Reason1-7B and keeps token counts predictable under latency constraints.
  - **Alternatives considered**: (1) Sending raw analysis JSON unedited — rejected for cost and token overflow risk. (2) Making two separate API calls and diffing client-side — rejected due to higher latency and inconsistent answers.

- **Decision**: Derive metrics via lightweight transformers that map stored JSON moments into count, duration, and severity buckets.
  - **Rationale**: Reuses existing analysis artifacts without involving the inference service, allowing graphs and charts to render instantly.
  - **Alternatives considered**: (1) Calling Hafnia for metrics — rejected to avoid redundant token spend. (2) Computing metrics on the frontend — rejected to keep business logic centralized and avoid duplicating parsing code.

- **Decision**: Use React Query for reasoning endpoints with suspense-friendly hooks and stale-time tuning per tab section.
  - **Rationale**: Aligns with existing monitoring data fetching, gives unified retry/backoff handling, and simplifies optimistic updates.
  - **Alternatives considered**: (1) Raw `fetch` calls — rejected due to duplicated loading state handling. (2) SWR — rejected because project already standardizes on React Query.

- **Decision**: Introduce `<GraphVisualizer>` backed by D3-lite helper that supports keyboard focus on nodes/edges.
  - **Rationale**: Fulfills accessibility commitments for graph views and keeps visuals within existing design system.
  - **Alternatives considered**: (1) Using a third-party heavy graph library — rejected for bundle bloat. (2) Delivering only textual lists — rejected because stakeholders explicitly requested graph previews.

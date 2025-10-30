<!--
Sync Impact Report
Version change: 0.0.0 → 1.0.0
Modified principles: None (initial ratification)
Added sections: I. Linted Codebase Discipline; II. Pytest Verification Gate; III. UV-Centric Python Operations; IV. Inclusive Responsive UI; V. Video Analysis Responsiveness; VI. Credential Hygiene; VII. Hackathon Velocity; Operational Standards; Delivery Workflow; Governance
Removed sections: None
Templates requiring updates:
- .specify/templates/plan-template.md ✅ updated
- .specify/templates/spec-template.md ✅ updated
- .specify/templates/tasks-template.md ✅ updated
- .specify/templates/commands/ ⚠ pending — directory absent, confirm whether command templates are required
Follow-up TODOs: None
-->

# Clipnotes Constitution

## Core Principles

### I. Linted Codebase Discipline
- All Python contributions MUST satisfy PEP 8 via linting executed through `uv run` (e.g., `uv run ruff check`);
	lint failures block merges.
- Frontend code MUST pass ESLint with project rules before review; CI MUST execute the canonical lint script
	(e.g., `npm run lint`).
- Rationale: Consistent linting prevents rework that erodes the hackathon schedule and keeps the codebase predictable
	for pair handoffs.

### II. Pytest Verification Gate
- Every backend change MUST add or update pytest coverage, and `uv run pytest` MUST pass locally and in CI before
	merge approval.
- Pull requests MUST document the `uv run pytest` invocation (command output or automation link); reviewers reject
	other execution forms.
- Rationale: A single enforced test command preserves reproducible verification and stops regressions from shipping
	under time pressure.

### III. UV-Centric Python Operations
- Teams MUST rely on `uv` for Python dependency installation, script execution, and process management (e.g.,
	`uv run uvicorn`, `uv lock`).
- Direct `pip`, `venv`, or ad-hoc environment tools are prohibited unless a temporary exception is logged with owner,
	expiry, and rollback plan.
- Rationale: Centralizing on `uv` guarantees deterministic environments across laptops and CI, enabling rapid
	onboarding and debugging.

### IV. Inclusive Responsive UI
- All UI work MUST meet WCAG 2.1 AA expectations, including semantic markup, keyboard navigation, and perceptible
	feedback states.
- Tailwind CSS combined with shadcn/ui is the default component system; deviations require documented approval from
	the product and engineering leads.
- Components MUST demonstrate responsive behavior across mobile, tablet, and desktop breakpoints before a story is
	marked complete.
- Rationale: Accessible, responsive interfaces uphold user experience quality and avoid demo failures when
	stakeholders test on diverse devices.

### V. Video Analysis Responsiveness
- The MVP MUST return analysis for 15–30 second clips within 10 seconds (target 5 seconds) under representative
	network and hardware conditions.
- Engineers MUST instrument latency tracking and attach evidence (logs, dashboards, or scripts) when delivering
	features that impact runtime.
- Rationale: Maintaining this performance budget ensures the app feels snappy during demos and keeps hackathon
	judges engaged.

### VI. Credential Hygiene
- API keys, tokens, and secrets MUST be supplied exclusively via environment variables or approved secret managers;
	repository commits MUST stay secret-free.
- `.env` files committed to the repo MUST be example-only with placeholder values, and rotation guidance MUST live in
	shared documentation.
- Rationale: Secure credential handling protects partner APIs and avoids disruptive revocations that stall fast-paced
	iterations.

### VII. Hackathon Velocity
- Work MUST be sliced into increments deliverable within a single work session; any stretch goals move to clearly
	labeled follow-up tasks.
- Rapid experiments MUST record hypothesis, command(s) run, and outcomes in the feature docs to keep the team aligned.
- Rationale: Lightweight documentation sustains momentum without sacrificing shared context during the hackathon.

## Operational Standards
- Backend services, scripts, and tooling MUST expose canonical `uv run ...` commands in docs or Makefiles so
	contributors can reproduce flows quickly.
- Maintain an up-to-date `.env.example` enumerating required environment variables, secret storage guidance, and
	rotation cadence.
- Capture accessibility and responsiveness verification notes (tooling used, manual checks) alongside feature specs to
	evidence compliance.
- Store performance benchmarks, including video processing latency data, under `docs/performance/` or equivalent for
	traceability.

## Delivery Workflow
- The Implementation Plan MUST pass a constitution check confirming lint coverage, pytest gating via `uv`, accessibility
	scope, performance measurement, and credential handling.
- Feature branches MUST include CI jobs for linting and `uv run pytest`; merging without green jobs is disallowed.
- Reviews MUST confirm evidence of performance and accessibility validation before approving UI-impacting work.
- Each iteration concludes with a demo or summary linking to latest lint, test, and performance artifacts to keep
	stakeholders current.

## Governance
- This constitution supersedes other process docs; conflicts resolve in favor of these principles unless amended through governance.
- Amendments REQUIRE a pull request describing the change, its category (patch/minor/major), updated version tag, and approvals from at least one engineering lead and one product owner.
- Version increments follow semantic versioning: patch for clarifications, minor for new guidance, major for removals or breaking policy shifts.
- Compliance reviews happen at feature kickoff, pre-demo, and prior to release tagging; teams log findings and remediation owners.

**Version**: 1.0.0 | **Ratified**: 2025-10-30 | **Last Amended**: 2025-10-30

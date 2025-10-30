# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Constitution Alignment *(mandatory)*

- **Linting**: Describe how the feature keeps Python code PEP 8 compliant via `uv run` lint commands and how frontend
  ESLint gates will run in CI.
- **Testing**: Detail the pytest coverage to be added or updated and restate that verification uses `uv run pytest`.
- **UV Usage**: List every Python package management or runtime action this feature needs and the exact `uv`
  commands to execute them.
- **Accessible UI**: If the feature touches UI, describe the Tailwind + shadcn/ui components involved and the WCAG 2.1
  AA checks (manual + automated) that will be performed.
- **Performance Budget**: Explain how the solution will measure and meet the ≤10s (target 5s) analysis time for 15–30s
  clips.
- **Credential Handling**: Enumerate required environment variables or secret references and how they are documented.
- **Iteration Plan**: Outline intended increments or experiments and how outcomes will be captured for the team.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Run `uv run pytest -k '[marker]'` to
verify and deliver [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - reference the exact `uv run pytest` command]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - reference the exact `uv run pytest` command]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Constitutional Constraints *(mandatory)*

- **CC-001**: Feature MUST document linting hooks (Python via `uv run ...`, frontend ESLint) that apply to this scope.
- **CC-002**: Feature MUST include or reference pytest coverage executed via `uv run pytest`.
- **CC-003**: Feature MUST describe how Tailwind + shadcn/ui components remain accessible and responsive.
- **CC-004**: Feature MUST record expected analysis latency and instrumentation supporting the ≤10s target for 15–30s
  clips.
- **CC-005**: Feature MUST outline environment variables or secrets touched and their storage location (no repository
  secrets).
- **CC-006**: Feature MUST state iteration checkpoints or experiment logging plans that enable fast adjustments.

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

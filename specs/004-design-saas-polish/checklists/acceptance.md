# Acceptance Checklist: Design & SaaS Polish

**Purpose**: Validate acceptance-focused requirements for Feature 004 before implementation sign-off
**Created**: 2025-11-03
**Feature**: [specs/004-design-saas-polish/spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 Are requirements documenting theme persistence also ensuring every monitoring panel remains readable in both themes with the persisted choice? [Completeness, Spec §FR-002, Spec §User Story 1 Scenario 2]
- [x] CHK002 Do the backend and frontend requirements state how updated model parameters apply to the very next analysis run without manual service restarts? [Completeness, Spec §FR-006, Spec §User Story 2 Scenario 2]
- [x] CHK003 Are metrics requirements explicit that dashboard values must reflect newly uploaded or analysed clips, including the backend triggers that update aggregates? [Completeness, Spec §FR-008, Spec §FR-009, Spec §User Story 3 Scenario 1]

## Requirement Clarity

- [x] CHK004 Is the masking requirement for the Hafnia API key described precisely so the UI never reveals stored secrets while still signalling configuration status? [Clarity, Spec §FR-005]
- [x] CHK005 Is the term "subsequent analyses" defined so teams know exactly when new settings take effect (enqueue time, start time, or completion)? [Clarity, Spec §User Story 2 Scenario 2]

## Requirement Consistency

- [x] CHK006 Do config persistence rules align between backend services and frontend caching/hook assumptions so there is no conflicting guidance about refresh behaviour? [Consistency, Spec §FR-006, Plan §Technical Context]
- [x] CHK007 Are theme persistence requirements consistent with feature-flag defaults so flag overrides cannot force a different theme state than the stored preference? [Consistency, Spec §FR-002, Spec §FR-007]

## Acceptance Criteria Quality

- [x] CHK008 Can the requirement for metrics reacting to new clips be validated with measurable polling cadence or latency thresholds tied to success criteria? [Acceptance Criteria, Spec §SC-003, Spec §FR-009]
- [x] CHK009 Do CI requirements enumerate the exact commands and pass/fail signals that must show green on PRs to satisfy the acceptance gate? [Acceptance Criteria, Spec §FR-010, Spec §SC-004]

## Scenario Coverage

- [x] CHK010 Are scenarios covered for settings changes made while analyses are in-flight, clarifying how ongoing versus new jobs consume the updated parameters? [Coverage, Spec §FR-006, Spec §User Story 2 Scenario 2, Gap]
- [x] CHK011 Are there documented zero-data and post-first-upload scenarios for metrics so acceptance covers both empty-state and active dashboards? [Coverage, Spec §Edge Cases, Spec §User Story 3 Scenario 1]

## Edge Case Coverage

- [x] CHK012 Is behaviour defined for theme persistence when reduced-motion is requested, ensuring accessibility without animation regressions? [Edge Case, Spec §Edge Cases, Spec §FR-002]
- [x] CHK013 Are requirements describing how the system responds when a Hafnia API key is removed or fails validation, including operator messaging and analysis impact? [Edge Case, Spec §Edge Cases, Spec §FR-005]

## Non-Functional Requirements

- [x] CHK014 Are accessibility and contrast expectations quantified (e.g., WCAG AA ratios) for both themes to support acceptance of readability claims? [Non-Functional, Spec §Constitution Accessible UI]
- [x] CHK015 Is the decision to defer CLS-specific performance targets documented so acceptance teams know the demo scope excludes that metric? [Non-Functional, Gap]

## Dependencies & Assumptions

- [x] CHK016 Are dependencies between config storage migrations and acceptance of SaaS settings captured so checklist users know prerequisites for validation? [Dependencies, Spec §Assumptions, Tasks §Phase 2]
- [x] CHK017 Is the assumption that settings propagate without restarting the server validated with ops/infrastructure stakeholders? [Assumption, Spec §Assumptions, Spec §User Story 2 Scenario 2]

## Ambiguities & Conflicts

- [x] CHK018 Is any potential conflict between the metrics staleness limit and the polling cadence resolved so acceptance criteria remain unambiguous? [Ambiguity, Spec §SC-003, Spec §FR-009]

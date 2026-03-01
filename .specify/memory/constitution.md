<!--
Sync Impact Report

- Version change: UNKNOWN (template) → 0.1.0
- Modified principles:
	- [PRINCIPLE_1] Template → Single Responsibility & Separation of Concerns
	- [PRINCIPLE_2] Template → Code Quality & Testability
	- [PRINCIPLE_3] Template → Maintainable Interfaces & Explicit Contracts
	- [PRINCIPLE_4] Template → Dependency Direction & Inversion
	- [PRINCIPLE_5] Template → Simplicity, YAGNI & Justified Complexity
- Added sections: Development Workflow (clarified)
- Removed sections: none
- Templates requiring updates: .specify/templates/plan-template.md ✅ updated
	.specify/templates/spec-template.md ⚠ pending review
	.specify/templates/tasks-template.md ⚠ pending review
- Follow-up TODOs: none
-->

# vigil Constitution

## Core Principles

### Single Responsibility & Separation of Concerns (NON-NEGOTIABLE)
Every module, package, or service MUST have a single, well-defined responsibility. Code boundaries
are authoritative: layers (e.g., core/domain, services, adapters, cli/api) MUST not violate
separation of concerns by importing across layers in a way that creates circular or tangled
dependencies. Architectural violations MUST be justified in a documented design note and explicitly
approved in the PR description.

Rationale: Clear separation improves reasoning, testability, and safe independent evolution.

### Code Quality & Testability (NON-NEGOTIABLE)
All production code MUST be covered by automated tests that verify observable behavior. Unit tests
MUST cover public behavior of small units; integration tests MUST cover cross-module contracts for
critical paths. Pull requests introducing production code MUST include tests and demonstrate they
fail before implementation when applicable (test-first encouraged). Linting and formatting tools
MUST run in CI and pass before merge.

Rationale: Tests and automated checks prevent regressions and make refactors safe.

### Maintainable Interfaces & Explicit Contracts
Public interfaces and module boundaries MUST be explicit, documented, and stable. Changes that
break contracts require a documented migration plan, version bump, and clear deprecation window.
Side effects MUST be documented; functions and services SHOULD prefer explicit inputs and outputs
over implicit global state.

Rationale: Explicit contracts enable independent development and clear upgrade paths.

### Dependency Direction & Inversion
Dependencies MUST point inward toward stable business logic. Higher-level modules (apps/cli) MAY
depend on lower-level modules (libraries), but libraries MUST NOT depend on application-specific
code. Where necessary, apply dependency inversion (interfaces/abstractions) so core logic remains
implementation-agnostic. Package boundaries MUST be enforced by CI checks or code review.

Rationale: Controlling dependency direction keeps the core easily testable and reusable.

### Simplicity, YAGNI & Justified Complexity
Designs MUST default to the simplest solution that meets measurable success criteria. New complexity
is allowed only when justified with a short rationale and measurable goals (performance, safety,
scalability). Large architectural changes MUST include a migration plan and tests demonstrating
benefit.

Rationale: Simplicity reduces maintenance cost and cognitive load; justified complexity guards
against premature optimization.

## Additional Constraints

- Tooling: Projects MUST include a formatter (e.g., Prettier, black), a linter (e.g., eslint, flake8),
	and CI checks that run tests and static analysis on every PR.
- Observability: Critical services MUST emit structured logs and errors; tracing and metrics are
	REQUIRED where latency or correctness is business-critical.
- Versioning: Public libraries and APIs MUST follow semantic versioning; breaking changes MUST be
	represented by a MAJOR version bump and documented migration steps.

## Development Workflow

- PR Requirements: Every PR MUST include a short design note when touching architecture, a list
	of tests added/updated, and a `Constitution Checklist` section in the PR template confirming
	adherence to the principles above.
- Code Review: At least one reviewer with domain knowledge MUST approve architectural changes; two
	approvals are required for breaking or high-risk changes.
- Quality Gates: CI MUST enforce linting, formatting, unit tests, and integration tests for affected
	subsystems before merging.

## Governance

Amendments: Proposals to amend this constitution MUST be submitted as a PR that:

- Explains the change and rationale.
- Indicates the semantic version bump (MAJOR, MINOR, PATCH) with justification.
- Includes a migration plan for any operational or developer-facing impact.

Approval: Amendments require approval from two maintainers or one maintainer plus an external
reviewer for significant governance changes. Emergency fixes may be applied then ratified via PR.

Versioning Policy:

- MAJOR: Backward-incompatible principle removals or redefinitions.
- MINOR: Addition of a new principle or material expansion of guidance.
- PATCH: Wording clarifications, typos, and non-semantic refinements.

Compliance: PRs that change production code MUST include a checklist demonstrating which
principles apply and how they were satisfied. Non-compliance MUST be documented and tracked with
an explicit remediation plan.

**Version**: 0.1.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28

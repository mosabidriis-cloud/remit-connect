# REOS AI Entry Point

CLAUDE.md is the primary entry point for AI agents working in this repository.

CURRENT_SPRINT.md is the single source of truth for active sprint scope.

README.md is the documentation index for the REOS AI documentation framework.

## Documentation Map

### Entry Point

- CLAUDE.md - required reading order and operating rules for AI agents.

### Authoritative Sprint Scope

- CURRENT_SPRINT.md - single source of truth for active sprint, module, milestone, allowed directories, and acceptance criteria.
- PROJECT_STATE.md - fast-glance operational snapshot (branch, sprint, module, milestone, tag, build status).

### Business and Workflow

- BUSINESS_RULES.md - frozen business rules and approved business flow.
- LIFECYCLE.md - canonical Shared Batch lifecycle states and allowed transitions.
- ROADMAP.md - completed, active, and upcoming sprint sequencing.
- MODULE_STATUS.md - status, sprint, completion, and notes for every REOS module.
- REPORTING_STANDARDS.md - canonical report categories, layout, filters, exports, table behavior, and reporting data-source rules.
- UI_GUIDELINES.md - canonical UI, component, and report layout conventions.
- PROOF_MANAGEMENT.md - canonical architecture and design reference for the Proof Management module (Sprint 14).
- REPORTING_ARCHITECTURE.md - canonical architecture and design reference for the Reporting module and dashboards (Sprint 16). Subordinate to REPORTING_STANDARDS.md.
- REPORTING_PROJECTION_LAYER.md - canonical design for the Reporting Projection Layer: projection models, the single projection service, data ownership, the dependency contract, and persistence future-compatibility (Sprint 16). Subordinate to REPORTING_ARCHITECTURE.md.

### Architecture and Engineering

- ARCHITECTURE.md - REOS module boundaries, ownership boundaries, and persistence boundary.
- WORKFLOW.md - required implementation process and reporting expectations.
- CODING_RULES.md - engineering standards and technology stack.
- DEFINITION_OF_DONE.md - completion checklist aligned with the implementation workflow.
- TECH_DEBT.md - known technical debt (architecture, UI, performance, testing, persistence, security, refactoring).

### Governance

- DECISIONS.md - architectural decision log.
- CHANGELOG.md - completed framework and sprint milestones only.
- ARCHITECT_REVIEW_CHECKLIST.md - mandatory post-implementation architecture review.
- AI_IMPLEMENTATION_TEMPLATE.md - implementation prompt and report template.

## Precedence

Where documents in this framework conflict: CURRENT_SPRINT.md governs active sprint scope, and CLAUDE.md governs AI agent process. PROJECT_STATE.md and MODULE_STATUS.md are snapshots, not authorities. If any other conflict is found, report it as a blocker rather than resolving it by assumption.

Do not proceed until CLAUDE.md and CURRENT_SPRINT.md have been read.

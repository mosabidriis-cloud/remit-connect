# CLAUDE.md

This file is the entry point for Claude Code (and any AI agent) working in this repository.

## Startup Procedure

Read, in order:

1. CURRENT_SPRINT.md - single source of truth for active sprint, module, milestone, allowed directories, and acceptance criteria. Where any other document conflicts with CURRENT_SPRINT.md, CURRENT_SPRINT.md governs.
2. PROJECT_STATE.md - fast-glance snapshot of branch, sprint, milestone, tag, and build status.
3. ARCHITECTURE.md - REOS module boundaries and the persistence boundary.

Only after reading these three, inspect implementation files.

## Operating Rules

- Do not scan the repository unless required for the task at hand.
- Modify only the files required by the active sprint.
- Stay within the active sprint scope defined in CURRENT_SPRINT.md.
- Run validation once (TypeScript and/or build, as required by the task).
- Never commit unless explicitly instructed.

## Additional Documentation (consult only as needed)

- BUSINESS_RULES.md - frozen business rules and approved business flow.
- CODING_RULES.md - engineering standards and technology stack.
- WORKFLOW.md - implementation workflow and required reporting.
- UI_GUIDELINES.md - UI, component, and report layout conventions.
- PROOF_MANAGEMENT.md - canonical architecture and design reference for the Proof Management module (Sprint 14).
- REPORTING_ARCHITECTURE.md - canonical architecture and design reference for the Reporting module and dashboards (Sprint 16).
- REPORTING_PROJECTION_LAYER.md - canonical design for the Reporting Projection Layer, the read-only boundary between operational state and reporting (Sprint 16).
- LIQUIDITY_MANAGEMENT.md - canonical architecture and design reference for the Liquidity Management module: branch payout accounts, manual funding, live consumption during Branch Processing, and its own dashboard and reports.
- IMPORT_INTELLIGENCE.md - canonical architecture and design reference for the Import Intelligence ledger: REOS's first real persistence (DEC-016), fingerprinting, duplicate detection, reporting period, and data coverage.
- AUTHENTICATION.md - canonical architecture and design reference for REOS's authentication and authorization (Production Readiness Phase 1, DEC-018): Supabase Auth, the `profiles` table, the `admin-create-user` Edge Function, and route/branch-level RBAC.
- OPERATIONAL_PERSISTENCE.md - canonical architecture and design reference for REOS v1.0 Production Readiness Phase 2: migrating the live in-memory operational stores to Supabase, one module at a time. Complete (Milestone 1: Shared Batch/Beneficiary/Assignment, DEC-019; Milestone 2: Branch Processing Queue/Proof Storage, DEC-020; Milestone 3: Liquidity Management, DEC-021).
- AUDIT_TRAIL.md - canonical architecture and design reference for REOS v1.0 Production Readiness Phase 3: a real, persisted, append-only audit trail for operational actions, closing Decision D-5 (DEC-022).
- ROADMAP.md - sprint sequencing and completed work.
- MODULE_STATUS.md - status of every REOS module.
- TECH_DEBT.md - known technical debt.
- DECISIONS.md - architectural decision log.
- REPORTING_STANDARDS.md - canonical reporting standard.
- LIFECYCLE.md - Shared Batch lifecycle states and transitions.
- DEFINITION_OF_DONE.md - sprint completion checklist.
- ARCHITECT_REVIEW_CHECKLIST.md - post-implementation review checklist.
- CHANGELOG.md - completed framework and sprint milestones.
- README.md - documentation index.

## Decision Gate

If a business decision is missing or unclear, stop and report the blocker instead of making assumptions.

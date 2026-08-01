# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 14

## Current Module

Proof Management

## Current Milestone

Milestone 1.5: Assignment Workflow Consolidation - COMPLETE. `branchAssignmentService.ts` is now the one canonical Assignment workflow (DECISIONS.md DEC-006); `assignmentService.createAssignment` is an internal implementation detail, no longer called directly from any page. See CURRENT_SPRINT.md for full detail, including the remaining gaps.

## Current Git Tag

v0.13.2-processing-completion (latest tag). Working tree has uncommitted changes beyond this tag: Sprint 14 Milestones 1 and 1.5 (workflow integration + Assignment consolidation), on top of Sprint 13's stabilization changes. Milestone 1.5 touched `branchAssignmentService.ts`, `SharedBatchUploadPage.tsx`, `BranchAssignmentPage.tsx`; `BranchProcessingPage.tsx` was verified to need no change.

## Build Status

Both checked and passing as of this session (2026-08-01, after Milestone 1.5):
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded.

## Last Completed Milestone

Sprint 14 Milestone 1.5: Assignment Workflow Consolidation. `branchAssignmentService.ts`'s `assignSharedBatchToBranch`/`reassignSharedBatch` now also build the `Assignment` record (internally calling `assignmentService.createAssignment`), in addition to their existing role/lock/reassignment-reason enforcement. `SharedBatchUploadPage.tsx` no longer creates Assignments independently - it calls the canonical service. A latent bug was corrected in the process: `SharedBatchUploadPage.tsx` was setting `SharedBatch.isLocked = true` at upload-confirmation time rather than at assignment time, which would have made the canonical service's pre-existing lock check reject every first assignment; the premature write was removed so `isLocked` now only becomes `true` on actual assignment, matching BUSINESS_RULES.md.

Preceding: Sprint 14 Milestone 1 (Workflow Integration - `sharedBatchStore.ts`, LIFECYCLE.md transitions, Branch Processing -> Proof Management adapter); Sprint 14 Milestone 0 (Architecture & Planning, PROOF_MANAGEMENT.md); Sprint 13 Branch Processing stabilization (3 passes).

## Next Planned Milestone

Not yet defined. Candidates, per CURRENT_SPRINT.md's "Remaining Gaps": (1) `BranchAssignmentPage.tsx` has no access to real uploaded beneficiary data, so its Assignments are always empty; (2) implement the Shared Batch `COMPLETED -> READY_FOR_DOWNLOAD` transition (Open Decision 2, still unresolved); (3) Sprint 13's carried-forward decisions (actor-role gating in Branch Processing, duplicate completion/return validation logic).

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md).
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No frozen business rule may be changed (BUSINESS_RULES.md). Note: Milestone 1.5 corrected a rule-violating bug (isLocked timing) rather than changing a rule.
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).
- Exactly one owner for Assignment creation/management (DECISIONS.md DEC-006, established this milestone).

## Last Updated

2026-08-01

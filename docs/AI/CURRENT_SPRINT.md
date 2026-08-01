# CURRENT SPRINT

Version: 9.0

Status: MILESTONE 1.5 COMPLETE - ASSIGNMENT WORKFLOW CONSOLIDATED

Last Updated: 2026-08-01

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

## Current Sprint

Sprint 14

## Current Module

Proof Management

## Current Milestone

Milestone 1.5: Assignment Workflow Consolidation - COMPLETE.

Milestone 1 (Workflow Integration) discovered two independent Assignment-creation paths. This milestone consolidates them into exactly one canonical Assignment workflow, per DECISIONS.md DEC-006.

### Canonical Assignment Workflow

`branchAssignmentService.ts` (`assignSharedBatchToBranch` / `reassignSharedBatch`) is now the only entry point that may create or update an `Assignment`. It enforces the frozen role rules (Direct Remit Officer assigns; Operations Manager reassigns as an administrative override) and the one-branch-per-batch lock, and now also produces the `Assignment` record itself (beneficiary ready/manual-review/invalid triage) by calling `assignmentService.createAssignment` internally. `assignmentService.createAssignment` is no longer called directly from any page - it is an internal implementation detail of `branchAssignmentService.ts` only.

### What Changed

- `branchAssignmentService.ts`: `assignSharedBatchToBranch` and `reassignSharedBatch` now also build and return the `Assignment` object (calling `assignmentService.createAssignment` internally), in addition to their existing role/lock/reassignment-reason enforcement. New locally-scoped input/result types (`AssignSharedBatchInput`, `ReassignSharedBatchInput`, etc.) extend the existing `types/branchAssignment.ts` interfaces without modifying that file.
- `SharedBatchUploadPage.tsx`: no longer imports or calls `assignmentService.createAssignment` directly. Now calls `branchAssignmentService.assignSharedBatchToBranch`, passing `actorRole: "DIRECT_REMIT_OFFICER"` (this page performs the Direct Remit Officer's own actions, per BUSINESS_RULES.md). This removes the page's inline Assignment business logic (task 6).
- `SharedBatchUploadPage.tsx`: fixed a latent field-semantics bug surfaced by consolidation - `isLocked` was being set to `true` at "Confirm Upload" time, before assignment. BUSINESS_RULES.md's frozen rule is "Batch becomes locked immediately after **assignment**." Left uncorrected, this would have made the canonical service's (correct, pre-existing) lock check reject every first assignment. Removed the premature `isLocked: true` write; `isLocked` is now only ever set `true` by `branchAssignmentService.ts`'s own result, matching the frozen rule precisely. Minor, necessary visible effect: the "locked" indicator in `BatchSummary` now appears after Confirm Assignment rather than after Confirm Upload - this is a correction, not a regression.
- `BranchAssignmentPage.tsx`: now calls the canonical `assignSharedBatchToBranch`/`reassignSharedBatch` (extended signatures) for both first-time assignment and reassignment, tracking the resulting `Assignment` in local state and persisting it via `sharedBatchStore.saveAssignment`. Passes `beneficiaries: []` since this page has no real uploaded beneficiary data (see Remaining Gaps).
- `BranchProcessingPage.tsx`: verified, no change needed. It already consumed `Assignment` objects exclusively via `sharedBatchStore.getAssignmentsByBranch`, which is fed by both pages now.
- `DECISIONS.md`: added DEC-006 recording the canonical-workflow decision. `TECH_DEBT.md`: resolved the now-fixed "no store connects Sprint 12 output to Sprint 13 input" item; added the `BranchAssignmentPage.tsx` empty-beneficiaries limitation below.

### Remaining Gaps (not implemented - out of this milestone's scope)

1. `BranchAssignmentPage.tsx` has no way to select a real, previously-uploaded Shared Batch with real beneficiary data - it only operates on a self-constructed `SharedBatch` built from manually-typed form values. Any Assignment it creates therefore has zero real transactions and will not populate Branch Processing's queue. Only `SharedBatchUploadPage.tsx`'s flow (real uploaded beneficiaries) produces Assignments with actual transactions. Giving this page access to real uploaded batches would be a redesign of its data source, out of this milestone's scope.
2. Sprint 14 Open Decision 2 (unchanged): nothing implements the Shared Batch `COMPLETED -> READY_FOR_DOWNLOAD` transition.
3. Sprint 13's carried-forward decisions (actor-role gating in Branch Processing, duplicate completion/return validation logic) are unaffected and remain open.
4. Proof expiry (`expiresAt` vs `status`) validation gap - unchanged, still open.

## Previous Milestones Summary

- **Sprint 14 Milestone 1 (Workflow Integration)**: connected Shared Batch -> Branch Assignment -> Branch Processing -> Proof Management via the new `sharedBatchStore.ts`, replacing hardcoded sample data; implemented LIFECYCLE.md's ASSIGNED -> PROCESSING -> COMPLETED transitions in code for the first time; added the Branch Processing -> Proof Management read adapter.
- **Sprint 13 (Branch Processing stabilization)**: closed a frozen-business-rule gap (completion without proof, return without a predefined reason); full-module shared-component review; unified branch-completion status terminology to LIFECYCLE.md's canonical `COMPLETED`.

## Sprint Goal

Sprint 14: deliver Proof Management by (1) a decision-gated architecture (Milestone 0, complete - PROOF_MANAGEMENT.md), (2) connecting the existing REOS modules into one continuous in-memory workflow (Milestone 1, complete), and (3) consolidating the Assignment workflow discovered during Milestone 1 into one canonical owner (Milestone 1.5, complete - this document).

## Allowed Directories

src/features/reos/services, src/features/reos/pages/BranchAssignmentPage.tsx, src/features/reos/pages/SharedBatchUploadPage.tsx, src/features/reos/pages/BranchProcessingPage.tsx, docs/AI (per Milestone 1.5's granted scope)

## Acceptance Criteria

- Exactly one owner for creating and managing Branch Assignments. Met - `branchAssignmentService.ts`.
- The second workflow (`SharedBatchUploadPage.tsx`) refactored to consume the canonical implementation instead of creating Assignments independently. Met.
- Shared Batch -> Assignment -> Branch Processing -> Proof Management is the only operational workflow. Met, with the known limitation above (#1) that `BranchAssignmentPage.tsx`'s self-constructed batches produce empty Assignments - an existing structural gap, not a new one.
- Branch Processing consumes Assignment objects only. Verified unchanged - `BranchProcessingPage.tsx` required no edits.
- `SharedBatchUploadPage.tsx` no longer duplicates Assignment business logic. Met.
- No new business features. Met.
- No persistence. Met.
- All existing UI preserved, with one disclosed exception (the `isLocked` timing fix's visible effect on the "locked" badge - necessary, not incidental).
- All business rules preserved (and one latent violation corrected - see What Changed).
- TypeScript compiles. Met.
- Production build succeeds. Met.

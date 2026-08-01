# CURRENT SPRINT

Version: 6.0

Status: STABILIZATION COMPLETE - READY TO CLOSE PENDING BUSINESS DECISIONS

Last Updated: 2026-08-01

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

## Current Sprint

Sprint 13

## Current Module

Branch Processing

## Current Milestone

Branch Processing stabilization - code-complete, pending a business decision (see below).

Sprint 13's Queue UI, Engine, and Completion milestones shipped (tags v0.13.0-branch-processing-ui, v0.13.1-processing-engine, v0.13.2-processing-completion). This stabilization pass then:

- Closed a frozen-business-rule gap in the Branch Processing Queue: transactions could previously be marked COMPLETED with no proof-of-payment, and RETURNED with no predefined Return Reason. Both paths now reuse the existing proof/return-reason components and are gated at the service layer (`branchProcessingQueueService.ts`), matching the rule already correctly enforced by `transactionProcessingService.ts`.
- Migrated `ReturnTransactionDialog`, `TransactionCard`, and `ProcessingProgress` from raw Tailwind classes to the shared `theme.ts` design tokens and `StatusBadge` component, matching the rest of the Branch Processing module.
- Removed a redundant, non-functional "Return Transaction" button in `TransactionProcessingPage.tsx` (the real return action was already handled by `ReturnTransactionDialog`).

A second stabilization pass reviewed the complete Branch Processing module against scope `components/**`, `services/**`, and `pages/BranchProcessingPage.tsx`:

- Migrated `ProofUpload` and `ProofGallery` from raw Tailwind to shared `theme.ts` tokens, completing the shared-component/styling consistency pass across every Branch Processing component (all now match `common/*` and the rest of the Sprint 10 design system).
- Re-verified the transaction lifecycle/state machine in `branchProcessingQueueService.ts`: ASSIGNED -> IN_PROGRESS -> {COMPLETED | ON_HOLD | RETURNED}, ON_HOLD -> IN_PROGRESS, with COMPLETED/RETURNED reachable only through the gated functions added in the prior pass. Internally consistent; no further defects found.
- Reviewed `BranchProcessingPage.tsx`: no unused imports or dead code found. The hardcoded sample `Assignment` data was left in place (see open decision below) - removing it would require either a persistence layer or modifying `BranchAssignmentPage.tsx`, both out of this pass's scope and constraints (no persistence, no unrelated modules).

A final stabilization pass resolved the branch processing status terminology:

- Canonical status identified from LIFECYCLE.md: `COMPLETED` ("All required processing for the batch has been completed"). Because one Shared Batch is assigned to exactly one branch (frozen rule, BUSINESS_RULES.md), a branch finishing its own queue is the same event as the batch reaching `COMPLETED` - it is not the separate, Direct-Remit-Officer-owned `READY_FOR_DOWNLOAD` transition that follows it.
- Removed the duplicate, non-canonical term `READY_FOR_PROOF` (invented in `branchProcessingQueueService.ts`'s `BranchProcessingStatus` type) and replaced it with `COMPLETED` everywhere it appeared: the type definition, the three lock/gate checks, `finalizeBranchProcessing`'s return value, `BranchProcessingQueue.tsx`'s `isLocked` check and status badge label, and the descriptive copy in `BranchProcessingCompletionDialog.tsx` ("ready for proof" -> "completed").
- No workflow behavior changed: same trigger ("Finalize Processing"), same gating, same lock-when-branch-is-done logic - only the status name changed.

Open business decisions (not resolved in this pass, per the Decision Gate - flagged rather than assumed):

1. `BranchProcessingPage.tsx` still renders hardcoded sample `Assignment` data rather than data produced by the Sprint 12 Branch Assignment flow, because no assignment-store/persistence service exists to connect the two sprints' output/input. Building that store is a persistence-boundary decision (see ARCHITECTURE.md, DECISIONS.md DEC-004) beyond a stabilization cleanup.
2. No function in the Branch Processing module (queue or per-transaction flow) checks an actor role before mutating state, unlike `branchAssignmentService.ts` which enforces `actorRole === "DIRECT_REMIT_OFFICER"`. "Finalize Processing" (branch status PROCESSING -> COMPLETED) is triggered from the Branch Officer's own queue UI with no role check. Whether Branch Processing needs role gating is a business decision, not assumed or implemented here.
3. `transactionProcessingService.ts` and `branchProcessingQueueService.ts` still contain structurally similar but independently-typed completion/return validation (proof-required, active-reason-required) against two different data shapes (`CreditToAccountTransaction` vs `BranchProcessingQueueItem`). This is accepted, documented duplication rather than unresolved carelessness: unifying the two would mean adopting one domain model for both flows, which is an architecture decision out of this pass's scope.

## Sprint Goal

Complete the branch-level transaction processing workflow (processing queue, processing engine, and completion) while keeping upstream Shared Batch, branch assignment, and frozen business rules unchanged.

## Allowed Directories

src/features/reos

docs/AI

## Acceptance Criteria

- Changes are limited to Branch Processing scope.
- No unrelated modules are modified.
- No domain types are modified outside Branch Processing scope.
- No frozen business rules are changed.
- Prior sprint deliverables (Enterprise UI, Shared Batch Upload, Branch Assignment) remain unchanged.
- TypeScript compiles.
- Production build succeeds.

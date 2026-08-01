# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 13

## Current Module

Branch Processing

## Current Milestone

Branch Processing stabilization - code review, styling consistency, and status terminology unification complete. Ready to close pending flagged business decisions. See CURRENT_SPRINT.md for full detail.

## Current Git Tag

v0.13.2-processing-completion (latest tag). Working tree has uncommitted changes beyond this tag: business-rule gating fixes in `branchProcessingQueueService.ts` / `BranchProcessingQueue.tsx`; shared-component/theme-token migration in `ReturnTransactionDialog.tsx`, `TransactionCard.tsx`, `ProcessingProgress.tsx`, `TransactionProcessingPage.tsx`, `ProofUpload.tsx`, `ProofGallery.tsx`; branch-status terminology unified to `COMPLETED` in `branchProcessingQueueService.ts`, `BranchProcessingQueue.tsx`, `BranchProcessingCompletionDialog.tsx`.

## Build Status

Both checked and passing as of this session (2026-08-01, after the full stabilization pass):
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded.

## Last Completed Milestone

Branch Processing stabilization (3 passes):
1. Fixed a frozen-business-rule gap where the Branch Processing Queue could mark a transaction COMPLETED with no proof-of-payment or RETURNED with no predefined Return Reason (now gated in `branchProcessingQueueService.ts`, reusing `ProofUpload`/`ProofGallery`/`ReturnTransactionDialog`); migrated `ReturnTransactionDialog`, `TransactionCard`, `ProcessingProgress` to shared theme tokens; removed a redundant non-functional button in `TransactionProcessingPage.tsx`.
2. Full-module review: migrated `ProofUpload`/`ProofGallery` to shared theme tokens (completing style consistency across the module); re-verified the queue state machine is internally consistent; confirmed no unused imports/dead code in `BranchProcessingPage.tsx`.
3. Status terminology unification: identified `COMPLETED` as the canonical branch completion status (LIFECYCLE.md), removed the duplicate invented term `READY_FOR_PROOF` from `branchProcessingQueueService.ts`'s `BranchProcessingStatus` type and every reference to it (service gating checks, `BranchProcessingQueue.tsx`'s lock check and status badge, `BranchProcessingCompletionDialog.tsx`'s copy). No workflow behavior changed.

Preceding milestones: Branch Processing Completion (`v0.13.2-processing-completion`), Branch Processing Engine (`v0.13.1-processing-engine`), Branch Processing Queue UI (`v0.13.0-branch-processing-ui`).

## Next Planned Milestone

Not yet defined. Blocked on business decisions (see CURRENT_SPRINT.md): (1) wiring real Branch Assignment output into Branch Processing input - no assignment-store service exists; (2) whether Branch Processing needs actor-role gating (none exists today, unlike `branchAssignmentService.ts`); (3) whether to unify the two structurally-similar completion/return validation implementations (`transactionProcessingService.ts` vs `branchProcessingQueueService.ts`). See ROADMAP.md ("Upcoming") and TECH_DEBT.md.

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md).
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No frozen business rule may be changed (BUSINESS_RULES.md).
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).

## Last Updated

2026-08-01

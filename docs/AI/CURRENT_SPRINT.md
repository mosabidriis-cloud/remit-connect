# CURRENT SPRINT

Version: 14.0

Status: SPRINT 14 COMPLETE - STABILIZED AND CLOSED

Last Updated: 2026-08-01

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

## Current Sprint

Sprint 14

## Current Module

Proof Management

## Current Milestone

Stabilization & Closure - COMPLETE. Sprint 14 is closed.

## Sprint Goal (delivered)

Deliver Proof Management and connect the REOS modules into one continuous, reachable in-memory operational workflow.

## Milestones Delivered

- **Milestone 0 - Architecture & Planning**: decision-gated Proof Management design recorded in PROOF_MANAGEMENT.md. Established that Proof Management was not greenfield - a substantial legacy implementation already existed and had to be formalized, not rebuilt.
- **Milestone 1 - Workflow Integration**: introduced `sharedBatchStore.ts` as the single in-memory source of truth for `SharedBatch` and `Assignment`; replaced Branch Processing's hardcoded sample data with real Assignments; implemented LIFECYCLE.md's `ASSIGNED -> PROCESSING -> COMPLETED` transitions in code for the first time; added the Branch Processing -> Proof Management read adapter.
- **Milestone 1.5 - Assignment Workflow Consolidation**: established `branchAssignmentService.ts` as the sole Assignment creator (DECISIONS.md DEC-006); removed the duplicate inline Assignment logic from `SharedBatchUploadPage.tsx`; corrected a latent `isLocked`-timing bug that violated BUSINESS_RULES.md.
- **Milestone 2 - Proof Management Integration**: implemented the `COMPLETED -> READY_FOR_DOWNLOAD` transition (`markSharedBatchReadyForDownload`), reusing existing services and components; removed a dead `location.state` fallback.
- **Milestone 2B - Proof Download Navigation**: added `ProofDownloadNavigation.tsx` linking Branch Processing to Proof Download. Surfaced a critical finding (below).
- **Route Integration Audit** (commissioned as "Milestone 0", ran after 2B): discovered that the application's real router `src/routes/AppRoutes.tsx` never mounted `BranchProcessingPage`, `SharedBatchUploadPage`, `BranchAssignmentPage`, `TransactionProcessingPage`, or `ReportsPage`, and that `ReosRoutes.tsx` was dead code. Mounted the five missing routes. This retroactively made Milestones 1, 1.5, and 2B's code actually reachable.
- **Milestone 2C - Circular Dependency Removal**: changed the navigation gate to `COMPLETED` (plus `READY_FOR_DOWNLOAD`, so an opened batch stays reachable on return), and made opening Proof Management perform the approved `COMPLETED -> READY_FOR_DOWNLOAD` transition.
- **Stabilization & Closure** (this milestone): deleted dead code, removed the now-obsolete manual transition button, and verified single ownership across the workflow.

## Stabilization Milestone - What Changed

- **Deleted** `src/features/reos/routes/ReosRoutes.tsx`. Re-confirmed dead before deleting: nothing imported `reosRoutes`. Verified the deletion did not orphan `AppLayout`, which remains in use via `layouts/ReosLayout.tsx`.
- **Removed the obsolete "Mark Ready for Download" button** and all plumbing it required: the button and its `canMarkReady` condition in `BatchDownloadActions.tsx`, the `onMarkReadyForDownload` prop from that component's props type and destructuring, and the `handleMarkReadyForDownload` handler plus its prop pass in `ProofDownloadPage.tsx`. The transition it triggered is now automatic on page open (Milestone 2C), so the button was permanently unreachable. The underlying `markSharedBatchReadyForDownload` service function is retained - it is what the automatic transition calls.
- No other Sprint 14 dead code was found.

## Workflow Verification

Single-ownership checks, performed by inspection rather than assumption:

- **One Assignment workflow**: `createAssignment` has exactly one caller - `branchAssignmentService.ts`. No page or component creates an Assignment directly. (DEC-006 holds.)
- **One Shared Batch lifecycle**: exactly one mutator, `sharedBatchStore.updateSharedBatchLifecycleStatus`. Its four call sites each write one distinct, sequential state - `PROCESSING` and `COMPLETED` from `branchProcessingQueueService.ts`, `READY_FOR_DOWNLOAD` and `DOWNLOADED` from `ProofDownloadPage.tsx`. No competing lifecycle machine, and no state skipped.
- **One Proof workflow**: `proofOfPaymentService.ts` creates proofs; `proofDownloadService.ts` owns summary, downloads, and the two Proof Management transitions. No duplicates.

Shipping verified against the production bundle (not just a passing build): "Transaction Queue" (Branch Processing), "Shared Batch Upload", "Manually assign one Shared Batch" (Branch Assignment), and "Open Proof Download" are each present; "Mark Ready for Download" is now correctly absent.

## Allowed Directories

src/features/reos, src/routes/AppRoutes.tsx (cleanup only), docs/AI (per this milestone's granted scope)

## Acceptance Criteria

- Dead route definition deleted after confirmation. Met.
- Obsolete button and all dead props/handlers/conditions removed. Met.
- Sprint 14 dead code removed. Met.
- Full workflow verified. Met - see Workflow Verification. See the caveat below on end-to-end exercise.
- Exactly one Assignment workflow, one Shared Batch lifecycle, one Proof workflow. Met.
- Documentation synchronized. Met - CURRENT_SPRINT.md, PROJECT_STATE.md, MODULE_STATUS.md, TECH_DEBT.md.
- No features added, no architecture redesigned, no business rules changed. Met.
- TypeScript compiles; production build succeeds. Met.

## Caveat on "verified"

Verification was static: single-ownership confirmed by call-site inspection, and reachability confirmed by route registration plus bundle content. The workflow was **not** exercised end to end at runtime in a browser. Two known conditions would constrain such a run: `/reos/*` routes sit behind `ProtectedReosRoute` (requires `localStorage["reos-auth"] === "true"`), and only the Shared Batch Upload flow currently produces a batch carrying real transactions (see TECH_DEBT.md, `BranchAssignmentPage.tsx`). A runtime smoke test is the recommended first task of the next sprint.

## Unresolved Business Decisions (carried forward, deliberately untouched)

1. `BranchAssignmentPage.tsx` cannot select a real uploaded Shared Batch, so Assignments it creates carry no transactions.
2. `proofOfPaymentService.markProofDownloaded` is never called - needs a ZIP-vs-individual product decision.
3. Proof expiry is not enforced against `expiresAt`.
4. Branch Processing has no actor-role gating, unlike `branchAssignmentService.ts` and `proofDownloadService.ts`.
5. Whether to unify the two structurally similar completion/return validation implementations (`transactionProcessingService.ts` vs `branchProcessingQueueService.ts`).

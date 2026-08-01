# Proof Management

Sprint 14 architecture and design reference. This document is the canonical specification for the Proof Management module - the bridge between Branch Processing completion and the Direct Remit Officer's proof-of-payment handoff back to Direct Remit.

Status: DESIGN ONLY. No application source code was written or modified to produce this document. Implementation has not started.

## Grounding Note - Read Before Implementing

Proof Management is **not a greenfield module**. A substantial implementation already exists in the repository, predating the current Sprint 10-13 numbering (legacy tag `v0.7-proof-download`; see MODULE_STATUS.md):

- Types: `proofOfPayment.ts`, `proofDownload.ts`
- Services: `proofOfPaymentService.ts`, `proofDownloadService.ts`
- Components: `ProofUpload.tsx`, `ProofGallery.tsx`, `ProofDownloadPanel.tsx`, `BatchDownloadSummary.tsx`, `DownloadHistory.tsx`, `BatchDownloadActions.tsx`
- Page: `ProofDownloadPage.tsx`, route `reos/shared-batches/:batchId/proof-download` (already registered)

This design formalizes and extends that existing implementation. It does **not** propose replacing or duplicating it. Sprint 13's stabilization pass found and fixed exactly this kind of duplication (a second, parallel Branch Processing status machine); Sprint 14 must not repeat that mistake by inventing a second proof/download system.

## 1. Business Purpose

Proof Management captures, retains, and delivers proof-of-payment evidence for completed Credit-to-Account transactions, and closes out the Shared Batch lifecycle by handing that evidence to the Direct Remit Officer. Per BUSINESS_RULES.md, REOS's responsibility for a batch ends once the Direct Remit Officer has downloaded its proof files and returned them to Direct Remit - Proof Management is the module that fulfills that handoff.

## 2. Complete Workflow: Branch Processing (COMPLETED) -> Proof Management -> Reporting

1. Branch Officer processes assigned transactions in Branch Processing. Each transaction completion already requires at least one proof-of-payment upload (frozen rule, enforced today in `transactionProcessingService.completeTransaction` and `branchProcessingQueueService.completeBranchProcessingQueueItem`).
2. When a branch finishes all assigned transactions, Branch Processing reaches its branch-level `COMPLETED` status (`branchProcessingQueueService.finalizeBranchProcessing`, Sprint 13).
3. **[Gap - see Open Decision 1]** The underlying `SharedBatch.lifecycleStatus` must move PROCESSING -> COMPLETED (LIFECYCLE.md) to reflect that branch-level completion. No existing code performs this today.
4. Direct Remit Officer moves the batch COMPLETED -> READY_FOR_DOWNLOAD (LIFECYCLE.md Role Ownership: this transition belongs to the Direct Remit Officer). **[Gap - see Open Decision 2]** No service function or UI action for this transition exists yet; `proofDownloadService.ts` today assumes a batch already arrives in `READY_FOR_DOWNLOAD`.
5. Direct Remit Officer opens Proof Download (existing `ProofDownloadPage.tsx`), reviews `BatchDownloadSummary`, and downloads proofs individually (`downloadIndividualProof`) or as a ZIP (`downloadProofZip`) - both already implemented and already role-gated to `DIRECT_REMIT_OFFICER`. Each action is recorded as a `ProofDownloadHistoryEntry`.
6. Direct Remit Officer confirms and marks the batch DOWNLOADED (`markBatchDownloaded`, already implemented, already correct: READY_FOR_DOWNLOAD -> DOWNLOADED, Direct Remit Officer only).
7. Direct Remit Officer uploads the downloaded proofs back to Direct Remit. This step is external to REOS and out of scope (BUSINESS_RULES.md: "REOS responsibility ends after the Direct Remit Officer downloads proof files").
8. Proof files remain `TEMPORARY` and expire 90 minutes after upload (already implemented, `proofOfPaymentService.createProofOfPayment`). Only `ProofOfPaymentMetadata` persists once the file is gone. No automatic cleanup scheduler is in scope - BUSINESS_RULES.md explicitly lists this as "Out of Scope Unless Explicitly Approved."
9. Reporting consumes the result. `report.ts` already defines `READY_FOR_DOWNLOAD_BATCHES` and `DOWNLOADED_BATCHES` (Volume Reports) and `PROOF_COMPLETION` (Performance Reports) as report types. Volume Report definitions exist in `reportService.ts` today; Performance Report definitions (including `PROOF_COMPLETION`) do not (TECH_DEBT.md). Proof Management should expose `BatchDownloadSummary` / `ProofDownloadHistoryEntry`-shaped data that a future Performance Reports implementation can consume without needing to know Proof Management's internals.

## 3. State Machine

Two existing, canonical state machines. Proof Management introduces **no new status enum**.

**A. Shared Batch lifecycle** (LIFECYCLE.md, batch-level; Proof Management owns only the tail end):

```
ASSIGNED -> PROCESSING -> COMPLETED -> READY_FOR_DOWNLOAD -> DOWNLOADED
```

Proof Management operates within `COMPLETED -> READY_FOR_DOWNLOAD -> DOWNLOADED`. `ASSIGNED`/`PROCESSING` belong to Branch Assignment/Branch Processing.

**B. Proof file lifecycle** (`ProofOfPaymentFileStatus`, per-file, already defined in `proofOfPayment.ts`):

```
TEMPORARY -> DOWNLOADED   (markProofDownloaded, already implemented)
TEMPORARY -> EXPIRED      (time-based, 90 minutes after upload; see Open Decision 3 - no
                            transition function exists today, and per BUSINESS_RULES.md an
                            automatic scheduler is out of scope)
```

## 4. Domain Objects

Already implemented (adopt, do not rebuild):

- `ProofOfPayment`, `ProofOfPaymentMetadata` (`proofOfPayment.ts`)
- `ProofDownloadBatch`, `BatchDownloadSummary`, `ProofDownloadHistoryEntry`, `ProofDownloadRequest`, `MarkBatchDownloadedInput`, `DownloadableProof`, `ProofDownloadActorRole` (`proofDownload.ts`)

Gap identified, not built here: no object records the COMPLETED -> READY_FOR_DOWNLOAD transition the way `ProofDownloadHistoryEntry` records download actions. At implementation time, consider a symmetrical input/history pair (e.g. `MarkBatchReadyForDownloadInput`, analogous to `MarkBatchDownloadedInput`) so the full COMPLETED -> READY_FOR_DOWNLOAD -> DOWNLOADED chain is auditable the same way end to end. This is a recommendation for the implementation sprint, not a type defined here.

## 5. Component Architecture

Already implemented (adopt): `ProofUpload`, `ProofGallery` (both already migrated to shared `theme.ts` tokens during Sprint 13 stabilization), `ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions` (still on raw Tailwind classes - flag for a theme-token consistency pass during Sprint 14 implementation, following the same precedent already applied to Branch Processing).

Gap identified, not built here: no UI exists for the Direct Remit Officer's COMPLETED -> READY_FOR_DOWNLOAD action. At implementation time, this likely wants one new confirmation-style component, following the existing `BranchProcessingCompletionDialog` pattern rather than inventing a new interaction style.

## 6. Service Architecture

Already implemented (adopt): `proofOfPaymentService.ts` (create / mark-downloaded / metadata), `proofDownloadService.ts` (summary, downloadable-proof filtering, ZIP download, individual download, mark-batch-downloaded). Both already role-gate correctly (`assertDirectRemitOfficer` in `proofDownloadService.ts`) - this is the pattern to keep following, and the pattern Branch Processing's open decisions (TECH_DEBT.md) recommend Branch Processing itself should adopt.

Gap identified, not built here: no service function performs COMPLETED -> READY_FOR_DOWNLOAD. At implementation time, this belongs in `proofDownloadService.ts` (not a new service file), following the exact shape of `markBatchDownloaded` - role-gated, single lifecycle-status transition, returns `{ batch, history }`.

## 7. Page Architecture

Already implemented (adopt): `ProofDownloadPage.tsx`, route `reos/shared-batches/:batchId/proof-download` (already registered in `ReosRoutes.tsx`). No new page or route is required for the core flow. The COMPLETED -> READY_FOR_DOWNLOAD action can live on this same page as a new action, gated on `lifecycleStatus === "COMPLETED"`, consistent with "no routing changes" guidance carried over from Sprint 13.

## 8. Integration Points

- **Shared Batch**: Proof Management reads/writes `SharedBatch.lifecycleStatus` (`COMPLETED` / `READY_FOR_DOWNLOAD` / `DOWNLOADED`) and reflects Shared Batch identity fields into `ProofDownloadBatch`. No Shared Batch fields are redefined.
- **Branch Assignment**: no direct integration. Branch Assignment's output flows into Branch Processing, not directly into Proof Management.
- **Branch Processing**: the primary upstream dependency, and the largest risk (see Open Decision 1). Proof Management's precondition - a `COMPLETED` batch with real proofs - depends on Branch Processing's branch-level `COMPLETED` status reaching `SharedBatch.lifecycleStatus`. That connection does not exist in the codebase today.
- **Reporting**: downstream consumer. `READY_FOR_DOWNLOAD_BATCHES`, `DOWNLOADED_BATCHES` (Volume) and `PROOF_COMPLETION` (Performance) report types already exist in `report.ts`; only the Volume definitions are implemented in `reportService.ts` today (TECH_DEBT.md).

## 9. Business Rules

Restated from BUSINESS_RULES.md, scoped to Proof Management. Frozen - not redefined here:

- A transaction may contain multiple proof-of-payment screenshots.
- Proof uploads consist only of image files.
- A transaction cannot be completed until at least one proof exists.
- Proof-of-payment files are temporary and are automatically deleted 90 minutes after upload.
- Only proof metadata remains permanently once a file is gone.
- REOS responsibility ends after the Direct Remit Officer downloads proof files.
- Only the Direct Remit Officer may perform proof download actions and mark a batch downloaded (already enforced in `proofDownloadService.ts`). Operations Manager has read-only visibility (already enforced in `ProofDownloadPage.tsx`'s `actorCanDownload` gate).

## 10. Validation Rules

Already enforced today:

- Proof file type must start with `image/` (`createProofOfPayment`).
- A batch must be `READY_FOR_DOWNLOAD` or `DOWNLOADED` before any download action is permitted (`assertBatchReadyForDownload`).
- A batch must be `READY_FOR_DOWNLOAD` before it can be marked `DOWNLOADED` (`markBatchDownloaded`).
- Proofs with `status === "EXPIRED"` are excluded from download listings (`getDownloadableProofs`).
- At least one downloadable proof must exist before a ZIP download is attempted (`downloadProofZip`).

To define at implementation time:

- A batch must be `COMPLETED` before it can be moved to `READY_FOR_DOWNLOAD`.
- Whether `expiresAt` should be checked against the current time at read-time, in addition to the `status` field (see Open Decision 3).

## 11. Definition of Done (for the future implementation sprint - not applicable to this design-only pass)

- Open Decisions 1-4 below are resolved and recorded in DECISIONS.md.
- COMPLETED -> READY_FOR_DOWNLOAD transition implemented in `proofDownloadService.ts`, role-gated to Direct Remit Officer, following the `markBatchDownloaded` pattern.
- Branch Processing's branch-level `COMPLETED` status is wired to `SharedBatch.lifecycleStatus`, or an explicit decision is recorded that this remains manual/out of scope.
- `ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions` migrated to shared theme tokens.
- No new domain types or status enums introduced beyond what is already defined.
- TypeScript compiles; production build succeeds (standard REOS gate, per DEFINITION_OF_DONE.md).
- CURRENT_SPRINT.md, PROJECT_STATE.md, MODULE_STATUS.md updated to reflect actual implementation status.

## Open Business Decisions

1. **Blocking**: no code connects Branch Processing's branch-level `COMPLETED` status (or Branch Assignment's output) to `SharedBatch.lifecycleStatus`. Until resolved, Proof Management cannot be exercised end-to-end with real workflow data - only with hand-built sample data, repeating Branch Processing's current situation. Resolving this is a persistence/data-flow decision and is explicitly out of scope for this design-only sprint.
2. Should the COMPLETED -> READY_FOR_DOWNLOAD transition be a manual Direct Remit Officer action (as LIFECYCLE.md's Role Ownership section implies) or automatic once Branch Processing completes? This design assumes manual/explicit, matching LIFECYCLE.md's text, but it has not been confirmed.
3. Should proof availability be checked against `expiresAt` at read-time (in addition to the `status` field)? Today `getDownloadableProofs` only filters on `status !== "EXPIRED"`; since nothing sets that status automatically (no scheduler, per BUSINESS_RULES.md), a proof past its 90-minute window but never explicitly marked `EXPIRED` would still appear downloadable. This is a latent correctness gap, not assumed away here.
4. Branch Processing's own open decisions (assignment-store wiring, actor-role gating, duplicate completion/return validation logic - all in TECH_DEBT.md and CURRENT_SPRINT.md) are prerequisites for Proof Management's end-to-end integration and are inherited by Sprint 14, not resolved by it.

# Technical Debt

Tracks known future technical improvements. Only items already evidenced in the repository or existing docs/AI files are recorded here - nothing is speculative.

## Architecture

- Reporting: the `PERFORMANCE` report category and its report types (`BRANCH_PERFORMANCE`, `OFFICER_PERFORMANCE`, `PROCESSING_TIME`, `RETURN_RATE`, `PROOF_COMPLETION`, `WORKLOAD`) are defined in `types/report.ts` but have no corresponding definitions in `reportService.ts` (only `VOLUME` report definitions exist). REPORTING_STANDARDS.md requires both categories.
- Proof Management and Reporting modules predate the Sprint 10 Enterprise UI reset and are not represented in ROADMAP.md's current sprint numbering. See MODULE_STATUS.md ("Open Item").
- RESOLVED (Sprint 14 Milestone 1 + 1.5): Shared Batch, Branch Assignment, Branch Processing, and Proof Management now share one in-memory store (`sharedBatchStore.ts`) and one canonical Assignment workflow (`branchAssignmentService.ts`). Previously this section noted the missing store and a second, duplicate Assignment-creation path in `SharedBatchUploadPage.tsx`; both are resolved. See DECISIONS.md DEC-006.
- RESOLVED (Sprint 15 M3): `src/features/reos/constants/routes.ts` was unreferenced - nothing imported it, and it duplicated (as string constants) route paths declared in `src/routes/AppRoutes.tsx`. Deleted, same resolution as the Sprint 14 deletion of `ReosRoutes.tsx`.
- `src/features/reos/routes/` is now an empty directory containing only a placeholder `index.ts` (`export {};`), after `ReosRoutes.tsx` was deleted in Sprint 14 stabilization. The stub matches the project's existing barrel convention (`src/features/reos/index.ts` is identical), so it was left in place; remove if the convention is dropped.
- `BranchAssignmentPage.tsx` has no way to select a real, previously-uploaded Shared Batch with real beneficiary data - it only ever operates on a self-constructed `SharedBatch` built from manually-typed form values (`createUnassignedSharedBatch`), so any Assignment it creates has zero real transactions (`beneficiaries: []`) and will not populate Branch Processing's queue. Only `SharedBatchUploadPage.tsx`'s flow (which has real uploaded beneficiary data) produces Assignments with actual transactions. Discovered during Sprint 14 Milestone 1.5 consolidation; not resolved because giving `BranchAssignmentPage.tsx` access to real uploaded batches would be a redesign of how it sources data, out of that milestone's scope.

## UI

- Report export actions (Excel, PDF, Print) are rendered in `ReportExportActions.tsx` but are disabled/non-functional, so REPORTING_STANDARDS.md's Export Standard is not yet met.
- `layout/Sidebar.tsx` hardcodes literal placeholder tokens in five nav links, not real ids: `/reos/branches/BRANCH_ID/processing`, `/reos/branches/BRANCH_ID/processing/BATCH_ID/transactions/TRANSACTION_ID`, `/reos/shared-batches/BATCH_ID/proof-download`, `/reos/administration/users/USER_ID`, `/reos/administration/users/USER_ID/edit`. Confirmed sidebar-wide (not just proof-download, as previously recorded) during Sprint 15 M1 runtime verification. Belongs to the Enterprise UI shell (Sprint 10). Not fixed - what each should resolve to for a global static sidebar with no "current record" context is a product decision, not an implementation detail.
- RESOLVED (Sprint 15 M1.5): no client-side path connected a confirmed Shared Batch Assignment to that branch's Branch Processing queue. Fixed with `components/BranchProcessingNavigation.tsx` (mirrors `ProofDownloadNavigation.tsx`), rendered by `SharedBatchUploadPage.tsx` once assignment is finalized. Verified live: real branch id, genuine client-side navigation, correct queue contents on arrival.
- RESOLVED (Sprint 15 M2): the four remaining Proof Management components (`ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions`) used raw Tailwind classes; migrated to the shared `theme.ts` design tokens. `ProofDownloadPanel.tsx` also now reuses the existing `common/DataTable.tsx`/`common/EmptyState.tsx` instead of a hand-rolled table. Verified live, no regression.
- Minor (found during Sprint 15 M2 verification): `BranchProcessingPage.tsx`'s Proof Download navigation link does not appear immediately after Finalize Processing within the same page mount - only after leaving and returning. Its `useMemo` depends on `branchAssignments`, which doesn't change when `finalizeBranchProcessing` mutates the store as a side effect in a sibling component (`BranchProcessingQueue.tsx`). Not a regression - already present (though not previously called out) during Sprint 15 M1.75's own verification. Not fixed - low severity, and the data is correct once the page is genuinely revisited.
- RESOLVED (Sprint 15 M4): `getBatchDownloadSummary`'s `downloadStatus` field was typed to only `"READY_FOR_DOWNLOAD" | "DOWNLOADED"`, so it mislabeled a `COMPLETED` batch. Widened to the full `SharedBatchLifecycleStatus` (`types/proofDownload.ts`) and now set directly from `batch.lifecycleStatus`.

## Correctness

- RESOLVED (Sprint 15 M1.75): `branchProcessingQueueService.hydrateBranchProcessingQueue` was not idempotent - it ran on every mount of `BranchProcessingQueue.tsx` and unconditionally rebuilt that branch's queue from scratch (fresh `ASSIGNED` status, empty `proofs`, branch-level status reset to `PROCESSING`), silently discarding real completed work whenever a user navigated away and back. Pre-dated Sprint 14/15 (Sprint 13 code). Fixed by preserving existing queue items by their deterministic id and no longer resetting branch-level status on rehydration; only genuinely new assignment-beneficiary pairs get fresh items. Verified live against the exact reproduction that found it - see CURRENT_SPRINT.md, "M1.75".
- `proofOfPaymentService.markProofDownloaded` (sets an individual `ProofOfPayment.status` to `DOWNLOADED`) is never called anywhere, including by `downloadIndividualProof`/`downloadProofZip`. Wiring it in needs a write path back into `branchProcessingQueueService`'s queue-item state and an unstated product decision: does a ZIP download mark every included proof downloaded, or only individually-downloaded ones? Left as an open business decision, not assumed.
- Proof expiry is only enforced via the `status` field, never against `expiresAt`. Nothing automatically flags an expired proof as `EXPIRED` (no scheduler - BUSINESS_RULES.md puts one out of scope), so a proof past its 90-minute window but never explicitly marked can still appear downloadable.

## Linting (newly surfaced, Sprint 15 Stabilization & Closure)

`npm run lint` had not been run as part of this documentation-driven workflow before Sprint 15 Stabilization & Closure. Running it surfaced pre-existing issues, all in files Sprint 15 did not modify (verified against `git status` - none of these files appear in this session's changes):

- `BranchProcessingQueue.tsx`: three `react-hooks/set-state-in-render` errors - `setQueueItems`/`setSelectedItemId`/`setBranchStatus` are called synchronously inside a `useMemo`, which the current ESLint React Hooks rules flag as a potential infinite-loop risk. Pre-dates Sprint 14/15.
- `ProofDownloadPage.tsx`: one `react-hooks/set-state-in-effect` error - `setBatch` is called synchronously inside the Sprint 14 Milestone 2C auto-transition `useEffect`. Pre-dates Sprint 15.
- `layout/Sidebar.tsx`: two `react-refresh/only-export-components` errors, pre-existing, Enterprise UI shell (Sprint 10).
- `excelValidationService.ts`: two unused-variable errors, pre-existing (Sprint 11).
- Three further errors/warnings in `funding/`, `authService.ts`, `fundingRequestService.ts` - entirely unrelated modules, out of REOS and out of scope.

Not fixed - none are dead code, none were introduced by Sprint 15, and fixing the two React Hooks findings above in files Sprint 15 didn't otherwise touch would exceed this sprint's approved scope. Recommend a follow-up sprint audit `npm run lint` cleanly, particularly the two `set-state-in-*` findings since they sit in files this and the preceding sprint depend on.

## Performance

- None currently known from the repository.

## Testing

- No test files were observed alongside REOS components, services, or pages during this review. A dedicated test directory was not checked, so this is not a confirmed absence - flagged for verification rather than recorded as a confirmed gap.

## Persistence

- Current REOS implementation is in-memory only (ARCHITECTURE.md persistence boundary; DECISIONS.md DEC-004). Data does not survive reload or restart. No persistence layer exists yet, pending explicit sprint approval.

## Security

- None currently known from the repository.

## Refactoring

- None currently known from the repository.

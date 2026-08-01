# Technical Debt

Tracks known future technical improvements. Only items already evidenced in the repository or existing docs/AI files are recorded here - nothing is speculative.

## Architecture

- Reporting: the `PERFORMANCE` report category and its report types (`BRANCH_PERFORMANCE`, `OFFICER_PERFORMANCE`, `PROCESSING_TIME`, `RETURN_RATE`, `PROOF_COMPLETION`, `WORKLOAD`) are defined in `types/report.ts` but have no corresponding definitions in `reportService.ts` (only `VOLUME` report definitions exist). REPORTING_STANDARDS.md requires both categories.
- Proof Management and Reporting modules predate the Sprint 10 Enterprise UI reset and are not represented in ROADMAP.md's current sprint numbering. See MODULE_STATUS.md ("Open Item").
- RESOLVED (Sprint 14 Milestone 1 + 1.5): Shared Batch, Branch Assignment, Branch Processing, and Proof Management now share one in-memory store (`sharedBatchStore.ts`) and one canonical Assignment workflow (`branchAssignmentService.ts`). Previously this section noted the missing store and a second, duplicate Assignment-creation path in `SharedBatchUploadPage.tsx`; both are resolved. See DECISIONS.md DEC-006.
- `src/features/reos/constants/routes.ts` is unreferenced - nothing imports it. It duplicates, as string constants, the route paths now declared in `src/routes/AppRoutes.tsx`. Confirmed unreferenced during Sprint 14 stabilization; not deleted because it predates Sprint 14 and was outside that milestone's named cleanup scope. Same class of hazard as the deleted `ReosRoutes.tsx`: a second, unmounted source of route truth. Recommend deleting or wiring `AppRoutes.tsx` to use it.
- `src/features/reos/routes/` is now an empty directory containing only a placeholder `index.ts` (`export {};`), after `ReosRoutes.tsx` was deleted in Sprint 14 stabilization. The stub matches the project's existing barrel convention (`src/features/reos/index.ts` is identical), so it was left in place; remove if the convention is dropped.
- `BranchAssignmentPage.tsx` has no way to select a real, previously-uploaded Shared Batch with real beneficiary data - it only ever operates on a self-constructed `SharedBatch` built from manually-typed form values (`createUnassignedSharedBatch`), so any Assignment it creates has zero real transactions (`beneficiaries: []`) and will not populate Branch Processing's queue. Only `SharedBatchUploadPage.tsx`'s flow (which has real uploaded beneficiary data) produces Assignments with actual transactions. Discovered during Sprint 14 Milestone 1.5 consolidation; not resolved because giving `BranchAssignmentPage.tsx` access to real uploaded batches would be a redesign of how it sources data, out of that milestone's scope.

## UI

- Report export actions (Excel, PDF, Print) are rendered in `ReportExportActions.tsx` but are disabled/non-functional, so REPORTING_STANDARDS.md's Export Standard is not yet met.
- `layout/Sidebar.tsx` contains a placeholder proof-download link using a literal `BATCH_ID` in place of a real Shared Batch id, so it cannot navigate anywhere useful. Belongs to the Enterprise UI shell (Sprint 10), not Proof Management; left untouched through Sprint 14.
- Four Proof Management components (`ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions`) still use raw Tailwind classes rather than the shared `theme.ts` design tokens adopted across the rest of the module in Sprint 13.
- `getBatchDownloadSummary`'s `downloadStatus` field is typed to only `"READY_FOR_DOWNLOAD" | "DOWNLOADED"` (`types/proofDownload.ts`), so it mislabels a `COMPLETED` batch as `"READY_FOR_DOWNLOAD"` in the summary card. Cosmetic; fixing it requires a `types/**` change.

## Correctness

- `proofOfPaymentService.markProofDownloaded` (sets an individual `ProofOfPayment.status` to `DOWNLOADED`) is never called anywhere, including by `downloadIndividualProof`/`downloadProofZip`. Wiring it in needs a write path back into `branchProcessingQueueService`'s queue-item state and an unstated product decision: does a ZIP download mark every included proof downloaded, or only individually-downloaded ones? Left as an open business decision, not assumed.
- Proof expiry is only enforced via the `status` field, never against `expiresAt`. Nothing automatically flags an expired proof as `EXPIRED` (no scheduler - BUSINESS_RULES.md puts one out of scope), so a proof past its 90-minute window but never explicitly marked can still appear downloadable.

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

# Technical Debt

Tracks known future technical improvements. Only items already evidenced in the repository or existing docs/AI files are recorded here - nothing is speculative.

## Architecture

- Reporting: the `PERFORMANCE` report category and its report types (`BRANCH_PERFORMANCE`, `OFFICER_PERFORMANCE`, `PROCESSING_TIME`, `RETURN_RATE`, `PROOF_COMPLETION`, `WORKLOAD`) are defined in `types/report.ts` but have no corresponding definitions in `reportService.ts` (only `VOLUME` report definitions exist). REPORTING_STANDARDS.md requires both categories.
- Proof Management and Reporting modules predate the Sprint 10 Enterprise UI reset and are not represented in ROADMAP.md's current sprint numbering. See MODULE_STATUS.md ("Open Item").
- RESOLVED (Sprint 14 Milestone 1 + 1.5): Shared Batch, Branch Assignment, Branch Processing, and Proof Management now share one in-memory store (`sharedBatchStore.ts`) and one canonical Assignment workflow (`branchAssignmentService.ts`). Previously this section noted the missing store and a second, duplicate Assignment-creation path in `SharedBatchUploadPage.tsx`; both are resolved. See DECISIONS.md DEC-006.
- `BranchAssignmentPage.tsx` has no way to select a real, previously-uploaded Shared Batch with real beneficiary data - it only ever operates on a self-constructed `SharedBatch` built from manually-typed form values (`createUnassignedSharedBatch`), so any Assignment it creates has zero real transactions (`beneficiaries: []`) and will not populate Branch Processing's queue. Only `SharedBatchUploadPage.tsx`'s flow (which has real uploaded beneficiary data) produces Assignments with actual transactions. Discovered during Sprint 14 Milestone 1.5 consolidation; not resolved because giving `BranchAssignmentPage.tsx` access to real uploaded batches would be a redesign of how it sources data, out of that milestone's scope.

## UI

- Report export actions (Excel, PDF, Print) are rendered in `ReportExportActions.tsx` but are disabled/non-functional, so REPORTING_STANDARDS.md's Export Standard is not yet met.

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

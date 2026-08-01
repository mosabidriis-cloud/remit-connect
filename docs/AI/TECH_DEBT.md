# Technical Debt

Tracks known future technical improvements. Only items already evidenced in the repository or existing docs/AI files are recorded here - nothing is speculative.

## Architecture

- Reporting: the `PERFORMANCE` report category and its report types (`BRANCH_PERFORMANCE`, `OFFICER_PERFORMANCE`, `PROCESSING_TIME`, `RETURN_RATE`, `PROOF_COMPLETION`, `WORKLOAD`) are defined in `types/report.ts` but have no corresponding definitions in `reportService.ts` (only `VOLUME` report definitions exist). REPORTING_STANDARDS.md requires both categories.
- Proof Management and Reporting modules predate the Sprint 10 Enterprise UI reset and are not represented in ROADMAP.md's current sprint numbering. See MODULE_STATUS.md ("Open Item").
- Branch Processing has no service connecting Sprint 12 Branch Assignment output to Sprint 13 Branch Processing input: `assignmentService.createAssignment` builds an `Assignment` object but nothing stores or retrieves it, so `BranchProcessingPage.tsx` renders hardcoded sample data instead. Confirmed during the Sprint 13 stabilization pass; not resolved there because it requires a persistence/data-flow decision (see ARCHITECTURE.md persistence boundary).

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

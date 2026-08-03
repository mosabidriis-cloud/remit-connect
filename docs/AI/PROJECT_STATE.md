# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 17 - Shared Batch Import Modernization. Scope approved 2026-08-02 with five business decisions recorded as DECISIONS.md **DEC-008 through DEC-012**. Implemented milestone by milestone; **M1 complete, M2 onward not started.**

Sprint 16 (Reporting Architecture) delivered Reporting and the Operations Dashboard end to end but was never formally closed - see "Carried Forward" below.

## Current Module

Shared Batch Upload (`excelValidationService.ts`), with a later dependency on `sharedBatchService.parseBankField` (DEC-012).

## Current Milestone

**Sprint 17 M1 (Row Structure Detection) and M2 (Column Contract): COMPLETE.**

M1 located the header row instead of assuming row 1, and skipped leading blank rows, repeated page headers and blank data rows, reporting issues against true spreadsheet row numbers.

M2 added alias-based column resolution (one path for both the legacy and Direct Remit contracts), structural transaction-row detection (DEC-013 - a row is a transaction only if it carries a reference, which is what removes the `TOTAL` subtotal rows), and tolerant amount parsing.

Measured on the real Direct Remit export across both milestones: records **69 -> 66 -> 63** (exactly the real transaction count), missing-column errors **6 -> 2**, amounts parsed **0/63 -> 63/63**, references, names and currencies all mapped. The parsed amount total (226,553,323) agrees with the file's own `TOTAL` rows (226,553,322.89) to source rounding.

**Still 0 valid records, correctly.** Only `Bank Name` and `Account Number` remain unresolved, because the export supplies both in one composite `Bank` column that only M3's shared `parseBankField` may split (DEC-012). **M3 is the milestone that makes the import succeed.** A legacy-format file still validates 2/2 valid throughout.

M3 (Bank Field), M4 (Transaction Date) and M5 (Stabilization & Closure) are not started.

Sprint 16's milestones M1-M3 and M4.1-M4.5 are all complete; see the Sprint 16 record in git commit `5ad316a` and the appendix in CURRENT_SPRINT.md for the uncommitted M4.5.

## Sprint 16 Summary

Primarily an architecture sprint. Two design deliverables: REPORTING_ARCHITECTURE.md (the canonical design reference for the Reporting module, following the PROOF_MANAGEMENT.md precedent from Sprint 14) and REPORTING_PROJECTION_LAYER.md (the read-only boundary between operational state and everything that reports on it, expanding REPORTING_ARCHITECTURE.md Section 3.4).

Two bounded implementation milestones followed.

**M4.1** - the read-only enumerators required by D-4, approved as DECISIONS.md **DEC-007**. Three additive accessors - `getAllSharedBatches` and `getAllAssignments` (`sharedBatchStore.ts`), `getAllBranchProcessingQueueItems` (`branchProcessingQueueService.ts`) - each returning `readonly` arrays of deep copies, triggering no hydration and modifying no lifecycle or processing state. No existing function's behavior or signature changed.

**M4.2** - the Reporting Projection Layer itself, built exactly to REPORTING_PROJECTION_LAYER.md. Two new files, `types/reportingProjection.ts` and `services/reportingProjectionService.ts`; **no existing file was modified**, so no existing behavior could change. Four asynchronous operations over four projection models, reusing `getBranchProcessingQueueSummary`, `getBatchDownloadSummary`, `buildProofDownloadBatchFromSharedBatch` and `getSharedBatchesVisibleToBranchOfficer` rather than recomputing any of them. Output is immutable at both the type level and runtime (`Object.freeze`), Branch Officer scope is enforced in the layer rather than offered as a clearable filter, and every operation sorts deterministically with a stable tiebreaker so results will not silently reorder when persistence replaces the in-memory stores.

**M4.3** - the Report Service, the projection layer's single consumer. `services/reportService.ts` was **extended, not replaced**: it already existed, held the six Volume definitions and `matchesFilters`, and is imported by `ReportsPage.tsx`, so creating it fresh would have destroyed working code and broken a page this milestone could not modify. Four asynchronous operations (`generateBatchReport`, `generateBranchReport`, `generateProcessingReport`, `generateProofReport`) consume only `reportingProjectionService` - none of the five forbidden stores/services is imported. Filtering was consolidated into one `matchesFilters` implementation shared by the legacy Volume path and all four new reports. Two Performance Report definitions were added, the first in a category TECH_DEBT.md recorded as typed but empty. All results are frozen.

**M4.4** - integration of the existing Reports UI with the Report Service. `ReportsPage.tsx` no longer touches React Router `location.state`; it consumes `reportService` only, with loading, empty and error handling built from the existing UI patterns and no component modified. Legacy report definitions were kept working by realigning their column keys to the projection field names (titles unchanged), and all `location.state`-era dead code was removed from `reportService.ts` and `types/report.ts`.

**M4.5** - the Operations Dashboard, the last page on the legacy data path. `dashboardService.buildOperationsDashboard` now assembles from reporting projections instead of operational entities (output type unchanged, so no component was touched), `reportService.generateOperationsDashboard` supplies them, and `OperationsDashboardPage.tsx` consumes `reportService` alone. Only the data source changed - no widget, card, chart, style or KPI was altered.

**The M1 headline defect is now closed completely.** No REOS page reads operational data from React Router `location.state`. Both Reports and the Operations Dashboard display real operational data for a real user, each verified live in a browser across the full workflow - see CURRENT_SPRINT.md, "Runtime Verification (M4.4)" and "(M4.5)".

The original finding, now fully resolved:

**Reporting and the Operations Dashboard had no data source.** `ReportsPage.tsx` and `OperationsDashboardPage.tsx` both derived their data from React Router `location.state`, and nothing in the application navigated to `/reos/reports` or `/reos/dashboard` with state. Reached from the Sidebar - the only path a real user takes - both pages rendered permanently empty. Neither `tsc` nor `npm run build` could see this; it was the same class of defect as Sprint 14's unmounted routes and Sprint 15 M1's missing navigation link. Fixed across M4.1-M4.5.

Three further blockers were found and are recorded in TECH_DEBT.md. One is now resolved: the stores exposed no enumerating read accessors (closed by M4.1). Two remain: no audit record is ever persisted (blocking the entire Audit report category, D-5); and `BranchProcessingQueueItem` records no timestamps or actor (blocking every duration-based and officer-attributed metric, and leaving the dashboard's "Average Processing Time" permanently at "No data", D-6).

## Workflow Status

Unchanged since Sprint 15 - the full chain works end to end, verified live in a browser:

- Shared Batch Upload -> Branch Assignment: works.
- Assignment -> Branch Processing: works (Sprint 15 M1.5 added the navigation link).
- Branch Processing: transaction completion with real proof, and Finalize Processing, both work and survive realistic navigation (Sprint 15 M1.75).
- Branch Processing -> Proof Management: works, including the Sprint 14 Milestone 2C auto-transition.
- **Proof Management -> Reporting: works** (Sprint 16 M4.4). Reports read live operational data through the Report Service and Reporting Projection Layer, and track lifecycle changes as they happen - re-verified end to end in a browser, including the `COMPLETED -> READY_FOR_DOWNLOAD -> DOWNLOADED` transitions moving batches between reports.
- **Operations Dashboard: works** (Sprint 16 M4.5). Every KPI with a data source shows real operational data through the same path, and tracks lifecycle changes live - verified in a browser.

The full five-stage chain Shared Batch -> Assignment -> Branch Processing -> Proof Management -> Reporting now works for a real user, and the Operations Dashboard reads from the same architecture.

## Current Git Tag

v0.13.2-processing-completion (latest tag). Sprint 15 is committed (`9ddaab3`). The working tree now carries Sprint 16's documentation plus M4.1's two source changes (`sharedBatchStore.ts`, `branchProcessingQueueService.ts`), uncommitted.

## Build Status

Both re-run after Sprint 17 M2:
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded. 135 modules, CSS 21.70 kB, JS 759.60 kB.

**M1 and M2 were each verified by running the real production file through the shipped validation service**, transpiled with the project's own TypeScript and executed in Node against the actual `.xlsx` - not by a passing build, and not against a hand-written replica of the logic. A legacy-format fixture was run through the same harness as a regression check at each milestone.

M2's amount parsing was additionally cross-checked against the source system's own subtotals rather than merely confirmed to parse without error: parsed sum 226,553,323 vs the file's `TOTAL` rows at 226,553,322.89, agreeing to source rounding.

**Verification.** M4.4 and M4.5 were both verified by **running the application**, not by inspecting the bundle: the whole Shared Batch -> Assignment -> Branch Processing -> Proof Management -> Reporting/Dashboard chain was driven in a browser with a real uploaded batch and real proof images, and every report, KPI, filter and empty state was checked against live data. Full detail in CURRENT_SPRINT.md, "Runtime Verification (M4.4)" and "(M4.5)".

That verification earned its keep in M4.4: it found a duplicate-React-key defect in `ReportsPage.getRowKey` that made every row of the processing and proof reports share one key, risking dropped or duplicated rows. `tsc` and `npm run build` were both clean with that bug present. It was fixed and re-verified in the same session. M4.5's run found no defect.

STANDING CAVEAT: a passing build alone does not prove changed code ships, is reachable by a real user, or renders correctly. **Five separate incidents now** - Sprint 14's route-mounting gap, Sprint 15 M1's navigation gap, Sprint 15 M1.75's hydration defect, Sprint 16 M1's finding that Reporting had no data source, and Sprint 16 M4.4's duplicate-React-key defect - were all invisible to `tsc`/`build`. Four of the five were found only by driving the app in a real browser; the fifth by tracing the data path by hand.

Corollary learned in M4.1-M4.3: a green build also does not prove code **is in the bundle at all**. Uncalled exports are tree-shaken, and a module nothing imports never enters the module graph. Infrastructure built ahead of its consumer is legitimately absent from `dist/` until something imports it - check, don't assume, and don't mistake that absence for the Sprint 14 defect class.

## Last Completed Milestone

Sprint 17 M2 - Column Contract (DEC-013).

Preceding: Sprint 17 M1 (Row Structure Detection).

Preceding: Sprint 16 M4.5 (Operations Dashboard Integration); M4.4 (Reports UI Integration); M4.3 (Report Service); M4.2 (Reporting Projection Layer); M4.1 (Read-Only Enumerators, DEC-007); M3, M2, M1 (design); Sprint 15 Stabilization & Closure.

## Next Planned Milestone

**Sprint 17 M3 - Bank Field.** Not started; awaiting review of M2 per the milestone-by-milestone instruction. **This is the milestone that makes the real file import**: `Bank Name` and `Account Number` are the only required columns still unresolved, and both come from the export's composite `Bank` column. It consolidates to one shared `parseBankField` (DEC-012), teaches it the `(Acc No: ...)` form, and handles the two row layouts - 37 rows carry bank and account in the `Bank` column, 26 carry the bank name in `Dest Country` and a bare account number in `Bank`.

Then M4 (transaction date, DEC-011) and M5 (Stabilization & Closure).

Carried forward from Sprint 16 - none blocking Sprint 17:

- **Remove out-of-scope financial metrics (D-9)** - the dashboard still renders USD Value, Revenue and USD Processed columns, now permanently `$0.00` because the projection layer carries no aggregate amounts by design. Removing the columns needs component changes. This is now the most visible open item.
- **Exports (D-3)** - the Excel/PDF/Print buttons remain disabled placeholders.
- **Audit reports (D-5)** - blocked outright until an audit trail exists.
- **Executive and Branch dashboards (D-2)** - designed in REPORTING_ARCHITECTURE.md Section 10, not built.
- **Amend REPORTING_ARCHITECTURE.md Section 10.1** - it states that `reportService` and `dashboardService` never call each other; M4.5's approved scope required exactly that. See the M4.5 architectural note in CURRENT_SPRINT.md.
- **Sprint 16 closure** - Stabilization & Closure has not been run for this sprint: `npm run lint` has not been re-run since Sprint 15, and DEFINITION_OF_DONE.md's checklist is not yet complete.

Eight decisions remain open overall: D-1, D-2, D-3, D-5, D-6, D-7, D-8, D-9.

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md, DEC-004).
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No financial reporting - no revenue, USD processed, FX margin, commission, or forecasting (REPORTING_STANDARDS.md).
- No frozen business rule may be changed (BUSINESS_RULES.md).
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).
- Exactly one owner for Assignment creation/management (DECISIONS.md DEC-006).
- Reports must never become the system of record, must not duplicate operational data, and must not introduce persistence (REPORTING_STANDARDS.md).

## Last Updated

2026-08-02

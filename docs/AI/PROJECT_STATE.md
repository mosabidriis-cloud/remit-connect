# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 16 - Reporting Architecture. **Scope proposed 2026-08-02, not yet approved by the business owner** (DECISIONS.md DEC-005).

## Current Module

Reporting (design only), with read dependencies on Shared Batch, Branch Assignment, Branch Processing, and Proof Management.

## Current Milestone

M1 (Architecture Design), M2 (Documentation Synchronization), M3 (Reporting Projection Layer Design), **M4.1 (Read-Only Enumerators, DEC-007)**, **M4.2 (Reporting Projection Layer)**, **M4.3 (Report Service)** and **M4.4 (Reports UI Integration, verified live)** COMPLETE.

Each was approved as a bounded scope amendment on 2026-08-02. M4.5 onward (dashboards, exports, audit reports) is not yet approved and remains blocked on the eight still-open decisions.

## Sprint 16 Summary

Primarily an architecture sprint. Two design deliverables: REPORTING_ARCHITECTURE.md (the canonical design reference for the Reporting module, following the PROOF_MANAGEMENT.md precedent from Sprint 14) and REPORTING_PROJECTION_LAYER.md (the read-only boundary between operational state and everything that reports on it, expanding REPORTING_ARCHITECTURE.md Section 3.4).

Two bounded implementation milestones followed.

**M4.1** - the read-only enumerators required by D-4, approved as DECISIONS.md **DEC-007**. Three additive accessors - `getAllSharedBatches` and `getAllAssignments` (`sharedBatchStore.ts`), `getAllBranchProcessingQueueItems` (`branchProcessingQueueService.ts`) - each returning `readonly` arrays of deep copies, triggering no hydration and modifying no lifecycle or processing state. No existing function's behavior or signature changed.

**M4.2** - the Reporting Projection Layer itself, built exactly to REPORTING_PROJECTION_LAYER.md. Two new files, `types/reportingProjection.ts` and `services/reportingProjectionService.ts`; **no existing file was modified**, so no existing behavior could change. Four asynchronous operations over four projection models, reusing `getBranchProcessingQueueSummary`, `getBatchDownloadSummary`, `buildProofDownloadBatchFromSharedBatch` and `getSharedBatchesVisibleToBranchOfficer` rather than recomputing any of them. Output is immutable at both the type level and runtime (`Object.freeze`), Branch Officer scope is enforced in the layer rather than offered as a clearable filter, and every operation sorts deterministically with a stable tiebreaker so results will not silently reorder when persistence replaces the in-memory stores.

**M4.3** - the Report Service, the projection layer's single consumer. `services/reportService.ts` was **extended, not replaced**: it already existed, held the six Volume definitions and `matchesFilters`, and is imported by `ReportsPage.tsx`, so creating it fresh would have destroyed working code and broken a page this milestone could not modify. Four asynchronous operations (`generateBatchReport`, `generateBranchReport`, `generateProcessingReport`, `generateProofReport`) consume only `reportingProjectionService` - none of the five forbidden stores/services is imported. Filtering was consolidated into one `matchesFilters` implementation shared by the legacy Volume path and all four new reports. Two Performance Report definitions were added, the first in a category TECH_DEBT.md recorded as typed but empty. All results are frozen.

**M4.4** - integration of the existing Reports UI with the Report Service. `ReportsPage.tsx` no longer touches React Router `location.state`; it consumes `reportService` only, with loading, empty and error handling built from the existing UI patterns and no component modified. Legacy report definitions were kept working by realigning their column keys to the projection field names (titles unchanged), and all `location.state`-era dead code was removed from `reportService.ts` and `types/report.ts`.

**The M1 headline defect is closed.** Reports display real operational data for a real user, verified live in a browser across the full workflow - see CURRENT_SPRINT.md, "Runtime Verification (M4.4)".

The original finding, now resolved for Reporting:

**Reporting and the Operations Dashboard had no data source.** `ReportsPage.tsx` and `OperationsDashboardPage.tsx` both derived their data from React Router `location.state`, and nothing in the application navigated to `/reos/reports` or `/reos/dashboard` with state. Reached from the Sidebar - the only path a real user takes - both pages rendered permanently empty. Neither `tsc` nor `npm run build` could see this; it was the same class of defect as Sprint 14's unmounted routes and Sprint 15 M1's missing navigation link. **Reports are fixed (M4.1-M4.4). `OperationsDashboardPage.tsx` still reads `location.state` and still renders every KPI as `0`** - the dashboard half of this defect is untouched and remains open, pending D-2 and D-9.

Three further blockers were found and are recorded in TECH_DEBT.md. One is now resolved: the stores exposed no enumerating read accessors (closed by M4.1). Two remain: no audit record is ever persisted (blocking the entire Audit report category, D-5); and `BranchProcessingQueueItem` records no timestamps or actor (blocking every duration-based and officer-attributed metric, and leaving the dashboard's "Average Processing Time" permanently at "No data", D-6).

## Workflow Status

Unchanged since Sprint 15 - the full chain works end to end, verified live in a browser:

- Shared Batch Upload -> Branch Assignment: works.
- Assignment -> Branch Processing: works (Sprint 15 M1.5 added the navigation link).
- Branch Processing: transaction completion with real proof, and Finalize Processing, both work and survive realistic navigation (Sprint 15 M1.75).
- Branch Processing -> Proof Management: works, including the Sprint 14 Milestone 2C auto-transition.
- **Proof Management -> Reporting: works** (Sprint 16 M4.4). Reports read live operational data through the Report Service and Reporting Projection Layer, and track lifecycle changes as they happen - re-verified end to end in a browser, including the `COMPLETED -> READY_FOR_DOWNLOAD -> DOWNLOADED` transitions moving batches between reports.

The full five-stage chain Shared Batch -> Assignment -> Branch Processing -> Proof Management -> Reporting now works for a real user.

## Current Git Tag

v0.13.2-processing-completion (latest tag). Sprint 15 is committed (`9ddaab3`). The working tree now carries Sprint 16's documentation plus M4.1's two source changes (`sharedBatchStore.ts`, `branchProcessingQueueService.ts`), uncommitted.

## Build Status

Both re-run after M4.4:
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded. 135 modules, CSS 21.70 kB (unchanged), JS 759.05 kB, bundle hash changed. The JS shrank slightly against M4.3's 760.79 kB, consistent with the `location.state`-era dead code removed from `reportService.ts` and `types/report.ts`.

**Verification.** Unlike M4.1-M4.3, this milestone was verified by **running the application**, not by inspecting the bundle: the whole Shared Batch -> Assignment -> Branch Processing -> Proof Management -> Reporting chain was driven in a browser with a real uploaded batch and real proof images, and every report, filter and empty state was checked against live data. Full detail in CURRENT_SPRINT.md, "Runtime Verification (M4.4)".

That verification earned its keep immediately: it found a duplicate-React-key defect in `ReportsPage.getRowKey` that made every row of the processing and proof reports share one key, risking dropped or duplicated rows. `tsc` and `npm run build` were both clean with that bug present. It was fixed and re-verified in the same session.

STANDING CAVEAT: a passing build alone does not prove changed code ships, is reachable by a real user, or renders correctly. **Five separate incidents now** - Sprint 14's route-mounting gap, Sprint 15 M1's navigation gap, Sprint 15 M1.75's hydration defect, Sprint 16 M1's finding that Reporting had no data source, and Sprint 16 M4.4's duplicate-React-key defect - were all invisible to `tsc`/`build`. Four of the five were found only by driving the app in a real browser; the fifth by tracing the data path by hand.

Corollary learned in M4.1-M4.3: a green build also does not prove code **is in the bundle at all**. Uncalled exports are tree-shaken, and a module nothing imports never enters the module graph. Infrastructure built ahead of its consumer is legitimately absent from `dist/` until something imports it - check, don't assume, and don't mistake that absence for the Sprint 14 defect class.

## Last Completed Milestone

Sprint 16 M4.4 - Reports UI Integration, verified live in a browser across the full five-stage workflow.

Preceding: Sprint 16 M4.3 (Report Service); Sprint 16 M4.2 (Reporting Projection Layer); Sprint 16 M4.1 (Read-Only Enumerators, DEC-007); Sprint 16 M3 (Reporting Projection Layer Design); Sprint 16 M2 (Documentation Synchronization); Sprint 16 M1 (Architecture Design); Sprint 15 Stabilization & Closure (Sprint 15 is closed).

## Next Planned Milestone

None approved. Reporting is functional end to end; the natural candidates are all gated on decisions:

- **Dashboards (D-2, D-9)** - `OperationsDashboardPage.tsx` still reads `location.state` and renders every KPI as `0`. It is the remaining half of the M1 defect, and the fix is the same shape M4.4 just proved: route it through a service that reads the projection layer. It also still displays Revenue and USD Value, which REPORTING_STANDARDS.md places out of scope.
- **Exports (D-3)** - the Excel/PDF/Print buttons remain disabled placeholders.
- **Audit reports (D-5)** - blocked outright until an audit trail exists.
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

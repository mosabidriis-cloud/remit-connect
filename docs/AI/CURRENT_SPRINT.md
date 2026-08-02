# CURRENT SPRINT

Version: 16.1

Status: DESIGN COMPLETE (M1-M3). REPORTING NOW WORKS END TO END - M4.1 (enumerators, DEC-007), M4.2 (Projection Layer), M4.3 (Report Service) and M4.4 (Reports UI, verified live) COMPLETE. DASHBOARDS, EXPORTS AND AUDIT REPORTS AWAITING DECISIONS.

Last Updated: 2026-08-02

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

Sprint 15's full milestone log is preserved in git history (commit `9ddaab3`), following the same convention used when Sprint 15 superseded Sprint 14's log.

## Current Sprint

Sprint 16 - Reporting Architecture

## Current Module

Reporting (design), with read dependencies on Shared Batch, Branch Assignment, Branch Processing, and Proof Management.

## Scope Approval

Sprint 16's design scope (M1-M3) was drafted by the Lead Software Engineer / Solution Architect on 2026-08-02. Two bounded implementation milestones were then explicitly approved by the business owner on 2026-08-02, each as its own scope amendment, following the pattern of Sprint 15's M1.5 and M1.75 (DECISIONS.md DEC-005 requires explicit approval, never in-flight assumption):

- **M4.1** - the read-only enumerators required by D-4. Bounded: enumerators only, no projection layer, no reports, no dashboards.
- **M4.2** - the Reporting Projection Layer, exactly as designed. Bounded: no Report Service, no reports, no dashboards, no exports.
- **M4.3** - the Report Service. Bounded: no report pages, no dashboards, no exports, no audit reports.
- **M4.4** - integration of the existing Reports UI with the Report Service. Bounded: no new reports, no dashboards, no exports, no UI redesign.

Everything beyond M4.4 remains unapproved.

## Sprint Goal

Produce a complete, grounded architecture for the REOS Reporting module - domain model, categories, dashboards, filtering, exports, permissions, lifecycle, and performance approach - that consumes existing operational data only, introduces no new business rules, and does not duplicate existing logic. Establish, honestly, which reports the current system can actually support and which cannot.

## Deliverables

1. REPORTING_ARCHITECTURE.md - the canonical architecture and design reference for the Reporting module, following the precedent set by PROOF_MANAGEMENT.md for Sprint 14.
2. REPORTING_PROJECTION_LAYER.md - the canonical design for the Reporting Projection Layer, expanding REPORTING_ARCHITECTURE.md Section 3.4.

## Milestones

- **M1 - Architecture Design: COMPLETE.** REPORTING_ARCHITECTURE.md created. Covers: reporting domain model (Report, ReportDefinition, ReportTemplate, ReportFilter, ReportExecution, ReportExport); report categories with a per-report feasibility assessment against real operational data; Executive / Operations / Branch dashboard architecture with KPIs, widgets, data sources and drill-down; filtering; export architecture for Excel, PDF, CSV and Print with no library selected; permissions across the three approved REOS roles; the Generate -> Preview -> Export lifecycle with no scheduling; and performance considerations (pagination now; lazy loading, caching and async generation as future work).
- **M2 - Documentation Synchronization: COMPLETE.** CURRENT_SPRINT.md, PROJECT_STATE.md, MODULE_STATUS.md, TECH_DEBT.md, ROADMAP.md, README.md and CLAUDE.md updated to reflect the design and the defects it surfaced.
- **M3 - Reporting Projection Layer Design: COMPLETE.** REPORTING_PROJECTION_LAYER.md created, specifying the layer M1 identified as missing. Covers: responsibilities and explicit prohibitions; the four projection models (`BatchReportProjection`, `BranchReportProjection`, `ProcessingReportProjection`, `ProofReportProjection`) with declared grain and shared design rules; a single projection service as the only reader of operational state, with the four rules that prevent pages from aggregating; a per-field data-ownership matrix confirming Reporting owns nothing; an explicit permitted/forbidden dependency contract; and seven future-compatibility rules for a persistence migration. No new business decisions arise; the layer is bounded by D-4 through D-7.
- **M4.1 - Read-Only Enumerators (D-4): COMPLETE.** The first implementation milestone, approved by the business owner on 2026-08-02 as "Sprint 16 Milestone 1" and recorded here as M4.1 so the three completed design milestones are not renumbered (same sub-milestone convention as Sprint 15's M1.5 / M1.75). D-4 is now approved and recorded as DECISIONS.md **DEC-007**. Scope was strictly the enumerators: no projection layer, no reports, no dashboards. Detail below.
- **M4.2 - Reporting Projection Layer: COMPLETE.** Approved by the business owner on 2026-08-02. Implements REPORTING_PROJECTION_LAYER.md: one service, four projection models, asynchronous operations, actor scope enforced in the layer. Detail below.
- **M4.3 - Report Service: COMPLETE.** Approved by the business owner on 2026-08-02. Four asynchronous generate operations consuming only the projection layer, with filtering consolidated into one implementation. Detail below.
- **M4.4 - Reports UI Integration: COMPLETE AND VERIFIED LIVE.** Approved by the business owner on 2026-08-02. `ReportsPage` no longer reads React Router `location.state`; it consumes `reportService` only. **This closes the M1 headline defect** - reports now display real operational data for a real user, proven in a browser through the full workflow. Detail below.
- **M4.5 onward - dashboards, exports, audit reports: NOT YET APPROVED.** Blocked on the remaining open business decisions below.

## Allowed Directories

M1 through M3 (design): `docs/AI` only - `src/**` was read for grounding and not modified.

M4.1 (implementation): `src/features/reos/services/**` and `docs/AI/**`. Pages, components, routes, types and business rules were explicitly out of scope and were not touched.

M4.2 (implementation): `src/features/reos/services/**`, `src/features/reos/types/**` and `docs/AI/**`. Pages, components, routes and business rules were explicitly out of scope and were not touched.

M4.3 (implementation): `src/features/reos/services/**` and `docs/AI/**`.

M4.4 (implementation): `src/features/reos/pages/**`, `src/features/reos/services/**`, `src/features/reos/types/**` and `docs/AI/**`. **No component and no route was modified**, and no business rule was changed.

## Runtime Verification (M4.4)

The full chain was exercised in a real browser against the running app, using a 2-row `.xlsx` fixture built with the `xlsx` package already in `package.json` (no new dependency) and real PNG proof uploads. All navigation between stages was client-side, so the in-memory store (DEC-004) stayed alive across the whole run.

| Stage | Result |
|---|---|
| Reports, before any data | Empty state correct - "No operational records match the selected filters.", all 8 definitions listed, no crash |
| Shared Batch Upload | 2/2 valid records, `DR-M44-BATCH` created, Confirm Upload succeeded |
| Branch Assignment | Assigned to Port Sudan Branch - 1 group, 2 transactions, batch locked |
| Branch Processing | Both transactions started, real proof image uploaded to each, both Completed, 100% |
| Finalize Processing | Branch reached `COMPLETED`, queue locked read-only |
| Proof Management | 2 proof images, 2 completed transactions, batch auto-advanced to `READY_FOR_DOWNLOAD`, then confirmed to `DOWNLOADED` |
| **Reports, after** | **Real operational data in every report** |

**Reports verified against live data:** Shared Batches showed `DR-M44-BATCH / PORT_SUDAN / 2 / 2 / 0` with correct totals; Transactions and Completed Transactions showed both rows with proof counts; Returned Transactions correctly empty; Branch Performance showed Port Sudan Branch at 100% with status `Completed`, every count sourced from `getBranchProcessingQueueSummary`; Proof Completion showed both proof files, newest first.

**Reports track lifecycle changes live:** Ready For Download Batches went 0 -> 1 rows when the batch reached `READY_FOR_DOWNLOAD`, then back to 0 when it reached `DOWNLOADED`, at which point Downloaded Batches went 0 -> 1. The lifecycle restriction is real, not cosmetic.

**Filters verified:** branch match / non-match / cleared; batch reference case-insensitive partial match ("m44" matched `DR-M44-BATCH`) and non-match; date-from and date-to boundaries in both directions; invalid range (from > to) showed the original "The selected date range is invalid." message and recovered when cleared.

**No regression in the previous workflow:** leaving Branch Processing and returning showed the branch still `COMPLETED`, both transactions still `Completed`, queue still locked - Sprint 15 M1.75's hydration fix still holds. The Sprint 14 Milestone 2C auto-transition still fires.

**Two observations, neither introduced by M4.4, neither fixed:**
1. The Transaction Date column reads "None" for every transaction. `excelValidationService` sets `transactionDate: ""` on every imported beneficiary - the upload path captures no transaction date. Pre-existing data gap; recorded in TECH_DEBT.md.
2. Proof Completion shows `DOWNLOADED 0` even after the batch was marked downloaded, because `proofOfPaymentService.markProofDownloaded` is never called (already recorded in TECH_DEBT.md, blocked on a product decision). The report is correctly reporting a known gap.

## Milestone Log

### M4.1 - Read-Only Enumerators (D-4): COMPLETE

Implements DEC-007. Three additive read-only accessors; no existing function's behavior or signature changed.

**`services/sharedBatchStore.ts`**
- `getAllSharedBatches(): readonly SharedBatch[]` - enterprise-wide enumeration of Shared Batches.
- `getAllAssignments(): readonly Assignment[]` - enterprise-wide counterpart to the existing `getAssignmentsByBranch`.
- Private `copySharedBatch` / `copyAssignment` / `copyBeneficiary` helpers. `copyAssignment` also copies the three `Beneficiary[]` collections (`assignedTransactions`, `manualReviewTransactions`, `invalidTransactions`) and their elements, so no internal array is shared with a caller.

**`services/branchProcessingQueueService.ts`**
- `getAllBranchProcessingQueueItems(): readonly BranchProcessingQueueItem[]` - enterprise-wide counterpart to the existing per-branch `getBranchProcessingQueue`.
- Private `copyBranchProcessingQueueItem` helper, copying the item, its `beneficiary`, its `proofs` array and elements, and its `returnReason`.
- Branch-level status was deliberately **not** enumerated: branch ids are derivable from the returned items, and `getBranchProcessingStatus(branchId)` already reads status per branch. Adding an accessor nothing needs would be speculative.

**Guarantees met, per the approved requirements:**
- *Read-only copies* - every accessor returns `readonly T[]`, giving compile-time protection, over runtime deep copies, giving runtime protection.
- *No mutable internal collection exposed* - neither `Map` nor the queue array is returned or reachable through a returned value.
- *No hydration triggered* - `getAllBranchProcessingQueueItems` reads module state directly and never calls `hydrateBranchProcessingQueue`. This is deliberate and documented at the call site: Sprint 15 M1.75 found hydration silently discarding completed work, and a read path must not be able to reach it even now that it is idempotent.
- *No lifecycle modification* - no call to `updateSharedBatchLifecycleStatus` or any transition function.
- *No processing-state modification* - no writes to queue items or branch-level status.

**Deliberate asymmetry, recorded so it is not later "fixed" by mistake:** the existing `getBranchProcessingQueue` and `getSharedBatch` still return live references, and were left exactly as they are. Branch Processing mutates queue items in place (`updateBranchProcessingQueueItemStatus`, `completeBranchProcessingQueueItem`, `returnBranchProcessingQueueItem` all mutate the object they find), so making those accessors copy would silently break the processing workflow that Sprint 15 verified live. The new accessors are copy-returning because reporting consumers must not hold live state; the old ones are unchanged because processing consumers must.

**Ordering is explicitly not part of the contract.** Both accessors return underlying insertion order and say so in their documentation, directing callers to apply their own deterministic sort per REPORTING_PROJECTION_LAYER.md Section 9.5 - the rule that prevents reports silently reordering when persistence replaces the in-memory stores.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` clean; `npm run build` succeeded, 134 modules (unchanged - no new files).

**The new accessors are absent from the production bundle, and this is correct.** Checked rather than assumed, per PROJECT_STATE.md's standing caveat: `getAllSharedBatches`, `getAllAssignments` and `getAllBranchProcessingQueueItems` do not appear in `dist/assets/index-*.js`. They are exported but not yet called by anything - their only intended consumer is the Reporting Projection Layer (M4.2, not yet approved) - so the bundler tree-shakes them out. This is expected behavior for approved infrastructure that precedes its consumer, not the Sprint 14 route-mounting defect class, where code that was supposed to ship did not. The distinction: there is no user-reachable path this code was meant to be on yet. It will enter the bundle the moment the projection layer imports it, and **that** is the point at which bundle presence becomes a meaningful acceptance check.

This milestone is therefore verified by `tsc` and by inspection, not by live browser testing - there is nothing user-facing to exercise. The first live verification opportunity is M4.2.

**Not implemented, by instruction:** the Reporting Projection Layer, any report, any dashboard. No page, component, route, type or business rule was modified.

### M4.2 - Reporting Projection Layer: COMPLETE

Implements REPORTING_PROJECTION_LAYER.md. Two files created; no existing file was modified, so no existing behavior could change.

**`types/reportingProjection.ts` (new)** - `ProjectionScope` plus the four projection models: `BatchReportProjection` (grain: one Shared Batch), `BranchReportProjection` (one branch), `ProcessingReportProjection` (one queue item), `ProofReportProjection` (one proof file). All fields `readonly`, all flat primitives, all `Record<string, unknown>`-compatible (same pattern as the existing `VolumeReportRow`, so `ReportTable` can sort and render them generically).

**`services/reportingProjectionService.ts` (new)** - four asynchronous operations, `projectBatches` / `projectBranches` / `projectProcessing` / `projectProofs`, each taking only a `ProjectionScope`.

**Design rules honored, and how:**

- *Asynchronous from day one* (Section 9.1) - all four operations are `async`. `userService` was already async and every candidate persistence option is async; retrofitting later would have changed every consumer signature.
- *No duplicated summaries* (Section 2.3) - `getBranchProcessingQueueSummary` supplies all eight branch queue counts verbatim, `getBatchDownloadSummary` supplies the live proof rollup, `buildProofDownloadBatchFromSharedBatch` builds the proof view, and `getSharedBatchesVisibleToBranchOfficer` supplies Branch Officer visibility. Nothing is recomputed; the layer's only arithmetic is counting batches by lifecycle status, which no existing function provides.
- *Read-only* - no write function is imported. No hydration: `getAllBranchProcessingQueueItems` (M4.1) is used, never `hydrateBranchProcessingQueue`. No lifecycle transition, no business rule.
- *Immutable output* - `readonly` fields and `readonly T[]` returns for compile-time protection, plus `Object.freeze` on every projection and every returned array for runtime protection. Projections are flat, so a shallow freeze is a deep freeze.
- *Actor scope enforced in the layer, not as a filter* (Section 6.3) - Operations Manager and Direct Remit Officer are unrestricted; Branch Officer is restricted to their own branch before any row is returned, and a Branch Officer with no branch id receives nothing rather than everything. No filter combination can widen it, because `ReportFilter` is never consulted here.
- *Deterministic ordering* (Section 9.5) - every operation sorts explicitly with a stable id tiebreaker: batches by upload date desc, branches by name asc, processing by transaction date desc, proofs by upload date desc.
- *Tolerates missing references* (Section 9.6) - a queue item whose assignment is absent still projects, with batch context `null`. Nothing throws.
- *Owns nothing* - Reporting owns only the projection shapes and the `projectedAt` stamp.

**Two design details worth recording:**

1. `ProcessingReportProjection` carries the five-value `BranchProcessingQueueStatus`, not the three-value `CreditToAccountTransactionStatus`, because `proofDownloadService.toTransactionStatus` collapses `ASSIGNED`, `IN_PROGRESS` and `ON_HOLD` into `PENDING`. Projecting the narrower vocabulary would have made "On Hold Transactions" unbuildable.
2. `BatchReportProjection` carries both `SharedBatch.completedBeneficiaries`/`returnedBeneficiaries` **and** the queue-derived `completedTransactionCount`/`returnedTransactionCount`, because they are genuinely different values - see the new TECH_DEBT.md entry: nothing in the live workflow ever increments the SharedBatch counters, so they read 0 even for fully processed batches. Reconciling them would be a business-logic change and is out of scope.

**Validation:** `tsc` clean; `npm run build` succeeded.

**The projection layer is entirely absent from the production bundle, and this is correct.** Checked rather than assumed: the build reports **134 modules - unchanged**, and both the JS and CSS bundle hashes and byte sizes are identical to M4.1's build. The new service is not merely tree-shaken at the export level as M4.1's accessors were; it never enters Vite's module graph at all, because nothing imports it. The types file is type-only and erased by design.

This is the expected state for a layer whose only intended consumer - the Report Service (M4.3) - is not yet approved. It is not the Sprint 14 route-mounting defect class, where code on a live user path silently failed to ship; there is no user-reachable path this code was meant to be on yet. The whole layer enters the bundle the moment M4.3 imports it, and bundle presence becomes a meaningful acceptance check at exactly that point.

Consequence for verification honesty: `tsc` proves the layer type-checks against the real operational types, and code review proves it against its stated guarantees, but **no runtime behavior of this layer has been executed**. Sprint 15 established that three separate defects survived a green build; the same caution applies here. First real verification opportunity is M4.3, and it should exercise the layer against live uploaded data in a browser, not just a passing build.

**Not implemented, by instruction:** Report Service, any report, any dashboard, any export. No page, component or route was modified, and no business rule was changed.

### M4.3 - Report Service: COMPLETE

**Scope deviation, reported rather than assumed.** The milestone brief said "Create `reportService.ts`". That file already exists - six Volume Report definitions, `validateFilters`, `createVolumeReportResult`, `matchesFilters` - and is imported by `ReportsPage.tsx`. Creating it would have overwritten working code, destroyed the existing definitions, and broken a page this milestone was forbidden to modify (a guaranteed `tsc` failure). The brief also required reusing the existing `ReportDefinition`/`ReportFilter` architecture and not duplicating filtering logic, which points the same way. **The file was therefore extended in place, not replaced.** Everything the legacy path does still works unchanged.

**What was added to `services/reportService.ts`:**

- Four asynchronous operations - `generateBatchReport`, `generateBranchReport`, `generateProcessingReport`, `generateProofReport` - each taking a `ProjectionScope` and a `ReportFilter` and returning an immutable `ReportResult` over the matching projection model.
- Two Performance Report definitions, `BRANCH_PERFORMANCE` and `PROOF_COMPLETION` - the first entries in a category TECH_DEBT.md recorded as typed but empty. Both sit inside the existing approved `VOLUME | PERFORMANCE` taxonomy, so they do not pre-empt Decision D-1.
- `getProjectionReportDefinitions()`, serving the four definitions the async API uses.

**Import discipline, the milestone's central rule:** the Report Service imports `reportingProjectionService` and types only. It does not import `sharedBatchStore`, `branchProcessingQueueService`, `proofDownloadService`, `assignmentService` or `branchAssignmentService` - verified by inspection of the import block. The projection layer remains the only module that reads operational state.

**Reuse over duplication:**
- The batch and processing reports **reuse the existing `SHARED_BATCHES` and `TRANSACTIONS` definitions** rather than declaring second definitions for the same reports.
- `matchesFilters` was generalized to one implementation shared by the legacy Volume path and all four new reports, rather than a second filter written for projections. It now takes a small `ReportFilterableFields` descriptor; `VolumeReportRow` satisfies it structurally, so the legacy call site is unchanged.
- No summary is recomputed. `BranchProcessingQueueSummary` and `BatchDownloadSummary` values arrive pre-computed on the projections; this service only aggregates *across* rows, which no existing summary provides, exactly as the milestone's "totals only when no existing summary exists" rule requires.

**Filter applicability.** REPORTING_STANDARDS.md requires a report to use only its relevant filters. Batch, processing and proof reports apply all three of date, branch and batch reference. The branch report applies **only** the branch filter: a branch is an aggregate with no date and no single batch reference, so those criteria are skipped rather than failing every row, which would have silently produced an empty report. `null` in `ReportFilterableFields` means "not applicable" for date and batch reference, but for `branchId` it means genuinely unassigned - so an explicit branch filter still correctly excludes unassigned batches.

**Immutability.** Every `ReportResult` is frozen, along with its `filters`, `metrics`, `totals` and `rows` arrays; rows themselves arrive already frozen from the projection layer. The declared return type stays compatible with the existing `ReportResult` contract so future consumers need no special handling.

**One deliberate omission worth recording:** the two new Performance definitions are held **outside** the `reports` registry that `getDefinitions()` returns. `ReportsPage.tsx` renders every registered definition in its selector and then calls `createVolumeReportResult`, which throws for a non-`VOLUME` definition - so registering them would crash that page as soon as a user selected one, and pages were out of scope here. M4.4 should merge the registries as part of migrating `ReportsPage` onto the async API.

**Still unfixed after this milestone, and worth being blunt about:** `ReportsPage.tsx` continues to read from React Router `location.state`, so **reports are still empty for a real user**. M4.3 built the correct data path; nothing is wired to it yet. The headline defect from M1 closes in M4.4, not here.

**Validation:** `tsc` clean; `npm run build` succeeded, **135 modules (+1)**, JS 750.99 kB -> 760.79 kB, bundle hash changed.

**This is the first milestone of the three whose code actually ships, and it was verified rather than assumed.** M4.1's accessors and M4.2's projection layer were both absent from the bundle because nothing imported them. `reportService.ts` *is* imported by `ReportsPage.tsx`, so extending it pulled the whole chain into the module graph: the module count rose by exactly one (`reportingProjectionService`), and the bundle was grepped for identifying strings - `performance-branch-performance`, `performance-proof-completion`, `Branch Performance`, `Proof Completion`, `Total Shared Batches`, `Transactions With Proof` and the filter-validation error message are all present. The M4.1 and M4.2 code is now live in the bundle too, by the same import chain.

Shipping is still not the same as working: nothing calls the four generate operations yet, so none has executed at runtime. Verification remains `tsc` plus inspection until M4.4 wires a page to them.

**Not implemented, by instruction:** report pages, dashboards, exports, audit reports.

### M4.4 - Reports UI Integration: COMPLETE AND VERIFIED LIVE

The milestone that finally closes the defect M1 found: `ReportsPage.tsx` sourced its data from React Router `location.state`, nothing ever navigated there with state, and every report therefore rendered permanently empty for a real user.

**What changed:**
- `pages/ReportsPage.tsx`: `location.state` and `useLocation` removed entirely. The page now calls `reportService.generateReport(scope, filters)` in an effect keyed on the filters, with `loading`, `error` and cancellation handling. Its only service import is `reportService`; it imports no store, not the projection layer, and performs no filtering or aggregation.
- `services/reportService.ts`: added `generateReport`, a dispatcher routing a report type to the operation that serves it, so no caller narrows rows itself. The lifecycle- and status-restricted report variants (Ready For Download, Downloaded, Completed, Returned) are served by the batch and processing operations reusing the **existing** `getBatchReportLifecycleStatus` / `getTransactionReportStatus` mappings. The two Performance definitions were merged into the main registry, now safe because the page no longer uses the throwing synchronous path.
- `types/report.ts`: added `ReportRow`; removed `VolumeReportRow`, `SharedBatchReportRow`, `TransactionReportRow`, `BranchBatchReportRow` and `ReportSourceData`.

**Column keys realigned.** The six legacy definitions carried column keys written for `VolumeReportRow` (`branchId`, `status`, `transactionCount`, `date`). Projections use different field names, so every cell would have rendered "None". Keys now match the projection fields; **titles are unchanged**, so the UI reads exactly as before. Two titles did change, for truthfulness rather than design: the Completed and Returned transaction reports labelled their date column "Completed At" / "Returned At", but no completion or return timestamp is recorded anywhere in the live workflow (D-6) and the old code silently fell back to the transaction date. They now say "Transaction Date".

**Dead code removed** (all obsolete with `location.state`): `createVolumeReportResult`, `createSharedBatchResult`, `createTransactionResult`, `createBranchBatchResult`, `getVolumeRows`, `getVolumeMetrics`, `mapSharedBatchToRow`, `mapTransactionToRow`, `getTransactionDate`, `getBatchMetricLabel`, `getTransactionMetricLabel`, and the five types above. Verified unreferenced before deletion.

**UX preserved.** Same layout in the same order (Header, Filters, Summary, Detail Table, Totals, Export Actions), same components, same invalid-range message and styling. The error box reuses that message's existing pattern. Loading uses `ReportTable`'s existing `loading` prop and the empty state its existing empty row - no component was modified. The only deliberate behavioral change: no `defaultSortKey` is passed, so the service's deterministic order stands until a user sorts.

**Defect found and fixed by runtime verification.** The first pass gave every row in the processing and proof reports the same React key: `getRowKey` checked `sharedBatchId` first, and those projections carry it too, so all rows in one batch collided. React warned about duplicate keys and may drop or duplicate rows. Fixed by checking identity most-specific first (`proofId` -> `queueItemId` -> `sharedBatchId` -> `branchId`) and re-verified: cycling all eight reports twice afterwards produced no new warnings, and the multi-row reports render every row. **This was invisible to `tsc` and to `npm run build`** - the fifth such defect in this project's history, and the fourth found only by using the application.

**Validation:** `tsc` clean; `npm run build` succeeded, 135 modules, JS 759.05 kB, bundle hash changed.

## Acceptance Criteria

- Architecture is consistent with the operational workflow Sprint 15 verified live.
- No duplicate business logic proposed; existing summary and validation functions are reused by name.
- No new business rules introduced.
- No conflict with DECISIONS.md (DEC-001 through DEC-006).
- Reporting consumes existing operational data only; anything without a real source is marked BLOCKED rather than designed around.
- No financial, currency, fee, Treasury, accounting, Banking Core, ERP or CRM reporting.
- No scheduling.
- No persistence introduced.
- No application source code modified.

## Key Findings (detail in REPORTING_ARCHITECTURE.md)

1. **Reporting has no data source.** `ReportsPage.tsx` and `OperationsDashboardPage.tsx` both read from React Router `location.state`, and nothing navigates to either route with state. Reached from the Sidebar - the only route a real user takes - both render permanently empty. Invisible to `tsc` and `npm run build`.
2. **The stores cannot enumerate.** No `listSharedBatches()`, no `listAssignments()`, no enterprise-wide queue read. Operations Manager visibility is enterprise-wide by frozen rule, so this is a capability gap.
3. **The entire Audit category is blocked.** REOS constructs `TransactionProcessingAudit`, `ProofDownloadHistoryEntry` and `SharedBatchReassignmentAudit` and stores none of them; `updateSharedBatchLifecycleStatus` overwrites status in place, so lifecycle history is unrecoverable by construction.
4. **Duration and officer metrics are blocked.** `BranchProcessingQueueItem` carries no timestamps and no actor. `buildProofDownloadBatchFromSharedBatch` hardcodes `completedAt`/`completedByUserId` to `null`, so "Average Processing Time" is always "No data" and every branch's health computes as YELLOW.
5. **The existing dashboard displays financial metrics** (Revenue, USD Value, USD Processed) that REPORTING_STANDARDS.md places out of scope.
6. **Three requirements conflict with REPORTING_STANDARDS.md** (category taxonomy, CSV export, dashboards) and one role in shipped code (`GENERAL_MANAGER`) is not an approved REOS role.

## Open Business Decisions - BLOCKING IMPLEMENTATION

Nine decisions are recorded in REPORTING_ARCHITECTURE.md, "Open Business Decisions" (D-1 through D-9). D-1, D-3, D-4, D-5 and D-6 block implementation of specific scope; D-2, D-7, D-8 and D-9 require confirmation. None may be resolved by assumption.

**D-4 is RESOLVED.** Approved by the business owner on 2026-08-02, recorded as DECISIONS.md DEC-007, and implemented in M4.1. The projection layer is no longer blocked outright; D-5, D-6 and D-7 limit its output without preventing it, so M4.2 is buildable once approved.

Eight decisions remain open: D-1, D-2, D-3, D-5, D-6, D-7, D-8, D-9.

One engineering recommendation is recorded in REPORTING_PROJECTION_LAYER.md Section 9.1 and should be settled before implementation begins: projection operations should be asynchronous from day one. `userService` is already async, every candidate persistence option is async, and retrofitting sync-to-async later would change every consumer signature. This is an engineering call with existing precedent, not a business decision.

## Explicitly Out of Scope

- Any modification to `src/**` beyond M4.1's approved `src/features/reos/services/**`.
- The Reporting Projection Layer itself, any report, and any dashboard (M4.2 onward, not yet approved).
- Financial, currency, fee, Treasury, accounting, Banking Core, ERP, CRM reporting, and analytics outside the current workflow.
- Scheduled or recurring report generation, report delivery, and background jobs.
- Persistence of any kind, including saved reports, execution history and export history.
- A user-facing report builder, saved user report templates, or report customization.
- Implementation library selection for any export format.
- Items already recorded as blocked in TECH_DEBT.md and not reopened here.

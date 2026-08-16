# Reporting Architecture

Sprint 16 architecture and design reference. This document is the canonical specification for the REOS Reporting module - the terminal stage of the operational workflow, and the only module whose entire purpose is to read what the other four modules produced.

Status: **DESIGN ONLY.** No application source code was written or modified to produce this document. Implementation has not started. `src/**` was read for grounding and was not changed.

Authority: REPORTING_STANDARDS.md remains the canonical reporting standard. This document is an architecture layered on top of it, not a replacement. Where this design requires anything REPORTING_STANDARDS.md does not currently permit, it is recorded in "Open Business Decisions" as a required amendment rather than assumed - see Decisions D-1 through D-3. CURRENT_SPRINT.md governs active sprint scope.

## Grounding Note - Read Before Implementing

Reporting is **not a greenfield module**, and it is not empty. A real implementation already exists, built under legacy tags `v0.9.1-reporting-foundation` / `v0.9.2-volume-reports`, predating the Sprint 10 Enterprise UI reset:

- Types: `types/report.ts` (`ReportCategory`, `ReportType`, `ReportDefinition`, `ReportFilter`, `ReportColumn`, `ReportMetric`, `ReportResult<T>`, `ReportSourceData`, `VolumeReportRow`)
- Service: `services/reportService.ts` (six Volume Report definitions, `validateFilters`, `createVolumeReportResult`, a `register()` extension point)
- Components: `components/reports/ReportHeader.tsx`, `ReportFilters.tsx`, `ReportSummary.tsx`, `ReportTable.tsx`, `ReportExportActions.tsx`
- Page: `pages/ReportsPage.tsx`, route `/reos/reports` (mounted in `src/routes/AppRoutes.tsx`)

A dashboard implementation also already exists: `types/dashboard.ts`, `services/dashboardService.ts`, `pages/OperationsDashboardPage.tsx`, route `/reos/dashboard` (mounted), plus `BranchPerformanceTable`, `WorkQueueTable`, `ExceptionCenter`, `TodaySummary`, `CriticalAlertCard`, `DashboardStatCard`.

This design **extends** those implementations. It does not propose replacing or duplicating them. Sprint 13 found and fixed a duplicated Branch Processing status machine; Sprint 14 found and fixed a duplicated Assignment-creation path; Sprint 15 M3 deleted a second source of route truth. Sprint 16 must not add a second reporting engine, a second filter model, or a second dashboard.

**The most important finding of this design pass is in Section 3.** Both `ReportsPage.tsx` and `OperationsDashboardPage.tsx` source their data from React Router `location.state`, and nothing in the application navigates to either route with state. Reached from the Sidebar - the only way a real user reaches them - both pages render permanently empty. Reporting today is a working engine with no data connected to it.

## 1. Business Purpose

Reporting answers operational questions about work that REOS has already recorded: how much work exists, where it is in the lifecycle, how well it was executed, and who did it. It is the read-only tail of the approved business flow.

Per REPORTING_STANDARDS.md, every report answers exactly one business question, reports are generated from live operational data, operational entities remain the single source of truth, and **reports must never become the system of record**. This design treats that as a hard constraint, not a guideline: nothing in the Reporting domain is persisted, and no report output is ever written back into an operational entity.

## 2. Position in the Operational Workflow

Verified against the code, not assumed. The chain below is the one Sprint 15 proved live in a browser:

```
Shared Batch Upload      -> sharedBatchService / excelValidationService -> SharedBatch
   |                                                                       (sharedBatchStore)
Branch Assignment        -> branchAssignmentService (canonical, DEC-006)  -> Assignment
   |                                                                       (sharedBatchStore)
Branch Processing        -> branchProcessingQueueService                  -> BranchProcessingQueueItem
   |                                                                       (module-local state)
Proof Management         -> proofDownloadService / proofOfPaymentService  -> ProofDownloadBatch,
   |                                                                          BatchDownloadSummary
Reporting                -> reportService (+ dashboardService)            -> read-only projections
```

Reporting is a **pure consumer**. It performs no lifecycle transitions, writes no operational state, and owns no operational entity. It sits downstream of all four upstream modules and, per PROOF_MANAGEMENT.md Section 8, is already named as Proof Management's downstream consumer.

The one architectural consequence that matters: because Reporting reads *across* all modules, it is the only module that needs enterprise-wide enumeration of operational data. No such capability exists today (Section 3).

## 3. The Data Source Problem (Primary Architectural Finding)

Reporting's engine works. Its data path does not exist. Three distinct gaps, all confirmed by reading the code:

### 3.1 Both report and dashboard pages read from navigation state

`ReportsPage.tsx` derives `sourceData` from `location.state`; `OperationsDashboardPage.tsx` does the same for `OperationsDashboardSourceData`. Neither has any other source. A search of `src` finds no navigation to `/reos/reports` or `/reos/dashboard` that passes state - the Sidebar entries are plain `href`s, and `LoginPage` navigates to `/reos/dashboard` with only `{ replace: true }`.

Consequence: `sharedBatches` and `processingBatches` are always `[]`. Every report renders its correct empty state; every dashboard KPI renders `0`. This is invisible to `tsc` and to `npm run build` - exactly the class of defect PROJECT_STATE.md's standing caveat describes, and the same class as Sprint 14's unmounted routes and Sprint 15 M1's missing navigation link.

### 3.2 The stores expose no enumerating read accessors

`sharedBatchStore.ts` exposes `getSharedBatch(id)`, `getAssignment(id)`, and `getAssignmentsByBranch(branchId)`. There is no `listSharedBatches()` and no `listAssignments()`. `branchProcessingQueueService.ts` exposes `getBranchProcessingQueue(branchId)` - per-branch only, with no enterprise-wide equivalent.

Consequence: even if the pages stopped relying on `location.state`, Reporting could not assemble an enterprise-wide result set without knowing every branch id in advance. Operations Manager visibility is enterprise-wide (BUSINESS_RULES.md, frozen rule), so this is a genuine capability gap, not a convenience.

### 3.3 There is no reporting read layer

`ReportSourceData` (`sharedBatches?`, `processingBatches?`) is a *parameter shape*, not a source. Nothing builds it. `BranchProcessingBatch` - the type `ReportSourceData.processingBatches` expects - is never constructed from the live queue anywhere in the codebase; the live path produces `BranchProcessingQueueItem[]`, a different shape.

### 3.4 Proposed resolution (design)

Introduce one **read-only reporting projection layer** between the operational stores and the reporting/dashboard services.

> **Fully specified in REPORTING_PROJECTION_LAYER.md** (Sprint 16 M3): projection models, the single projection service, the per-field data-ownership matrix, the permitted/forbidden dependency contract, and persistence future-compatibility. The constraints below are the summary; that document governs the detail.

Design constraints on it:

- **Read-only.** It may only read existing state. It performs no writes, no transitions, no mutation of any operational entity.
- **No new store.** It does not cache, copy, or persist operational data. It projects on demand. (REPORTING_STANDARDS.md: "Reports must not duplicate operational data", "must not create reporting tables", "must not introduce persistence". DEC-004 is unaffected.)
- **No new business logic.** Where a summary already exists - `getBranchProcessingQueueSummary`, `getBatchDownloadSummary`, `buildProofDownloadBatchFromSharedBatch` - the projection layer calls it. It must not re-derive completion counts, lifecycle status, or download status independently. This is the single most important rule for avoiding the duplication Sprints 13-15 each had to undo.
- **Owned by Reporting.** It lives in the Reporting module and depends on the other modules; they must not depend on it.

It requires two supporting additions outside Reporting, both read-only and both minimal:

1. `sharedBatchStore.ts`: enumerating accessors (all Shared Batches, all Assignments).
2. `branchProcessingQueueService.ts`: an enterprise-wide read of queue items, alongside the existing per-branch read.

Both are additive read functions over state that already exists. Neither changes a transition, a validation rule, or an ownership boundary. They nonetheless fall outside the Reporting module and therefore require explicit sprint approval to touch (Decision D-4).

## 4. Reporting Domain Model

Design only. No types are declared here; this section defines the model an implementation sprint would express. Existing types are marked **adopt** or **extend** - a new type is proposed only where no existing type covers the concept.

### 4.1 Report (concept, not a new type)

`Report` is the domain concept of "one business question, answered from live operational data". It is realized at runtime by a `ReportDefinition` (what the report is) plus a `ReportExecution` (one answering of it).

**No `Report` entity should be created.** A stored `Report` object is precisely how a reporting module becomes a system of record, which REPORTING_STANDARDS.md forbids. Recorded here explicitly so the concept is not mistaken for a missing type at implementation time.

### 4.2 ReportDefinition - EXTEND (exists in `types/report.ts`)

The static, registered description of one report. Already implemented with `id`, `name`, `category`, `type`, `format`, `description`, `columns`, and a working `reportService.register()` extension point that rejects duplicate ids.

Proposed extensions:

| Field | Purpose | Why |
|---|---|---|
| `businessQuestion` | The single question the report answers | REPORTING_STANDARDS.md requires the header to display it. `description` already holds question text by convention; making it explicit removes the ambiguity. |
| `supportedFilters` | Which filters this report accepts | REPORTING_STANDARDS.md: "Reports must use only relevant filters." Today `ReportFilters.tsx` renders all filters for every report. |
| `defaultSortKey` / `defaultSortDirection` | Default sort supporting the question | REPORTING_STANDARDS.md Sorting standard. Today `ReportsPage` hardcodes `defaultSortKey="date"` for all reports. |
| `permittedRoles` | Which REOS roles may view it | Section 8. No role gating exists in Reporting today. |
| `supportedExports` | Which formats this report may be exported to | Section 7. |
| `totalsColumns` | Which columns the totals row summarizes | REPORTING_STANDARDS.md: totals must summarize only meaningful, non-financial columns. Today `ReportsPage.getTableTotals` hardcodes four column keys for every report. |

`ReportCategory` must widen if Decision D-1 is approved (today: `"VOLUME" | "PERFORMANCE"`).

### 4.3 ReportTemplate - NEW (narrowly scoped)

The **layout contract** every report renders through: Header, Filters, Summary, Detail Table, Totals, Export Actions, in that order (REPORTING_STANDARDS.md Report Layout Standard, restated in UI_GUIDELINES.md).

A `ReportDefinition` binds to a template; the template owns presentation structure, not data. Its value is that layout compliance becomes structural rather than a convention each new report re-implements - the same reason `ProofDownloadPanel` was migrated onto the shared `DataTable` in Sprint 15 M2.

**Explicit non-goal.** `ReportTemplate` is **not** a user-authored or user-saved report, not a report builder, and not a customization feature. Those are generic ERP capabilities, forbidden by CODING_RULES.md and BUSINESS_RULES.md. Templates are defined in code, fixed at build time, and not editable by any role.

Realistically only two templates are needed: a standard tabular template, and a grouped-summary variant if a Performance report needs branch-level grouping. If one suffices, ship one.

### 4.4 ReportFilter - EXTEND (exists in `types/report.ts`)

Today: `fromDate`, `toDate`, `branchId`, `batchReference`, `reportType`. Filter matching lives in `reportService`'s `matchesFilters`. See Section 6 for the full proposed filter set and its feasibility.

One rule for the implementation sprint: **all filter application stays in `reportService`.** `matchesFilters` is already the single implementation; new filters extend it rather than adding a parallel filtering path in the projection layer or in a component.

### 4.5 ReportExecution - EXTEND `ReportResult<T>`, do not add a second type

One transient answering of one report: which definition, which filters, which actor, when generated, and the resulting rows, metrics and totals.

`ReportResult<T>` already carries `definition`, `filters`, `metrics`, `rows`, `totals`, `generatedAt`. `ReportExecution` **is** that type extended, not a new sibling. Proposed additions: `generatedByUserId` and `actorRole` (needed for role scoping and for export provenance), and `rowCount` (needed so pagination can never alter reported totals).

Hard constraint: an execution is **transient**. It exists for the duration of the page interaction and is never stored, never assigned an identity that outlives the session, and never written back to an operational entity. There is no execution history, no saved results, and no "last generated report" record. Adding one would make Reporting a system of record and would introduce persistence - both forbidden.

### 4.6 ReportExport - NEW

A description of one export action performed against one execution: the format, the moment, the actor, and the file name.

Design rules:

- An export is produced **from an existing `ReportExecution`**, never by re-querying. Re-querying would allow the exported file to disagree with the previewed report.
- Per REPORTING_STANDARDS.md, the exported artifact must preserve report name, applied filters, generated time, summary, detail table, and totals.
- The export must contain **all** filtered rows, not the current page (Section 9).
- `ReportExport` is a transient descriptor, like `ReportExecution`. No export history is stored. (Note: this is deliberately unlike `ProofDownloadHistoryEntry`, which exists because proof download is an auditable business action; exporting a read-only report is not a lifecycle event.)
- No implementation library is chosen here (per sprint scope).

### 4.7 Row models

`VolumeReportRow` already exists and is a flat, sortable, `Record<string, unknown>`-compatible shape - the correct pattern, since `ReportTable` sorts and renders generically. Performance and Audit reports will need their own analogous flat row shapes. Row models must be **projections**, never operational entities re-exported: a report row is a copy for display, so no consumer can mistake it for writable state.

## 5. Report Categories and Feasibility

This is the section an implementation sprint should read first. Every requested report is mapped to the operational data that would have to produce it, and marked with what is actually achievable today.

Legend: **READY** - all required data exists once the Section 3 read layer is built. **PARTIAL** - the report can be built, but at least one named metric cannot. **BLOCKED** - no data source exists; cannot be built without a decision recorded in Section 11.

### 5.1 Operations (answers "how much work, and where is it?")

| Report | Primary source | Status | Notes |
|---|---|---|---|
| Shared Batch Summary | `SharedBatch` via `sharedBatchStore` | READY | Already implemented as the `SHARED_BATCHES` Volume report; needs only the data path. |
| Branch Assignment Summary | `Assignment` via `sharedBatchStore` | READY | `readyTransactionCount`, `manualReviewCount`, `invalidCount`, `assignedAt`, `assignedBy` all exist on `Assignment`. Requires the enumerating accessor (3.2). |
| Branch Processing Summary | `getBranchProcessingQueueSummary(branchId)` | READY | Reuse the existing summary function - do not recompute counts. Requires enterprise-wide queue read (3.2). |
| Proof Download Summary | `getBatchDownloadSummary` | READY | Reuse as-is. Sprint 15 M4 already corrected its `downloadStatus`. |
| Daily Operations | dates across the above | PARTIAL | Available dates: `SharedBatch.uploadDate`, `assignedAt`, `Beneficiary.transactionDate`. **Completion time is not recorded in the live processing path** (5.4), so "completed today" is not derivable. Ship as upload/assignment activity for a date range, or defer until D-6 is resolved. |
| Lifecycle Status Summary | `SharedBatch.lifecycleStatus` | READY | Counts across the five LIFECYCLE.md states. Note it reports *current* status only - not history (5.3). |

### 5.2 Performance (answers "how well was the work done?")

| Report | Primary source | Status | Notes |
|---|---|---|---|
| Branch Performance | queue summary + `Assignment` per branch | PARTIAL | Volume, completed, returned, on-hold, workload: all READY. **Processing speed: BLOCKED** (5.4). |
| Processing Throughput | completions per unit time | BLOCKED | Requires a completion timestamp per transaction (5.4). |
| Processing Time | start -> completion duration | BLOCKED | Requires both a start and a completion timestamp (5.4). |
| Pending Work | `BranchProcessingQueueSummary.assigned + inProgress + onHold` | READY | `remaining` is already computed by the existing summary function. |
| Completed Work | `BranchProcessingQueueSummary.completed` | READY | Counts only; "how fast" is blocked. |
| Returned Transactions | queue items with `status: RETURNED` | READY | `returnReason` and `returnComment` are retained on the queue item. Already implemented as the `RETURNED_TRANSACTIONS` Volume report. |
| On Hold Transactions | queue items with `status: ON_HOLD` | PARTIAL | Count READY. **Duration on hold: BLOCKED** - no timestamp is recorded on the `ASSIGNED -> IN_PROGRESS -> ON_HOLD` transitions. |

### 5.3 Audit (answers "who did what, and when?") - CATEGORY BLOCKED

Every Audit report is blocked by the same root cause: **REOS creates audit records but stores none of them.**

Confirmed by inspection:

- `TransactionProcessingAudit` is constructed by `transactionProcessingService`'s `addProofToTransaction` / `completeTransaction` / `returnTransaction`, returned to the caller, and never stored anywhere. Additionally, the live processing path is `branchProcessingQueueService`, which does not call these functions at all and produces no audit record.
- `ProofDownloadHistoryEntry` is returned by `downloadProofZip`, `downloadIndividualProof`, and `markBatchDownloaded`, and is held only in component state - it is discarded on unmount.
- `SharedBatchReassignmentAudit` is returned inside `SharedBatchAssignmentResult` and is not stored.
- `sharedBatchStore.updateSharedBatchLifecycleStatus` **overwrites** `lifecycleStatus` in place. No transition log exists, so lifecycle history is unrecoverable by construction.

| Report | Would require | Status |
|---|---|---|
| Assignment History | Persisted `SharedBatchReassignmentAudit` | BLOCKED. `SharedBatch` retains only `lastReassignedByUserId` / `lastReassignedAt` / `lastReassignmentReason` - the **most recent** event, not a history. A single-event "Latest Assignment Change" report is possible; a history is not. |
| Lifecycle History | A transition log | BLOCKED |
| Processing History | Persisted `TransactionProcessingAudit` from the live path | BLOCKED |
| Proof Download History | Persisted `ProofDownloadHistoryEntry` | BLOCKED |
| User Activity | All of the above, keyed by user | BLOCKED |

BUSINESS_RULES.md states "All business actions must be auditable" and "Audit logs are immutable" - so an audit trail is business-mandated, and its absence is a genuine gap rather than an out-of-scope wish. But building one means introducing append-only state that must survive the actions it records, which is a persistence decision governed by DEC-004 and ARCHITECTURE.md. It is therefore escalated (Decision D-5), not assumed.

**Recommendation:** do not implement the Audit category in the Reporting implementation sprint. Implement the audit trail first, as its own scoped piece of work, then add Audit reports as pure consumers of it. Building Audit reports against absent data would produce five reports that are permanently empty - repeating the exact defect described in Section 3.

### 5.4 The processing-metrics gap (root cause for every BLOCKED Performance metric)

`BranchProcessingQueueItem` carries `id`, `assignmentId`, `branchId`, `beneficiary`, `status`, `proofs`, `returnReason`, `returnComment`. It has **no timestamps and no user attribution** - no `startedAt`, no `completedAt`, no `completedByUserId`.

`CreditToAccountTransaction` *does* define `completedAt` / `completedByUserId` / `returnedAt` / `returnedByUserId`, but the live path never populates them: `proofDownloadService.buildProofDownloadBatchFromSharedBatch` maps queue items into `CreditToAccountTransaction` with `completedByUserId: null, completedAt: null` hardcoded.

Two consequences worth stating plainly:

1. Every duration-based and officer-attributed metric is uncomputable from live data.
2. `dashboardService.getAverageProcessingMinutes` reads `transaction.completedAt`, so "Average Processing Time" resolves to `"No data"` in the live path today, and `BranchPerformanceRow.processingSpeedMinutes` is always `null` - which in turn drives `getBranchHealth` to `YELLOW` for every branch. This is a latent dashboard-correctness issue independent of Reporting.

Closing this means adding completion/return timestamps and actor ids to the Branch Processing queue item. That is a change to Branch Processing, not Reporting, and it interacts with Branch Processing's already-open actor-role gating decision (TECH_DEBT.md). Escalated as Decision D-6.

## 6. Filtering

### 6.1 Filter set

| Filter | Exists today | Source field | Status |
|---|---|---|---|
| Date range (`fromDate` / `toDate`) | Yes | Row `date`, per-report via `getTransactionDate` | READY |
| Branch | Yes | `assignedBranchId` | READY. Today a free-text branch-id input; should become a selector over `Branch` (Decision D-7 - no branch registry service exists). |
| Batch reference | Yes | `SharedBatch.reference` | READY (substring match, already implemented) |
| Report type | Yes | Definition selector | READY |
| Lifecycle status | No | `SharedBatch.lifecycleStatus` | READY to add |
| Transaction status | No | queue item `status` (5 values) or `CreditToAccountTransactionStatus` (3 values) | READY to add - **but see 6.2** |
| Return reason | No | `BranchProcessingQueueItem.returnReason` | READY to add |
| User / Officer | No | - | BLOCKED. No completed-by/returned-by attribution in the live path (5.4). |
| Transaction | No | `Beneficiary.directRemitReference` | READY to add |
| Search | No | free text over reference/beneficiary | READY to add |

All filters listed as READY are within REPORTING_STANDARDS.md's approved reusable filter list. No one-off filters are proposed.

### 6.2 A status-vocabulary hazard to resolve at implementation time

Two different transaction status vocabularies exist:

- `BranchProcessingQueueStatus`: `ASSIGNED | IN_PROGRESS | COMPLETED | ON_HOLD | RETURNED` (the live queue)
- `CreditToAccountTransactionStatus`: `PENDING | COMPLETED | RETURNED` (the reporting/type-level model)

`proofDownloadService.toTransactionStatus` collapses the first into the second, mapping `ASSIGNED`, `IN_PROGRESS` and `ON_HOLD` all to `PENDING`.

Consequence: a "Pending Work" or "On Hold Transactions" report built on `CreditToAccountTransaction` **cannot distinguish on-hold from in-progress work** - the distinction is destroyed by the mapping. Those two reports must therefore project from `BranchProcessingQueueItem` directly, and the Transaction Status filter must state which vocabulary it filters. This is a design constraint on the implementation sprint, not a defect to fix here; introducing a third status enum is explicitly not the answer.

### 6.3 Filter behavior rules

- Filters apply before summary and detail table (REPORTING_STANDARDS.md layout order).
- Filters are declared per definition via `supportedFilters` (4.2); a report renders only its relevant filters.
- Filter state should be reflected in the URL as query parameters, so a report view is linkable and a dashboard drill-down can hand off filters without relying on `location.state` - the mechanism that failed in Section 3.1. Note this makes the *view* reproducible, not the *data*: under DEC-004 the in-memory store does not survive a reload, so a reloaded report legitimately shows an empty result set until data is re-created.
- Invalid ranges are rejected by the existing `reportService.validateFilters`, which already handles `fromDate > toDate`. Extend that function; do not add a second validator.

## 7. Export Architecture

Design only. No implementation library is selected, per sprint scope.

### 7.1 Model

```
ReportExecution (transient, already generated and previewed)
        |
        v
  ReportExport (format, generatedAt, actorUserId, fileName)
        |
        v
  Format writer (Excel | PDF | CSV | Print)
```

One writer per format, behind a single export entry point. All writers consume the same `ReportExecution` snapshot, so every format is guaranteed to agree with what the user previewed.

### 7.2 Content contract (all formats)

Per REPORTING_STANDARDS.md, every export preserves: report name, report category, business question, applied filters (rendered readably, not as raw field names), generated time, summary metrics, the full filtered detail table, and totals.

Additional rules:

- **All filtered rows, not the current page.** Today `ReportTable` paginates client-side at 10 rows; an export driven from the page view would silently truncate.
- **No financial columns in any export**, matching the report itself.
- File naming should be deterministic and include the report name and generated date.
- Exports are generated client-side from data already in memory. No server round trip, no new dependency on the persistence boundary.

### 7.3 Per-format notes

| Format | Notes | Standards position |
|---|---|---|
| Excel (.xlsx) | Tabular with a header block for name/filters/generated time; totals as a distinct row. Note `xlsx` is already a project dependency (used for upload validation, and used by Sprint 15 M1 to build test fixtures) - so this is likely achievable without a new dependency. | Approved |
| PDF | Must reproduce the report layout, not a raw table dump. The only format likely to need a new dependency - flag before committing. | Approved |
| Print | Browser print of the report view with a print stylesheet; the cheapest to implement and the natural first one to ship. | Approved |
| CSV | Detail table plus a filter/metadata preamble. **Not currently permitted** - REPORTING_STANDARDS.md states "CSV export is not supported." Requires Decision D-3. | **Requires amendment** |

### 7.4 Current state

`ReportExportActions.tsx` renders three permanently `disabled` buttons (Excel, PDF, Print) with no handlers, and uses raw Tailwind classes rather than shared theme tokens - so it will also need the same migration Sprint 15 M2 applied to Proof Management. It is a placeholder, not a partial implementation; there is nothing to preserve except its position in the layout.

## 8. Permissions

Uses **only** the three approved REOS roles (`ReosUserRole`: `OPERATIONS_MANAGER`, `DIRECT_REMIT_OFFICER`, `BRANCH_OFFICER`) and the frozen visibility rules in BUSINESS_RULES.md: one user = one role, one user = one branch, Operations Manager has enterprise-wide visibility, Branch Officer sees only their own branch.

### 8.1 Matrix

| Role | View | Generate | Export | Scope |
|---|---|---|---|---|
| Operations Manager | All categories | Yes | Yes | Enterprise-wide |
| Direct Remit Officer | Operations reports covering batch lifecycle and proof download | Yes | Yes | All batches they own in the Direct Remit lifecycle |
| Branch Officer | Operations and Performance reports for their own branch | Yes | Yes | **Own branch only** - enforced, not offered as a filter default |

"Generate" is not a privileged action distinct from "view": generating *is* how a report is viewed (Section 9), so any role that may view a report may generate it. A separate generate permission would be permission theater. Export is listed separately because it produces an artifact that leaves REOS.

Audit reports, if D-5 is approved, should default to Operations Manager only - BUSINESS_RULES.md assigns audit ownership to that role.

### 8.2 Enforcement

- Enforce in the **service layer**, following the `proofDownloadService.assertDirectRemitOfficer` precedent already praised in PROOF_MANAGEMENT.md Section 6. Component-level hiding alone is insufficient.
- Branch Officer scoping must be applied to the projection (Section 3.4) before rows reach the report, not as a pre-filled filter a user could clear.
- `ReportDefinition.permittedRoles` (4.2) drives which definitions appear in the report selector.

### 8.3 Two conflicts that must be resolved before implementation

1. **REPORTING_STANDARDS.md names roles that do not exist in REOS.** Its Permissions section recommends visibility for "General Manager" and "Branch Manager". Neither appears in `ReosUserRole` nor in BUSINESS_RULES.md's Approved Roles. That section is explicitly advisory ("recommends visibility only... does not change current authorization"), so this design uses the three real roles - but the standard should be corrected (Decision D-8).
2. **`GENERAL_MANAGER` is already in the dashboard code.** `OperationsDashboardRole` is `"OPERATIONS_MANAGER" | "GENERAL_MANAGER"`, and `OperationsDashboardPage` renders a "General Manager access is read-only overview only" notice. This is an unapproved role present in shipped code. It must be either approved as a real REOS role or removed - it should not be extended into Reporting either way (Decision D-8).

## 9. Reporting Lifecycle

```
Select Definition -> Apply Filters -> Generate -> Preview -> Export
```

| Stage | Behavior |
|---|---|
| Select Definition | Role-filtered list from `reportService.getDefinitions()`. |
| Apply Filters | Only the definition's `supportedFilters`; validated by `reportService.validateFilters`. |
| Generate | Projection layer reads live operational data; `reportService` filters, aggregates and sorts; produces a transient `ReportExecution`. |
| Preview | Rendered through the `ReportTemplate` layout: Header, Filters, Summary, Detail Table, Totals, Export Actions. |
| Export | Optional, from the existing execution; produces a `ReportExport`. Terminal - it does not alter the execution. |

Rules:

- **No scheduling.** No scheduled generation, no recurring reports, no background jobs, no delivery. Out of scope by instruction, and consistent with BUSINESS_RULES.md placing an automatic scheduler out of scope.
- **No persistence at any stage.** Nothing is saved between stages beyond React component state and URL filter parameters.
- **Re-generation is normal.** Changing a filter produces a new execution. There is no execution history to reconcile.
- **The lifecycle is read-only end to end.** No stage writes to any operational entity or triggers any lifecycle transition. Reporting can never advance a `SharedBatch`.

## 10. Dashboard Architecture

### 10.1 Relationship to Reporting

REPORTING_STANDARDS.md states "Reports must not become dashboards." This design honors that literally by keeping them **separate consumers of one read layer**, not by merging them:

```
                    Reporting projection layer (Section 3.4)
                        |                         |
              reportService                 dashboardService
        (one question, tabular,        (many indicators at a glance,
         filtered, exportable)          KPI-first, drill-down)
```

Neither service calls the other; neither re-derives the other's aggregates. A report never becomes a dashboard, and a dashboard never becomes a report - a dashboard **links into** a report (10.5).

### 10.2 Executive Dashboard - NEW

**Question:** is the operation as a whole healthy today?

| KPI | Source | Status |
|---|---|---|
| Total Shared Batches | `SharedBatch` count | READY |
| Batches by lifecycle status | `lifecycleStatus` across the 5 LIFECYCLE.md states | READY |
| Total transactions in operation | queue item count | READY |
| Completion rate | completed / total | READY |
| Return rate | returned / total | READY |
| Batches awaiting proof download | `READY_FOR_DOWNLOAD` count | READY |
| Workflow completion | `DOWNLOADED` count | READY |
| Average processing time | - | **BLOCKED** (5.4) |

Widgets: lifecycle funnel (ASSIGNED -> DOWNLOADED), branch comparison, exception summary. No financial widgets of any kind.

### 10.3 Operations Dashboard - EXTEND (exists)

**Question:** what requires the Operations Manager's attention right now? Already implemented (`OperationsDashboardPage`, `dashboardService`) with KPI stats, critical alerts, branch performance, work queue, exception center, and today summary - a genuinely substantial implementation to adopt, not rebuild.

Three corrections are required before it can be considered compliant:

1. **Connect it to real data** (Section 3.1) - today it always renders zeros.
2. **Remove financial metrics.** `dashboardService` computes `usdValue`, `revenue`, and a `revenueRate`; `BranchPerformanceTable` renders "USD Value" and "Revenue" columns; `TodaySummary` shows "USD Processed" and "Revenue". REPORTING_STANDARDS.md explicitly lists Revenue and USD Processed as out of scope, and this sprint's brief forbids financial reporting. `OperationsDashboardPage` currently filters two financial *stat cards* out at render time, which suppresses the symptom while the table and summary still display revenue. Recorded in TECH_DEBT.md.
3. **Reconsider "Liquidity Issues".** The `liquidity-issues` critical alert is derived from workload and value concentration, not from any liquidity data - REOS has no liquidity module, and Treasury is out of scope per BUSINESS_RULES.md. The alert is misnamed at best.

### 10.4 Branch Dashboard - NEW

**Question:** what does this branch need to do next? Scoped to the acting Branch Officer's own branch (BUSINESS_RULES.md, frozen).

| KPI | Source | Status |
|---|---|---|
| Assigned to this branch | `getBranchProcessingQueueSummary().assigned` | READY |
| In progress | `.inProgress` | READY |
| On hold | `.onHold` | READY |
| Completed | `.completed` | READY |
| Returned | `.returned` | READY |
| Remaining work | `.remaining` | READY |
| Completion percentage | `.completionPercentage` | READY |
| Branch processing status | `getBranchProcessingStatus(branchId)` | READY |

Every value comes from the existing `BranchProcessingQueueSummary` - zero new aggregation logic. This is the cheapest of the three dashboards and the one with no blocked KPIs.

### 10.5 Drill-down

Uniform rule: **a dashboard widget drills into a report, filtered.** A KPI is a count; the report behind it is the record list.

- Target: `/reos/reports` with report type and filters as URL query parameters (6.3).
- Existing behavior to replace: `dashboardService` currently emits `drillDownPath` values like `/reos/dashboard#branch-performance` - same-page anchor scrolls, not drill-downs. Widening `drillDownPath` into report links is the natural upgrade.
- Branch Officer drill-downs stay branch-scoped by service-layer enforcement (8.2), not by the link.

### 10.6 Reuse

`KpiCard`, `DataTable`, `EmptyState`, `LoadingState`, `PageHeader`, `PageContainer`, `FilterBar`, `StatusBadge` and `BatchLifecycleBadge` already exist and are theme-token styled. New dashboards compose these. Per UI_GUIDELINES.md, prefer existing components; the Sprint 15 M2 precedent (rebuilding `ProofDownloadPanel` on the shared `DataTable`) is the model.

## 11. Performance Considerations

Design only. In-memory data, single browser session, realistic volumes in the low thousands of rows.

### 11.1 Pagination - required now

`ReportTable` already paginates client-side at a fixed 10 rows. Requirements: page size should come from the template rather than a hardcoded constant; **pagination must never change totals** (REPORTING_STANDARDS.md) - satisfied today because totals derive from `metrics` computed over the full filtered set, and that separation must be preserved; sorting must apply across the whole result set before paging (also satisfied today); and export must take the full filtered set (7.2).

### 11.2 Lazy loading - design for it, do not build it yet

Reports should generate on explicit filter application, not on every keystroke. Dashboard widgets should be independently resolvable so one blocked widget cannot block a whole dashboard. At current data volumes this is a structural precaution, not a measured need.

### 11.3 Caching - future, deliberately deferred

A memoized execution keyed by definition + filters + a data-version counter is the natural shape. **Not now**: a cache is a copy of operational data, which brushes against "reports must not duplicate operational data," and a stale cache would show wrong operational state - a worse failure than a slow report. React `useMemo` within a page (already used by `ReportsPage` and `OperationsDashboardPage`) is sufficient and is not persistence.

### 11.4 Async generation - future

Only justified once a real dataset makes synchronous generation visibly block the UI, which in-memory data at current volumes does not. If introduced later, it must preserve the transient-execution rule: an async execution is still not stored.

### 11.5 Scaling note

Every consideration above is scoped to the current in-memory architecture (DEC-004). If persistence is ever approved, pagination and filtering should move to the data layer, and this section should be revisited as part of that decision rather than pre-designed for it now.

## 12. Validation Against Existing Architecture

| Check | Result |
|---|---|
| Consistent with the verified workflow | Yes. Reporting is positioned as the read-only tail of Shared Batch -> Assignment -> Processing -> Proof Management (Section 2), the chain Sprint 15 proved live. |
| No duplicate business logic | Yes, by explicit rule. Reuses `getBranchProcessingQueueSummary`, `getBatchDownloadSummary`, `buildProofDownloadBatchFromSharedBatch`, `reportService.matchesFilters` and `validateFilters`. Extends `ReportResult<T>` rather than adding a parallel execution type. No third transaction-status enum (6.2). |
| No new business rules | Yes. All rules restated are from BUSINESS_RULES.md, LIFECYCLE.md, or REPORTING_STANDARDS.md. |
| No conflict with DECISIONS.md | DEC-001: Reporting reads only, never a source of truth. DEC-002/003: batch and transaction ownership untouched. DEC-004: no persistence introduced - executions and exports are transient. DEC-005: this design is proposed, not self-approved. DEC-006: Reporting never creates or updates an `Assignment`. |
| Reporting consumes existing operational data only | Yes. Every READY item in Section 5 maps to a field that exists today. Everything without a real source is marked BLOCKED rather than designed around. |
| No financial reporting introduced | Yes - and Section 10.3 additionally identifies financial metrics **already present** in the existing dashboard that should be removed. |
| No scheduling | Yes (Section 9). |
| Module boundary preserved | Reporting depends on other REOS modules; they do not depend on it. The two read accessors it needs are additive and escalated as Decision D-4. |

## 13. Definition of Done (for the future implementation sprint - not this design pass)

- Decisions D-1 through D-8 are resolved and recorded in DECISIONS.md before implementation begins.
- The reporting projection layer exists, is read-only, and reuses existing summary functions rather than recomputing them.
- `/reos/reports` and `/reos/dashboard` display real operational data when reached from the Sidebar - **verified live in a browser**, not by build output. This is the acceptance criterion that matters most; per PROJECT_STATE.md's standing caveat, and given that Section 3.1 is precisely the class of defect a green build conceals, a passing `tsc`/`build` proves nothing here.
- Every implemented report renders the full REPORTING_STANDARDS.md layout and answers exactly one business question.
- No report marked BLOCKED in Section 5 has been implemented against absent data.
- Role gating is enforced in the service layer; Branch Officer scoping is enforced on the projection, not on a filter.
- Financial metrics are removed from the Operations Dashboard, or an explicit decision permitting them is recorded.
- No persistence, no scheduling, no new business rules, no second reporting engine.
- TypeScript compiles; production build succeeds; changed code confirmed present in the bundle.
- CURRENT_SPRINT.md, PROJECT_STATE.md, MODULE_STATUS.md, TECH_DEBT.md updated to reflect actual implementation status.

## Open Business Decisions

Per the CLAUDE.md Decision Gate, these are reported rather than assumed.

**D-1 (blocking the category taxonomy).** REPORTING_STANDARDS.md is canonical and permits exactly two categories - Volume and Performance - and `ReportCategory` is typed `"VOLUME" | "PERFORMANCE"`. The requested taxonomy is Operations, Performance, Audit. "Operations" is a rename of "Volume" (same business question, "how much work?"); "Audit" is genuinely new. Approving the requested taxonomy requires amending REPORTING_STANDARDS.md and widening `ReportCategory`. Recommendation: approve the amendment, since an audit category is implied by BUSINESS_RULES.md's audit rules - but amend the standard explicitly rather than letting code and standard drift apart.

**D-2.** REPORTING_STANDARDS.md states "Reports must not become dashboards," while three dashboards are requested and one already exists in shipped code. Section 10.1 resolves this by keeping Reporting and Dashboards as separate consumers of one read layer. Confirm this reading, and confirm that Executive and Branch dashboards are approved new UI surface.

**D-3.** REPORTING_STANDARDS.md states "CSV export is not supported"; CSV is requested. Requires an amendment to the standard, or dropping CSV.

**D-4.** Reporting needs read-only enumerating accessors in `sharedBatchStore.ts` and `branchProcessingQueueService.ts` (Section 3.2). Both are additive and read-only, but both lie outside the Reporting module. Approve touching those two files, or approve an alternative source.

**D-5 (blocks the entire Audit category). RESOLVED 2026-08-13, DECISIONS.md DEC-022 - see docs/AI/AUDIT_TRAIL.md.** REOS creates audit records and stores none (5.3). Implementing Audit reports requires an append-only audit trail - new state that outlives the actions it records, governed by DEC-004 and ARCHITECTURE.md's persistence boundary. Decide whether to (a) approve an in-memory audit trail as its own scoped work, (b) defer Audit to a persistence sprint, or (c) drop the Audit category. Recommendation: (b) or (a) - but do not implement Audit reports without it. **Resolution: a real, persisted, Supabase-backed audit trail was built as its own scoped work (option (a), against real persistence rather than in-memory, since Phase 2 had by then made that available). The Audit report *definitions* themselves remain unbuilt - this decision unblocked them, it did not build them.**

**D-6 (blocks Processing Time, Throughput, and branch speed).** `BranchProcessingQueueItem` records no timestamps and no actor (5.4). Adding `startedAt` / `completedAt` / `completedByUserId` is a Branch Processing change that overlaps that module's already-open actor-role gating decision (TECH_DEBT.md). Decide whether Sprint 16 may extend Branch Processing's queue item, or whether these Performance reports are deferred.

**D-7.** The Branch filter is a free-text branch-id input today, and no branch registry service exists in REOS (`types/branch.ts` defines `Branch`; nothing lists branches). A usable branch selector needs an approved branch data source. Decide whether that is in scope.

**D-8.** `GENERAL_MANAGER` appears in `OperationsDashboardRole` and in `OperationsDashboardPage`'s UI, and REPORTING_STANDARDS.md's advisory Permissions section names "General Manager" and "Branch Manager" - none of which are approved REOS roles (`ReosUserRole`, BUSINESS_RULES.md). Decide whether to formally approve any of these roles or remove them. This design uses only the three approved roles.

**D-9 (not blocking, raised for correctness).** The existing Operations Dashboard displays Revenue and USD Processed (10.3), which REPORTING_STANDARDS.md places out of scope. Confirm removal.

# Reporting Projection Layer

Sprint 16 architecture and design reference. This document specifies the **Reporting Projection Layer** - the read-only boundary between REOS operational state and everything that reports on it.

Status: **DESIGN ONLY.** No application source code was written or modified to produce this document. Implementation has not started. `src/**` was read for grounding and was not changed.

Authority: subordinate to REPORTING_STANDARDS.md and REPORTING_ARCHITECTURE.md. This document expands REPORTING_ARCHITECTURE.md Section 3.4, which identified the layer as missing but did not specify it. CURRENT_SPRINT.md governs active sprint scope.

## 1. Why This Layer Exists

REPORTING_ARCHITECTURE.md Section 3 established three facts, all confirmed against the code:

1. `ReportsPage.tsx` and `OperationsDashboardPage.tsx` source their data from React Router `location.state`, and nothing navigates to either route with state - so both render permanently empty for a real user.
2. The stores expose no enumerating accessors, so enterprise-wide reporting is impossible even if the pages were fixed.
3. `ReportSourceData.processingBatches` is typed `BranchProcessingBatch[]`, a shape the live processing path never builds.

The naive fix - have each page read the stores itself - would put aggregation logic in pages, duplicate it across Reporting and Dashboards, and hard-wire both to the current in-memory store shape. REOS has already paid for that mistake three times: a duplicate Branch Processing status machine (Sprint 13), a duplicate Assignment-creation path (Sprint 14), and a duplicate source of route truth (Sprint 15 M3).

This layer is the single seam where operational state becomes reportable data. One reader, one place to enforce scope, one place to change when persistence arrives.

## 2. Responsibilities

### 2.1 The layer does

- Read Shared Batch, Assignment, Branch Processing, and Proof Management state through their owning modules.
- Flatten and join that state into read-only projection models (Section 4).
- Resolve cross-module references (batch -> assignment -> queue items -> proofs).
- Apply actor scope, so a Branch Officer's projection contains only their branch (Section 6.3).
- Guarantee deterministic ordering (Section 7.5).
- Return copies, never live references into operational state.

### 2.2 The layer does not

| Prohibition | Why |
|---|---|
| No business logic | Business calculations belong to the owning module's service (BUSINESS_RULES.md Business Principles: "Service layer owns business calculations"). The layer **calls** existing summary functions; it never re-derives what they compute. |
| No business rules | Frozen rules are not restated, reinterpreted, or enforced here. |
| No writes | No mutation, no lifecycle transition, no status change, no store update. Read-only in the strict sense. |
| No persistence | No new store, no cache, no copy that outlives the call. REPORTING_STANDARDS.md: reports must not duplicate operational data, create reporting tables, or introduce persistence. DEC-004 unaffected. |
| No filtering | Report filters stay in `reportService.matchesFilters` - the existing single implementation. The layer produces the candidate set; it does not apply `ReportFilter`. (Actor **scope** is not a filter - see 6.3.) |
| No formatting | No date formatting, no currency formatting, no label text. Projections carry raw values; presentation belongs to components. |
| No metrics or totals | `reportService` computes metrics and totals. The layer supplies rows and reuses existing per-module summaries. |
| No ownership | Reporting owns no operational field (Section 5). |

### 2.3 The one rule that prevents the next duplication incident

> Where a summary already exists, the projection layer calls it.

`getBranchProcessingQueueSummary`, `getBatchDownloadSummary`, `buildProofDownloadBatchFromSharedBatch` and `getSharedBatchesVisibleToBranchOfficer` all exist and are correct. The layer must not recompute completion counts, download status, proof counts, or branch visibility independently. Any place where the layer computes something a module already computes is a defect, not an optimization.

## 3. Position in the Architecture

```
  Pages / Components
  ReportsPage, OperationsDashboardPage, dashboards
        |  may not skip a level, may not aggregate
        v
  reportService            dashboardService
  (filters, metrics,       (KPIs, alerts,
   totals, sort)            work queue)
        |                        |
        +-----------+------------+
                    v
        reportingProjectionService          <-- THIS LAYER
        the only reader of operational state for reporting purposes
                    |
        +-----------+-----------+------------------+
        v           v           v                  v
  sharedBatchStore  branchProcessing  proofDownload  (userService,
                    QueueService      Service         read-only)
```

Direction of dependency is one-way and must stay that way: Reporting depends on the operational modules; **no operational module may import the projection layer.** If Branch Processing ever needs something the projection layer computes, that is a signal the logic belongs in Branch Processing, not that the arrow should reverse.

## 4. Projection Models

Design only - no types are declared here. All four live in one new type file (proposed `types/reportingProjection.ts`), owned by Reporting.

### 4.1 Shared design rules

Every projection obeys all seven:

1. **Flat.** Primitives only - `string`, `number`, `boolean`, `null`. No nested operational entities. A projection that embeds a `SharedBatch` is a leak, not a projection: it lets a consumer reach a writable-looking object and defeats the read-only boundary.
2. **`Record<string, unknown>`-compatible.** `ReportTable` sorts and renders generically over flat keys; `VolumeReportRow` already proves the pattern works.
3. **`readonly` fields**, so the compiler enforces at least part of the contract.
4. **Copies, not references.** `userService.cloneUser` is the existing precedent.
5. **Identity first.** Every projection carries the stable ids needed to correlate it with its sources and to drive drill-down.
6. **Nulls mean "not recorded."** They never mean zero and never mean false.
7. **A stated grain.** Each model declares exactly what one instance represents. Mixing grains inside one model is how a "total" silently double-counts.

### 4.2 `BatchReportProjection`

**Grain: one Shared Batch.**

Answers batch-level questions: how many batches, where are they in the lifecycle, who uploaded and assigned them, how much of each is done.

| Group | Fields | Source |
|---|---|---|
| Identity | batch id, batch reference, file name | `SharedBatch` |
| Origin | upload date, uploaded-by user id | `SharedBatch` |
| Assignment | assignment status, assigned branch id, assigned branch name, assigned-by user id, assigned at, is locked | `SharedBatch` + `Assignment` (branch name lives only on `Assignment`) |
| Lifecycle | lifecycle status | `SharedBatch` |
| Volume | total / assigned / completed / returned beneficiaries, duplicate reference count, manual review count | `SharedBatch` |
| Assignment triage | ready / manual-review / invalid transaction counts | `Assignment` |
| Reassignment (latest only) | last reassigned-by, last reassigned at, last reassignment reason | `SharedBatch` |
| Proof rollup | proof image count, completed transaction count, returned transaction count | `getBatchDownloadSummary` - **called, not recomputed** |
| Projection meta | projected at | layer |

Notes:
- The reassignment fields are the **most recent event only**, not history - `SharedBatch` stores no history (REPORTING_ARCHITECTURE.md 5.3). Field names must make that unmistakable so no consumer builds an "Assignment History" report on them.
- `assignedBranchName` requires the `Assignment`; when a batch has no assignment yet, it is `null`, not the branch id.

### 4.3 `BranchReportProjection`

**Grain: one branch.**

Answers branch-level questions: workload, throughput by count, and where a branch stands.

| Group | Fields | Source |
|---|---|---|
| Identity | branch id, branch name | `Assignment.assignedBranchName`, or `Branch` if a registry is approved (D-7) |
| Batch counts | assigned batch count, batch counts by lifecycle status | `SharedBatch` via assignments |
| Queue counts | assigned, in progress, on hold, completed, returned, remaining, total, completion percentage | `getBranchProcessingQueueSummary` - **called, not recomputed** |
| Processing state | branch processing status (`PROCESSING` / `COMPLETED`) | `getBranchProcessingStatus` |
| Proof | proof image count across the branch's batches | `getBatchDownloadSummary` per batch, summed |
| Projection meta | projected at | layer |

Notes:
- **No `usdValue`, no `revenue`, no liquidity.** REPORTING_STANDARDS.md places these out of scope, and REPORTING_ARCHITECTURE.md 10.3 records that they are already wrongly present in `BranchPerformanceRow`. `BranchReportProjection` must not repeat that; when the dashboard is corrected, `BranchPerformanceRow` should be built from this projection.
- **No `processingSpeedMinutes`.** Blocked by D-6 (Section 8).
- Branch identity is currently derivable only from assignments and queue items. Until D-7 approves a branch registry, a branch with no assignments is invisible to reporting - a real limitation, recorded rather than papered over.

### 4.4 `ProcessingReportProjection`

**Grain: one transaction (one `BranchProcessingQueueItem`).**

The most detailed projection, and the source for transaction-level reports.

| Group | Fields | Source |
|---|---|---|
| Identity | queue item id, assignment id, branch id, shared batch id, batch reference | `BranchProcessingQueueItem` + `Assignment` |
| Transaction | Direct Remit reference, beneficiary name, transaction date, currency, amount, destination country, bank name, account number | `Beneficiary` (read-only Direct Remit data - Section 5.2) |
| Processing | queue status (`ASSIGNED`/`IN_PROGRESS`/`COMPLETED`/`ON_HOLD`/`RETURNED`) | `BranchProcessingQueueItem` |
| Return | return reason id, return reason name, return comment | `BranchProcessingQueueItem.returnReason` |
| Proof | proof count, has proof | `BranchProcessingQueueItem.proofs` |
| Review flags | manual review required, manual review reason | `Beneficiary` |
| Projection meta | projected at | layer |

Notes:
- **Carries `BranchProcessingQueueStatus` (5 values), not `CreditToAccountTransactionStatus` (3 values).** REPORTING_ARCHITECTURE.md 6.2 documents that `proofDownloadService.toTransactionStatus` collapses `ASSIGNED`, `IN_PROGRESS` and `ON_HOLD` into `PENDING`, destroying the on-hold distinction. This projection reads the queue item directly and preserves all five values, which is exactly why "Pending Work" and "On Hold Transactions" must be built on it. A consumer needing the 3-value vocabulary maps down; the layer never maps up.
- **No `completedAt`, `completedByUserId`, `startedAt`, `returnedAt`, `returnedByUserId`.** Not oversights - the live path records none of them (D-6, Section 8).
- `amount` and `currency` are included as **transaction attributes**, not financial metrics. They identify and verify an individual payment instruction. No projection may sum them, and no report may total them - that is the line between operational and financial reporting.

### 4.5 `ProofReportProjection`

**Grain: one proof-of-payment file.**

| Group | Fields | Source |
|---|---|---|
| Identity | proof id, transaction id (queue item id), Direct Remit reference | `ProofOfPayment` + queue item |
| Context | shared batch id, batch reference, branch id | `Assignment` / `SharedBatch` |
| File | file name, file type, file size | `ProofOfPayment` |
| Provenance | uploaded-by user id, uploaded at | `ProofOfPayment` |
| Expiry | expires at, is expired (evaluated against `projectedAt`) | `ProofOfPayment` + layer |
| Status | proof file status (`TEMPORARY`/`DOWNLOADED`/`EXPIRED`) | `ProofOfPayment` |
| Projection meta | projected at | layer |

Notes:
- **`previewUrl` must never be projected.** It is a transient `URL.createObjectURL` blob handle, meaningless outside the session that created it and useless in an export. Excluding it is deliberate.
- `isExpired` is a **read-time comparison** of `expiresAt` against `projectedAt`, not a status change. It writes nothing. This surfaces the gap TECH_DEBT.md records (nothing ever sets `EXPIRED`, since no scheduler is permitted) without resolving it - a report can then show "expired but still marked TEMPORARY" truthfully. Note this is observation only; PROOF_MANAGEMENT.md Open Decision 3 still governs whether `getDownloadableProofs` should enforce it.
- Batch-level proof rollups belong on `BatchReportProjection` (4.2), not here. One grain per model.

### 4.6 Deferred fields

These are specified now so that resolving a decision is an additive change, not a redesign:

| Field | Model | Unblocked by |
|---|---|---|
| `startedAt`, `completedAt`, `completedByUserId`, `returnedAt`, `returnedByUserId` | `ProcessingReportProjection` | **D-6** |
| `processingMinutes`, `averageProcessingMinutes` | `Processing`, `Branch` | **D-6** |
| `branchCode`, `branchCity`, `branchStatus` | `BranchReportProjection` | **D-7** |
| Any audit-history projection | (a new model) | **D-5** |

They are **omitted, not stubbed as permanently-null.** A null column that can never fill renders an empty report column and invites exactly the "looks implemented, shows nothing" failure this sprint was convened to fix.

## 5. Data Ownership

**Reporting owns nothing.** Every field above originates in another module and is reproduced read-only. Reporting owns only the projection *shape* and the `projectedAt` stamp.

### 5.1 Ownership matrix

| Data | Owning module | Owning type / store | Reporting's right |
|---|---|---|---|
| Beneficiary / transaction detail (reference, name, amount, currency, bank, account, date) | **Direct Remit** (external system of record, DEC-001) | `Beneficiary`, imported read-only | Read a copy only |
| Shared Batch identity, upload, counts, lifecycle status, lock, reassignment fields | Shared Batch Upload | `SharedBatch` in `sharedBatchStore` | Read |
| Assignment record, branch name, triage counts, assigned-by/at | Branch Assignment (`branchAssignmentService`, canonical per DEC-006) | `Assignment` in `sharedBatchStore` | Read |
| Queue item status, proofs collection, return reason/comment | Branch Processing | `BranchProcessingQueueItem` in `branchProcessingQueueService` | Read |
| Branch-level processing status | Branch Processing | `branchProcessingStatusState` | Read via `getBranchProcessingStatus` |
| Proof file metadata, expiry, file status | Proof Management | `ProofOfPayment` | Read |
| Batch download summary, download status | Proof Management | `getBatchDownloadSummary` | Read via that function |
| User identity and role | Administration | `User` in `userService` | Read (ids always; names best-effort, 6.2) |
| Branch master data | Administration (**not implemented**) | `Branch` - no registry service exists | Blocked, D-7 |
| Projection shape, `projectedAt` | **Reporting** | `types/reportingProjection.ts` | Owns |

### 5.2 Two consequences worth stating

**Direct Remit data is doubly read-only.** Beneficiary fields are frozen by BUSINESS_RULES.md ("Imported beneficiary data is read-only", "Branch Officers cannot edit imported beneficiary information") *and* owned by an external system of truth (DEC-001). Reporting reproducing them is a copy of a copy. No report may ever present them as authoritative against Direct Remit.

**Proof state physically lives inside Branch Processing.** `ProofOfPayment` objects are stored on `BranchProcessingQueueItem.proofs`; `proofOfPaymentService` is a pure factory with no store of its own. So `ProofReportProjection` reads Proof Management's *type* through Branch Processing's *state*. The layer must respect the logical owner (Proof Management defines proof semantics) while reading from the physical location (the queue). Recording this prevents a future implementer from concluding a proof store exists somewhere and inventing one.

## 6. Projection Service

### 6.1 One service, one entry point

A single service - proposed `services/reportingProjectionService.ts` - is the only module permitted to read operational state for reporting purposes.

| Operation | Returns | Grain |
|---|---|---|
| project batches | `BatchReportProjection[]` | one per Shared Batch |
| project branches | `BranchReportProjection[]` | one per branch |
| project processing | `ProcessingReportProjection[]` | one per queue item |
| project proofs | `ProofReportProjection[]` | one per proof file |

Each takes a **projection scope** (6.3) and nothing else. No filter arguments, no formatting options, no report type.

### 6.2 Composition rules

- Every operation is **self-contained**: it reads what it needs and returns complete projections. No consumer is expected to make a second call to fill in fields.
- Cross-model consistency comes from a **single `projectedAt` per call**. Two operations called in sequence may legitimately disagree if state changed between them; a consumer needing a consistent set across grains should say so, and that is the point at which a combined "projection snapshot" operation would be justified - not before.
- **Missing references are tolerated, never thrown.** A queue item whose assignment is absent still projects, with `null` batch context. With persistence, partial reads become more likely, not less; a projection layer that throws on a dangling reference turns a reporting inconvenience into a page crash.
- **User names are best-effort.** `userService` starts empty and is async, so a user id frequently resolves to no user. Projections always carry the **id**; a display name is optional and never blocks a projection. Reports fall back to the id.

### 6.3 Actor scope - enforced here, deliberately

The scope describes *who is asking*: actor user id, actor role, and the actor's branch id.

Scope is **not** a `ReportFilter`. A filter narrows what a user chose to see and may be cleared; scope narrows what a user is permitted to see and may not. REPORTING_ARCHITECTURE.md 8.2 requires Branch Officer scoping to be applied to the projection rather than offered as a pre-filled filter, and this is the layer that satisfies it.

| Role | Scope applied |
|---|---|
| Operations Manager | None - enterprise-wide (BUSINESS_RULES.md frozen rule) |
| Direct Remit Officer | Batch-lifecycle and proof-download data across branches |
| Branch Officer | **Own branch only**, enforced before any row is returned |

Reuse rather than reinvent: `branchAssignmentService.getSharedBatchesVisibleToBranchOfficer(sharedBatches, branchId)` already implements Branch Officer batch visibility and is a pure read function. The layer should call it for batch scoping instead of writing a second visibility rule - the same reuse discipline as 2.3.

### 6.4 "No page may aggregate data directly"

Enforced by four rules, in order of how much they actually protect:

1. **Only `reportingProjectionService` imports the stores** for reporting purposes. A store import inside a page, a component, or a report/dashboard service is a review failure.
2. **Pages consume `reportService` / `dashboardService` only.** They receive finished rows and metrics.
3. **`reportService` and `dashboardService` consume projections only.** Neither reads a store directly; both keep their current roles (filtering/metrics; KPIs/alerts).
4. **No component performs cross-record aggregation.** Counting, summing, grouping and rate calculation happen in a service. Rendering a count is fine; computing one across records is not.

This is also the concrete fix for the Section 1 defect: once pages obtain data from a service rather than from `location.state`, the empty-page failure cannot recur, because there is no navigation-dependent path left.

### 6.5 What must be added outside Reporting

The layer cannot be built without two additive, read-only capabilities (REPORTING_ARCHITECTURE.md Decision **D-4**):

| File | Needed | Nature |
|---|---|---|
| `sharedBatchStore.ts` | Enumerate all Shared Batches; enumerate all Assignments | New read functions over existing `Map`s |
| `branchProcessingQueueService.ts` | Enumerate queue items across all branches | New read function over the existing array |

Both return copies. Neither changes a transition, a validation rule, or an existing signature. They are the minimum possible change to the two files, and they remain outside the Reporting module - so they need sprint approval before implementation.

## 7. Dependencies

### 7.1 Permitted reads

| Source | Permitted | Notes |
|---|---|---|
| `sharedBatchStore.ts` | `getSharedBatch`, `getAssignment`, `getAssignmentsByBranch`, **+ new enumerators (D-4)** | Primary source for batches and assignments |
| `branchProcessingQueueService.ts` | `getBranchProcessingQueue`, `getBranchProcessingQueueSummary`, `getBranchProcessingStatus`, `isBranchProcessingComplete`, **+ new enterprise-wide read (D-4)** | Summary functions are **called, not recomputed** |
| `proofDownloadService.ts` | `buildProofDownloadBatchFromSharedBatch`, `getBatchDownloadSummary`, `getDownloadableProofs` | All three are pure reads |
| `branchAssignmentService.ts` | `getSharedBatchesVisibleToBranchOfficer` **only** | Read helper for branch scoping (6.3) |
| `userService.ts` | `listUsers`, `getUserById` | Async; best-effort name resolution only (6.2) |
| Type modules | All REOS types | Types are inert |

### 7.2 Forbidden

| Source | Forbidden | Why |
|---|---|---|
| `branchAssignmentService.ts` | `assignSharedBatchToBranch`, `reassignSharedBatch` | Write path; DEC-006 |
| `assignmentService.ts` | `createAssignment` | DEC-006: internal to `branchAssignmentService`, never called from outside |
| `branchProcessingQueueService.ts` | `hydrate...`, `update...Status`, `addProof...`, `complete...`, `return...`, `finalizeBranchProcessing` | All mutate. `hydrate` is especially dangerous: Sprint 15 M1.75 fixed it after it silently destroyed completed work, and a projection call must never be able to trigger it. |
| `sharedBatchStore.ts` | `saveSharedBatch`, `saveAssignment`, `updateSharedBatchLifecycleStatus` | Writes |
| `proofDownloadService.ts` | `markSharedBatchReadyForDownload`, `downloadProofZip`, `downloadIndividualProof`, `markBatchDownloaded` | Lifecycle transitions and side effects |
| `proofOfPaymentService.ts` | `createProofOfPayment`, `markProofDownloaded` | Writes / object-URL side effects |
| `transactionProcessingService.ts` | Everything | Superseded by the queue service in the live path; using it would resurrect a second processing model |
| `userService.ts` | `createUser`, `updateUser`, `setUserLocked` | Writes |
| `dashboardService.ts`, `reportService.ts` | Everything | **Downstream consumers.** Importing either inverts the dependency arrow (Section 3) |
| `excelValidationService.ts`, `sharedBatchService.ts` | Everything | Import/parse concerns, not operational state |
| React, router, DOM, components | Everything | The layer is framework-free (7.4) |

### 7.3 Reverse-dependency prohibition

No operational module may import `reportingProjectionService`. If one appears to need it, the required logic belongs in that module.

### 7.4 Framework independence

The layer imports no React, no router, no DOM API. It is plain TypeScript over data. Two payoffs: it is unit-testable without a renderer (TECH_DEBT.md records that REOS has no observed tests - this layer is the cheapest place to start), and it survives a persistence migration untouched by UI concerns.

## 8. Known Blocked Inputs

The layer is designed around these; none is worked around, and none is silently absent.

| Blocker | Effect on the layer | Decision |
|---|---|---|
| No persisted audit records | No audit projection model exists. Building one now would project nothing. | **D-5** |
| No processing timestamps or actor attribution | Duration and officer-attributed fields are deferred (4.6), not stubbed. | **D-6** |
| No branch registry service | Branch identity derives from assignments; a branch with no assignments is invisible. | **D-7** |
| No enumerating store accessors | The layer cannot be implemented at all until these exist. | **D-4** |

D-4 is the only one that blocks the layer outright. D-5, D-6 and D-7 limit its output without preventing it - the layer can ship, correctly, serving every READY report in REPORTING_ARCHITECTURE.md Section 5.

## 9. Future Compatibility with Persistence

DEC-004 makes the current implementation in-memory only, and ARCHITECTURE.md's persistence boundary means that can change only by explicit approval. The layer must survive that change without a redesign. Seven rules, ordered by how expensive they are to retrofit later.

### 9.1 Asynchronous from day one - the decision that matters most

**Every projection operation should return a `Promise`, even though today's sources are synchronous.**

This is not speculative: `userService` is *already* async (`listUsers(): Promise<User[]>`, `getUserById(): Promise<User | null>`), so the codebase already contains the pattern, and the layer already needs it for name resolution. Every persistence option under consideration (including the Supabase configuration already present in the repository) is asynchronous.

The asymmetry is decisive. Adopting async now costs a few `await`s in two consumer services. Retrofitting sync-to-async later changes the signature of every projection operation, every consuming service method, and every calling component's data flow - a change of exactly the shape and blast radius that Sprints 13-15 each spent a milestone undoing. Cheap now, expensive later, and the codebase already went this way once.

### 9.2 A query descriptor, not positional parameters

The scope argument (6.3) should be a single object. When persistence arrives, pushdown concerns - pagination, sort, server-side scoping - are added as fields on that object, and no signature changes. Design the seam; do not build the pushdown now (11.5 of REPORTING_ARCHITECTURE.md defers it deliberately).

### 9.3 Projections are already decoupled from storage

Because a projection is a distinct shape rather than a re-exported entity, replacing `Map`-backed stores with queries changes only the inside of the projection service. Consumers - `reportService`, `dashboardService`, pages, exports - see identical shapes. **This is the layer's main future-compatibility payoff, and it is lost the moment a projection embeds an operational entity** (4.1 rule 1). That rule is a persistence-migration rule as much as a purity rule.

### 9.4 No store-shape leakage

The layer never exposes a `Map`, a store handle, a live array, or an object reference into store state. `Map`-specific idioms stay inside the projection service, and `userService.cloneUser` is the copying precedent to follow. A consumer that receives a `Map` today would break when the source becomes a query result.

### 9.5 Deterministic ordering - a real trap

In-memory `Map` and array iteration is insertion-ordered. A database returns **no guaranteed order** without an explicit sort. A projection that relies on incidental store ordering will silently reorder every report the day persistence lands - and reordering is far harder to notice than a crash.

Therefore: **every projection operation defines and applies an explicit, deterministic sort before returning**, with a stable tiebreaker (an id) so equal keys never float. This must hold regardless of source. `reportService` may re-sort for presentation; the layer's job is that the input is never arbitrary.

### 9.6 Tolerate partial and missing data

Already required by 6.2, and more important under persistence: a dangling reference must degrade a projection's optional fields to `null`, never throw. Referential gaps that in-memory code makes impossible become ordinary with a real datastore.

### 9.7 No caching now

A cache is a copy of operational data - against REPORTING_STANDARDS.md - and a stale cache shows wrong operational state, which is worse than a slow report. It would also encode in-memory assumptions the migration then has to unwind. React `useMemo` within a page (already used by both pages) is sufficient and is not persistence. Revisit only as part of an approved persistence decision.

### 9.8 What a persistence migration would actually touch

If every rule above holds:

| Component | Change required |
|---|---|
| Projection model types | None |
| `reportService`, `dashboardService` | `await` only, if 9.1 was adopted; otherwise a signature rewrite |
| Pages and components | None |
| Export writers | None |
| **`reportingProjectionService` internals** | **Rewritten - this is the intended blast radius** |
| Store enumerators (D-4) | Replaced by queries |

One file absorbs the migration. That is the entire purpose of the layer.

## 10. Definition of Done (for a future implementation sprint - not this design pass)

- Decision D-4 approved and the read-only enumerators added; D-5, D-6, D-7 resolved or explicitly deferred.
- One projection service exists; no page, component, `reportService` or `dashboardService` reads a store directly.
- All four projection models are flat, `readonly`, copy-returning, and embed no operational entity.
- Every existing per-module summary function is reused, not recomputed - verified by inspection, not assumed.
- Actor scope is enforced in the layer; a Branch Officer cannot obtain another branch's rows by any filter combination.
- Every operation applies an explicit deterministic sort with a stable tiebreaker.
- No writes, no persistence, no cache, no business rules, no formatting, no filtering.
- No operational module imports the projection layer.
- `/reos/reports` and `/reos/dashboard` show real operational data **verified live in a browser** - the only acceptable proof, per PROJECT_STATE.md's standing caveat.
- TypeScript compiles; production build succeeds; changed code confirmed present in the bundle.

## Open Business Decisions

No **new** business decisions arise from this design. It is bounded by decisions already recorded in REPORTING_ARCHITECTURE.md:

- **D-4** - blocks implementation of this layer outright (read-only enumerators in two files outside Reporting).
- **D-5** - no audit projection model until an audit trail exists.
- **D-6** - duration and officer-attributed fields deferred.
- **D-7** - branch identity limited to branches that have assignments.

One engineering recommendation needs a decision only if the sprint disagrees with it: **9.1, asynchronous projection operations from day one.** It is an engineering call with existing precedent (`userService`), not a business decision, so it is recorded here rather than escalated - but it should be settled before the first line of the layer is written, because it is the one choice that is expensive to reverse.

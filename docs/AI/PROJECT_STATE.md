# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

None open. Sprint 17 - Shared Batch Import Modernization - closed. REOS is now in **v1.0 Production Readiness**: **all five phases are complete** (Authentication; Operational Persistence; Audit Trail; Production Hardening first pass; a full end-to-end regression pass across all of it together) - see below and CURRENT_SPRINT.md. Two honestly-recorded, non-blocking open items carry forward (TECH_DEBT.md): `USER_CREATED` audit intermittency, and no automated regression suite. Preceding out-of-sprint work: the **Operational Dataset layer** (2026-08-08, DEC-017), built above **Import Intelligence** (2026-08-08, DEC-016), preceded by the **Liquidity Management module** (2026-08-08, DEC-015).

Sprint 16 (Reporting Architecture) delivered Reporting and the Operations Dashboard end to end but was never formally closed - see "Carried Forward" below.

## Current Module

None active. Most recently: Phase 5 full end-to-end regression pass (verification only, no source files modified) - see below.

## Current Milestone

**Sprint 17 M1 (Row Structure Detection), M2 (Column Contract), M3 (Bank Field) and M4 (Transaction Date): COMPLETE.**

M4 (2026-08-05) captures the export's `Date` column (`DD/MM/YYYY`) into `Beneficiary.transactionDate`, converted to ISO so the existing date-sort and date-age logic in `reportService`/`reportingProjectionService`/`dashboardService` - which already assumed ISO - work correctly for the first time. Not required for row validity (DEC-011); an absent or unparseable date leaves `transactionDate: ""`, exactly as every row had before. Verified with a real in-memory `.xlsx` buffer run through the actual service via Vite's module loader, not a hand-built replica. See CURRENT_SPRINT.md for full detail.

M1 located the header row instead of assuming row 1, and skipped leading blank rows, repeated page headers and blank data rows, reporting issues against true spreadsheet row numbers.

M2 added alias-based column resolution (one path for both the legacy and Direct Remit contracts), structural transaction-row detection (DEC-013 - a row is a transaction only if it carries a reference, which is what removes the `TOTAL` subtotal rows), and tolerant amount parsing.

M3 unified bank-field parsing (DEC-012): `excelValidationService.ts` now calls `sharedBatchService.parseBankField` - the same function the CSV path already used - instead of requiring two separate `Bank Name` / `Account Number` columns. `parseBankField` was extended to three input shapes: the labelled `"BANK OF KHARTOUM (Acc No: 4734114)"` form, a bare account number with a caller-supplied fallback bank name (for rows where the export displaces the bank name into `Dest Country`), and the pre-existing trailing-token form. Bank names are returned exactly as received, with no normalization (DEC-010) - verified against nine real spellings of one bank across two scripts.

Measured on the real Direct Remit export across all three milestones: records **69 -> 66 -> 63** (exactly the real transaction count), missing-column errors **6 -> 2 -> 0**, valid records **0 -> 0 -> 63/63**, `readyForAssignment` **false -> true**. The parsed amount total (226,553,323) agrees with the file's own `TOTAL` rows (226,553,322.89) to source rounding. A legacy-format file validates 2/2 valid throughout, unaffected at every milestone.

**The real file now imports successfully end to end at the validation layer, including transaction dates.** M5 (Stabilization & Closure) - a runtime verification of the real file through the application UI, not just the validation service in isolation - is not started.

Sprint 16's milestones M1-M3 and M4.1-M4.5, and Sprint 17's M1-M2, are all committed - see git commit `594e5e9`.

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

## Production Readiness Phase 5: Full End-to-End Regression (2026-08-15)

Verified live, one continuous session, everything Phases 1-4 built working together (not just individually): Operations Manager funds a payout account and assigns a batch; Branch Officer processes it against that real account with a real uploaded proof, completes, finalizes; Operations Manager, in a brand-new session, opens the Operations Dashboard, Reports (default Shared Batches report), and the Liquidity Dashboard and confirms each renders real data matching what was just created. This is the first time since Phase 2's three migrations (each of which touched `reportingProjectionService.ts`) that Reports/Dashboards were actually loaded in a browser rather than just type-checked and built. 8/8 assertions, zero console errors. No source files were modified in this pass - verification only. **REOS v1.0 Production Readiness Phases 1-5 are now complete** under the scope this initiative asked for. Two honestly-recorded, non-blocking gaps carry forward: `USER_CREATED` audit intermittency (Phase 3) and the absence of an automated, CI-integrated regression suite (every verification to date, including this one, is a hand-written script run once and deleted) - see TECH_DEBT.md. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 4: Production Hardening, First Pass (2026-08-13)

Scoped to the concrete, already-documented gaps TECH_DEBT.md had accumulated, not speculative new hardening work. **Full REOS-internal lint cleanup**: every `react-hooks/set-state-in-effect` finding (`OperationsDashboardPage.tsx`, `ReportsPage.tsx`, `ProofDownloadPage.tsx`) resolved using the same "defer every `setState` path past an `await`" restructuring proven three times earlier this session; two genuinely dead variables removed from `excelValidationService.ts`; `layout/Sidebar.tsx`'s two `react-refresh/only-export-components` errors (pre-existing since Sprint 10) fixed by extracting its data/function into a new `sidebarConfig.ts`, leaving the file exporting only the component. `npm run lint` now returns **zero findings inside REOS** - the five remaining project-wide are the deliberate, documented `no-irregular-whitespace` exception and three findings in legacy modules explicitly out of REOS scope. **Real cross-branch RLS negative-path verification**: seeded PORT_SUDAN operational data directly, bootstrapped a KASSALA-scoped Branch Officer, and confirmed via direct API calls (no UI) that the officer cannot read or write any of it - 9/9 assertions, with a positive control ruling out a false-positive "everything is unreadable" result. Closes an item open since Milestone 1. **Deliberately not attempted, with rationale**: bundle-size code-splitting and a speculative page-by-page error-boundary audit - both recorded as legitimate future candidates in TECH_DEBT.md/ROADMAP.md, not silently dropped. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 3: Audit Trail (2026-08-13, DEC-022)

A new, append-only `audit_events` table now records every real business action across REOS (Shared Batch upload/confirm/assign/reassign, Branch Processing start/hold/resume/complete/return/finalize, proof upload/download/mark-downloaded, Liquidity account/funding writes, user create/update), closing DECISIONS.md D-5, which REPORTING_ARCHITECTURE.md Section 5.3 found permanently blocking the entire Audit report category ("REOS creates audit records but stores none of them"). One unified `AuditEvent` vocabulary (`types/audit.ts`) replaces three previously-separate, previously-discarded shapes. `auditService.recordAuditEvent` is called directly from the service function performing each action - never from a page - with the actor's role resolved server-side via the existing `current_user_role()` RPC rather than trusted from client input. RLS: SELECT is Operations-Manager-only; INSERT is open to any authenticated role but constrained to the caller's own `auth.uid()`. A real defect was found and fixed during implementation: `BATCH_CONFIRMED`'s audit call initially shared a guard with an unrelated Import Intelligence timing precondition, silently skipping both records when confirmed quickly - fixed with its own narrower guard, which also surfaced (but did not fix, being out of scope) a pre-existing Import Intelligence gap. Canonical spec: **docs/AI/AUDIT_TRAIL.md**. Verified live: 17 of 18 audited actions confirmed recorded with correct attribution across a full real workflow, plus a confirmed RLS negative check (Branch Officer cannot read `audit_events`). **One honestly-recorded, unresolved gap**: `USER_CREATED` events intermittently fail to persist despite no reported error; root cause not fully isolated after investigation, a retry mitigation added but not proven fully effective. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 2, Milestone 3: Liquidity Management Persistence (2026-08-13, DEC-021)

`liquidityStore.ts` is migrated from in-memory Maps to three Supabase tables (`payout_accounts`, `funding_events`, `funding_entries`). Every export keeps its name and becomes `async`; `liquidityService.ts`'s business logic is otherwise unchanged. `FundingEntry` (no id of its own in the type) is reconstructed at read time from child `funding_entries` rows, the same pattern Milestone 1 established for Assignment. A real RLS gap was found by browser verification, not code review: `savePayoutAccount`'s upsert requires INSERT-policy satisfaction even on an update-only call, so an Operations-Manager-only INSERT policy broke `deductForTransaction` (a genuine Branch Officer write during transaction completion) - fixed by widening INSERT to Branch Officer scoped to their own branch, the same grain Milestone 2 already accepted for `branch_processing_queue_items`. `PayoutAccountManager.tsx`/`FundingRecorder.tsx` restructured from synchronous render-time reads to `useEffect`-driven state, with the siblings' shared `refreshSignal` now passed down as an explicit prop rather than only forcing a parent re-render. Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**. **This closes Phase 2 - every live REOS operational store is now Supabase-backed.** Verified live across three sessions: 8/8 assertions, zero console errors - a brand-new Operations Manager session showed a balance correctly deducted by a brand-new Branch Officer session's completed transaction, the definitive persistence proof for both the funding and deduction write paths. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 2, Milestone 2: Branch Processing Queue and Proof Storage Persistence (2026-08-09, DEC-020)

`branchProcessingQueueService.ts` is migrated from in-memory Maps/arrays to three Supabase tables (`branch_processing_queue_items`, `proofs`, `branch_processing_status`) plus a private Storage bucket (`proof-of-payment`). Every export keeps its name and becomes `async`, except `addProofToBranchProcessingQueueItem`, whose signature changed from `(itemId, proof)` to `(itemId, file, uploadedByUserId)` - a real Storage upload needs the file's bytes, which the old pre-built-object shape could not carry. `proofOfPaymentService.ts`'s `createProofOfPayment` (blob-URL only) is replaced by `uploadProofOfPayment` (real upload) plus signed-URL helpers; every `previewUrl` is now generated fresh at read time, never stored. `TransactionProcessingPage.tsx` - confirmed genuinely unreachable (only self-referential navigation ever linked to it) and carrying a second, un-migrated implementation of the same workflow - was deleted along with its exclusively-used dependents, rather than patched to also integrate with Storage. Combining queue-state and proof persistence into one milestone was a deliberate, documented exception to the "one store, one migration" rule (DEC-020): they are facets of one entity, and splitting them would have left a "COMPLETED with no visible proof after reload" state. Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**. Only Liquidity Management remains in-memory - the last Phase 2 milestone. Verified live across three sessions in one continuous flow plus two independent fresh sessions: 16/16 assertions, zero console errors - including a real uploaded proof image loading via a genuine Supabase Storage signed URL, and a brand-new Branch Officer session (zero uploads in it) showing the same transaction COMPLETED at 100%. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 2, Milestone 1: Shared Batch/Beneficiary/Assignment Persistence (2026-08-09, DEC-019)

`sharedBatchStore.ts` is migrated from an in-memory `Map` to three Supabase tables (`shared_batches`, `beneficiaries`, `assignments`), every export keeping its exact name, now `async`. `Assignment.assignedTransactions`/`manualReviewTransactions`/`invalidTransactions` are deliberately not stored as a second copy - confirmed by inspection that `processingStatusId` is set once and never mutated, they are reconstructed at read time from `beneficiaries`, a view rather than data that could drift. A second `SECURITY DEFINER` RLS helper, `current_user_branch_id()` (same pattern as DEC-018's `current_user_role()`), scopes a Branch Officer's access to their own branch. Every real consumer - `branchProcessingQueueService.ts`, `proofDownloadService.ts`, `reportingProjectionService.ts` (already async-first by design, REPORTING_PROJECTION_LAYER.md Section 9.1 - paid off exactly as intended), and five pages/components - now awaits the store; three pages moved from synchronous render-time reads to `useEffect`-driven fetches. Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**. Branch Processing's own queue state, Proof Management, and Liquidity Management remain in-memory, unaffected - later, separately-scoped Phase 2 milestones. Verified live across two separate browser contexts: 9/9 assertions, zero console errors - the second context, with nothing uploaded in it, showed the real assigned transaction, the definitive persistence proof. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Production Readiness Phase 1: Authentication & Authorization (2026-08-08, DEC-018)

Real Supabase Auth replaces the development bypass (`localStorage.setItem("reos-auth", "true")`, any credentials accepted). A new `profiles` table carries role/branch/status, gated by RLS via a `SECURITY DEFINER` helper avoiding the classic self-recursion pitfall; a real `admin-create-user` Edge Function provisions credentials (client JS cannot safely do this), with a self-closing "first user becomes admin" bootstrap rule; real per-route and per-branch RBAC (`ReosSessionGate`/`RoleGate`/`BranchGate`) replaces the single identical gate every route previously shared; every one of 11 hardcoded actor/role literals across REOS now carries a real session value; Import Intelligence's RLS is tightened from permissive-to-`anon` to authenticated-and-role-checked. Canonical spec: **docs/AI/AUTHENTICATION.md**. Verified live in a browser across all three real roles (Operations Manager, Direct Remit Officer, Branch Officer created through the real UI, not seeded): 18/18 assertions, zero console errors - including catching and fixing three real defects (Edge Function CORS, a stale-session redirect loop after password change, and relative navigation breaking under the new nested route tree) that only real browser verification could have found. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Operational Dataset (2026-08-08, DEC-017)

The read layer above Import Intelligence: a redesigned Data Coverage grid (Year -> Month -> Source, four honest statuses: Missing/Imported/Incomplete/Duplicate), a redesigned Import History (Coverage Impact, Validation Outcome, primary/secondary filters, per-batch beneficiary drill-down), a new Duplicate Management page (explains why imports were flagged, read-only by design), and a new Historical Performance page (Month-over-Month/Year-over-Year growth, source comparison). Canonical spec: **docs/AI/IMPORT_INTELLIGENCE.md Section 13**. Scoped by an explicit decision (DEC-017) after a genuine conflict was raised: the prompting instruction described this layer as the read source for Branch Processing and Liquidity Management too, but neither module's live state was ever in Import Intelligence's scope, and DEC-016 already deferred persisting the live workflow as separate future work. Resolved narrowly - **Branch Processing and Liquidity Management keep their own in-memory state, unaffected.** Verified live in a browser: 22/22 assertions, zero console errors, including a genuine end-to-end Assignment regression check. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Import Intelligence (2026-08-08, DEC-016)

REOS's first genuinely persistent data: a durable Supabase ledger (`import_batches`, `import_beneficiaries` in the real `remit-connect` project) recording every Shared Batch import, its SHA-256 file fingerprint, its derived Reporting Period, and duplicate detection (Replace/Merge/Cancel) against prior imports. New `ImportIntelligencePage.tsx` (route `/reos/import-intelligence`) shows a Data Coverage grid (source x reporting period) and full Import History, both read live from Supabase. Canonical spec: **docs/AI/IMPORT_INTELLIGENCE.md**. Approved narrowly (DEC-016, exercising DEC-004's "unless explicitly approved" clause) after two genuine blockers were raised and resolved by explicit user decision: persistence approved now (Supabase), and multi-source ingestion scoped to Direct Remit only for now (Western Union/RIA/MoneyGram/TerraPay appear in Data Coverage as permanently uncovered, honestly, not as placeholders). **Critical boundary: this is additive and non-blocking** - the live operational workflow (`sharedBatchStore.ts` and everything downstream: Assignment, Branch Processing, Proof Management, Liquidity Management) is completely unchanged and remains in-memory; a Supabase failure never blocks the existing upload flow, only surfaces a dismissible warning. Verified live across **three separate browser contexts** (not just reloads within one session) - the second context, with zero uploads performed in it, displayed data persisted by the first context's session, proving real cross-session persistence, not just a successful form submission. `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Liquidity Management Module (2026-08-08, DEC-015)

Full design and implementation of REOS's Operational Liquidity Management module - branch payout accounts, manual funding with full history, live balance consumption wired into Branch Processing's completion step, a dedicated dashboard, and six new reports. Canonical spec: **docs/AI/LIQUIDITY_MANAGEMENT.md**. Before any code, the existing Branch Liquidity/Treasury/Funding system outside REOS (`src/pages/branches`, `treasury`, `funding`) was inspected in full and deliberately not reused - different grain (aggregate vs. per-account), different process (approval-gated vs. manual), different data reality (mocked vs. live) - see the spec's Section 3. REOS's own pre-existing, unused `types/branch.ts` was reused, backed by a new minimal registry, partially closing REPORTING_ARCHITECTURE.md Decision D-7. Verified live in a browser: 16/16 assertions, zero console errors, including a real cross-component sync defect found and fixed (see CURRENT_SPRINT.md for detail). `tsc`/`build`/`eslint` all clean. See CURRENT_SPRINT.md for full detail.

## Sprint 17 Complete - Real Browser Verification (M5, 2026-08-06)

Sprint 17 M5 (Stabilization & Closure) is done. For the first time this sprint, the full workflow was driven in an actual browser (Playwright/Chromium, installed for the session only, not a persisted dependency) against a synthetic file matching the real Direct Remit contract: Upload -> Confirm -> Branch Assignment (real batch, real branch selection) -> Branch Processing (real queue, real proof upload, real completion) -> Finalize -> Reports -> Dashboard. 11/11 assertions passed, zero console errors. One investigation traced a data value through every layer (queue -> assignment -> projection -> report -> dashboard) after an apparent discrepancy, and confirmed the app was correct throughout - both apparent failures were bugs in the verification script itself (a `page.goto` resetting the in-memory store instead of using real in-app navigation, and a case-sensitive assertion against CSS-uppercased text), not in REOS. `npx eslint` was run project-wide for the first time since Sprint 15; every finding is pre-existing and confirmed via `git diff` untouched by any change in this session. See CURRENT_SPRINT.md, "M5 - Stabilization & Closure" for full detail. **Sprint 17 is now fully complete, M1 through M5.**

## Branch Processing Timestamps & Actor Attribution Closed (Decision D-6, 2026-08-05)

`BranchProcessingQueueItem` now records `startedAt`/`completedAt`/`completedByUserId`/`returnedAt`/`returnedByUserId`; `proofDownloadService` no longer hardcodes them to `null`; the reporting projection layer computes `processingMinutes`/`averageProcessingMinutes` (the exact fields REPORTING_PROJECTION_LAYER.md Section 4.6 pre-designed for this); and the dashboard's "Average Processing Time" stat and per-branch health now use real data instead of a permanent "No data"/`YELLOW`. Purely additive in-memory state - no persistence, no new dependency. Verified by an 11-assertion functional smoke test through the real, largely-unmodified chain. See CURRENT_SPRINT.md for full detail. New report *definitions* (Processing Time, Officer Performance, etc.) that could now be built on this data are deliberately deferred as separate scope.

## Shared Batch Assignment Workflow Completed (2026-08-03)

`BranchAssignmentPage.tsx` now displays real, uploaded, `UNASSIGNED` Shared Batches automatically and assigns them with their real beneficiaries, closing the gap the dependency analysis identified: beneficiaries were never persisted beyond `SharedBatchUploadPage.tsx`'s own component state. Fixed with two additive `sharedBatchStore.ts` accessors (`saveBeneficiaries`/`getBeneficiaries`, same Map-and-copy pattern as the existing `SharedBatch`/`Assignment` accessors) plus wiring in `SharedBatchUploadPage.tsx`, `BranchAssignmentPage.tsx`, and a trim of `BranchAssignmentForm.tsx` down to branch selection (+ reassignment reason). No service's existing logic changed. See CURRENT_SPRINT.md, "Shared Batch Assignment Workflow Completed" for full detail, including a 10-assertion functional smoke test run against the real, unmodified `branchAssignmentService.ts`/`branchProcessingQueueService.ts` through Vite's own module loader.

## Out-of-Sprint Hotfix (2026-08-03)

`branchAssignmentService.assignSharedBatchToBranch`'s role check was flipped from Direct Remit Officer to **Operations Manager**, on explicit instruction, after a runtime verification found the live behavior did not match the actor-role assignment specified for the fix. The only live call site (`SharedBatchUploadPage.tsx`) was updated to match. `reassignSharedBatch` (Operations Manager) is unchanged. **This contradicts DEC-006 and BUSINESS_RULES.md as currently written** - neither has been updated to reflect it; see CURRENT_SPRINT.md, "Out-of-Sprint Hotfix" for full detail and the open documentation gap. Not part of Sprint 17.

## Current Git Tag

v0.13.2-processing-completion (latest tag). Sprint 15 is committed (`9ddaab3`); Sprint 16 in full plus Sprint 17 M1-M2 are committed as `594e5e9`. The working tree now carries Sprint 17 M3's two source changes (`sharedBatchService.ts`, `excelValidationService.ts`), uncommitted.

## Build Status

Re-run after Production Readiness Phase 5, full end-to-end regression (2026-08-15): **clean, unchanged from Phase 4** (verification only, no source files modified).
- `npx tsc --noEmit` - clean, no errors.
- `npm run build` - succeeded, 202 modules.
- `npx eslint src` project-wide - zero findings inside REOS.

Preceding, after Production Readiness Phase 4, first pass (2026-08-13): **clean.**
- `npx tsc --noEmit` - clean, no errors.
- `npm run build` - succeeded, 202 modules, 1,051.53 kB.
- `npx eslint src` project-wide - **zero findings inside REOS** (five remaining: one deliberate documented exception, three in out-of-scope legacy modules).

Preceding, after Production Readiness Phase 3: Audit Trail (2026-08-13): **clean.**
- `npx tsc --noEmit` - clean, no errors.
- `npm run build` - succeeded, 201 modules, 1,051.43 kB.
- `npx eslint` on every new/touched file - clean except one already-documented, pre-existing, untouched finding in `ProofDownloadPage.tsx`.

Preceding, after Production Readiness Phase 2 Milestone 3: Liquidity Management Persistence (2026-08-13): **clean.**
- `npx tsc --noEmit` - clean, no errors.
- `npm run build` - succeeded, 200 modules, 1,046.76 kB.
- `npx eslint` on every new/touched file - clean, zero errors, zero warnings.

Preceding, after Production Readiness Phase 2 Milestone 2: Branch Processing Queue and Proof Storage Persistence (2026-08-09): **clean.**
- `npx tsc --noEmit` - clean, no errors.
- `npm run build` - succeeded, 200 modules, 1,044.15 kB.
- `npx eslint src` on every new/touched file - clean; one new `react-hooks/set-state-in-effect` finding in `BranchProcessingQueue.tsx`'s new payout-eligibility effect was fixed directly in this milestone (not left as debt).

Preceding, after Production Readiness Phase 2 Milestone 1: Shared Batch/Beneficiary/Assignment Persistence (2026-08-09): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 203 modules, 1,045.99 kB.
- `npx eslint` on every new/touched file - clean except the already-documented findings from prior milestones (confirmed via `git blame`) and one new instance of the already-accepted `set-state-in-effect` class (`ProofDownloadPage.tsx`'s new data-fetching effect).

Preceding, after Production Readiness Phase 1: Authentication & Authorization (2026-08-08): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors, throughout every stage of this large a change.
- `npm run build` - succeeded, 203 modules (+5), 1,040.20 kB.
- `npx eslint` on every new/touched file - clean except three already-documented `set-state-in-effect` findings and the pre-existing `BranchProcessingQueue.tsx` findings, all confirmed via `git blame` to predate this session.

Preceding, after the Operational Dataset layer (2026-08-08): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 198 modules (+7), 1,032.23 kB.
- `npx eslint` on every new/touched file - clean except the two already-documented, untouched `Sidebar.tsx` findings (confirmed via `git diff` the Sidebar edit is additive only).

Preceding, after Import Intelligence (2026-08-08): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 191 modules (+47, `@supabase/supabase-js`'s client entering the bundle graph for the first time), 1,008.72 kB.
- `npx eslint` on every new/touched file - clean except the two already-documented, untouched `Sidebar.tsx` findings.

Preceding, after the Liquidity Management module (2026-08-08): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 144 modules (+8), JS 792.11 kB.
- `npx eslint` on every new/touched file - clean except pre-existing findings and one new instance of an already-recorded warning class (TECH_DEBT.md, "Linting").

Preceding, after Branch Processing Timestamps & Actor Attribution (D-6, 2026-08-05): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 136 modules, JS 762.02 kB.
- `npx eslint` on every touched file - clean.

Preceding, after the Shared Batch Assignment Workflow completion (2026-08-03): **clean.**
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 136 modules, JS 760.46 kB.

Preceding, after the Sprint 17 Stabilization Reporting Compilation Restore (2026-08-03): **clean.** `types/report.ts` had carried a stray, uncommitted, out-of-scope edit (Sprint 17 M1-M3 never permitted `types/**`) that reverted part of its type contract to a pre-Sprint-16-M4.4 shape, while `reportService.ts` / `ReportsPage.tsx` / `ReportFilters.tsx` remained on the committed (`594e5e9`) contract - the mismatch was the sole cause of both `tsc` and `npm run build` failing. Fixed by reverting `types/report.ts` alone to its committed content; the three consumer files needed no change. See CURRENT_SPRINT.md, "Sprint 17 Stabilization - Reporting Compilation Restore" for root cause and verification detail.

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded, 136 modules, CSS 21.70 kB, JS 760.89 kB.

Preceding this, the Assignment Authorization hotfix (2026-08-03) had both fail on the `types/report.ts` issue above, unrelated to that hotfix's own two files (`branchAssignmentService.ts`, `SharedBatchUploadPage.tsx`), which produced no diagnostics of their own then or now.

Last known-clean build before that, after Sprint 17 M3:
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded. **136 modules (+1)**, CSS 21.70 kB, JS 760.90 kB. The module count rose because `excelValidationService.ts` now imports `sharedBatchService.ts` for the first time, pulling it into the bundle's module graph.

**M1, M2 and M3 were each verified by running the real production file through the shipped validation service**, transpiled with the project's own TypeScript and executed in Node against the actual `.xlsx` - not by a passing build, and not against a hand-written replica of the logic. A legacy-format fixture was run through the same harness as a regression check at each milestone.

M2's amount parsing was cross-checked against the source system's own subtotals rather than merely confirmed to parse without error: parsed sum 226,553,323 vs the file's `TOTAL` rows at 226,553,322.89, agreeing to source rounding. M3's bank-field parsing was checked by direct inspection of individual rows from both layouts, not just the aggregate pass count - a Layout A row and a Layout B row (with its Dest Country fallback, Arabic script preserved) were each confirmed by name.

**Verification.** M4.4 and M4.5 were both verified by **running the application**, not by inspecting the bundle: the whole Shared Batch -> Assignment -> Branch Processing -> Proof Management -> Reporting/Dashboard chain was driven in a browser with a real uploaded batch and real proof images, and every report, KPI, filter and empty state was checked against live data. Full detail in CURRENT_SPRINT.md, "Runtime Verification (M4.4)" and "(M4.5)".

That verification earned its keep in M4.4: it found a duplicate-React-key defect in `ReportsPage.getRowKey` that made every row of the processing and proof reports share one key, risking dropped or duplicated rows. `tsc` and `npm run build` were both clean with that bug present. It was fixed and re-verified in the same session. M4.5's run found no defect.

STANDING CAVEAT: a passing build alone does not prove changed code ships, is reachable by a real user, or renders correctly. **Five separate incidents now** - Sprint 14's route-mounting gap, Sprint 15 M1's navigation gap, Sprint 15 M1.75's hydration defect, Sprint 16 M1's finding that Reporting had no data source, and Sprint 16 M4.4's duplicate-React-key defect - were all invisible to `tsc`/`build`. Four of the five were found only by driving the app in a real browser; the fifth by tracing the data path by hand.

Corollary learned in M4.1-M4.3: a green build also does not prove code **is in the bundle at all**. Uncalled exports are tree-shaken, and a module nothing imports never enters the module graph. Infrastructure built ahead of its consumer is legitimately absent from `dist/` until something imports it - check, don't assume, and don't mistake that absence for the Sprint 14 defect class.

## Last Completed Milestone

Production Readiness Phase 5: Full End-to-End Regression (2026-08-15) - out-of-sprint. **REOS v1.0 Production Readiness (Phases 1-5) is now complete.** See above.

Preceding: Production Readiness Phase 4: Production Hardening, first pass (2026-08-13) - out-of-sprint. See above.

Preceding: Production Readiness Phase 3: Audit Trail (2026-08-13, DEC-022) - out-of-sprint. See above.

Preceding: Production Readiness Phase 2, Milestone 3: Liquidity Management Persistence (2026-08-13, DEC-021) - out-of-sprint. **Phase 2 is now fully complete.** See above.

Preceding: Production Readiness Phase 2, Milestone 2: Branch Processing Queue and Proof Storage Persistence (2026-08-09, DEC-020) - out-of-sprint. See above.

Preceding: Production Readiness Phase 2, Milestone 1: Shared Batch/Beneficiary/Assignment Persistence (2026-08-09, DEC-019) - out-of-sprint. See above.

Preceding: Production Readiness Phase 1: Authentication & Authorization (2026-08-08, DEC-018) - out-of-sprint. See above.

Preceding: Operational Dataset layer (2026-08-08, DEC-017) - out-of-sprint. See above.

Preceding: Import Intelligence (2026-08-08, DEC-016) - out-of-sprint. See above.

Preceding: Liquidity Management module (2026-08-08, DEC-015) - out-of-sprint. See above.

Preceding: Sprint 17 M5 - Stabilization & Closure (real browser verification, 2026-08-06). **Sprint 17 is closed, M1 through M5.**

Preceding, out-of-sprint (2026-08-05): Branch Processing Timestamps & Actor Attribution (Decision D-6).

Preceding: Sprint 17 M4 - Transaction Date (DEC-011); M3 (Bank Field, DEC-012, DEC-010); M2 (Column Contract, DEC-013); M1 (Row Structure Detection).

Preceding: Sprint 16 M4.5 (Operations Dashboard Integration); M4.4 (Reports UI Integration); M4.3 (Report Service); M4.2 (Reporting Projection Layer); M4.1 (Read-Only Enumerators, DEC-007); M3, M2, M1 (design); Sprint 15 Stabilization & Closure.

Also completed out-of-sprint (2026-08-03 to 2026-08-05, not part of Sprint 17): Shared Batch Assignment authorization hotfix (DEC-014), a Reporting compilation restore, and the Shared Batch Assignment workflow completion (real batch/beneficiary wiring into `BranchAssignmentPage.tsx`) - see CURRENT_SPRINT.md for each.

## Next Planned Milestone

No numbered sprint is currently open. **REOS v1.0 Production Readiness (Phases 1-5) is complete.** Remaining candidates are follow-on work, none blocked by a business decision except where noted:

- RESOLVED (2026-08-09, DEC-019): **Production Readiness Phase 2, Milestone 1** - `sharedBatchStore.ts` (Shared Batch, Beneficiary, Assignment) is now Supabase-backed. See above.
- RESOLVED (2026-08-09, DEC-020): **Production Readiness Phase 2, Milestone 2** - `branchProcessingQueueService.ts` (queue state, branch lock) and proof-of-payment files (real Supabase Storage) are now persisted. See above.
- RESOLVED (2026-08-13, DEC-021): **Production Readiness Phase 2, Milestone 3** - `liquidityStore.ts` (`PayoutAccount`, `FundingEvent`) is now persisted. **Phase 2 is complete.** See above.
- RESOLVED (2026-08-13, DEC-022): **Production Readiness Phase 3** - a real, persisted `audit_events` table closes D-5. One known gap (`USER_CREATED` intermittent persistence) recorded in TECH_DEBT.md, not blocking. See above.
- RESOLVED (2026-08-13): **`npm run lint` now passes cleanly for every REOS-internal file** - closes the previously-open "dedicated lint-cleanup sprint" item below. See Production Readiness Phase 4 above.
- RESOLVED (2026-08-13): **RLS branch-scoping negative-path verification** - confirmed live via direct API calls, not just UI absence. See Production Readiness Phase 4 above.
- RESOLVED (2026-08-15): **Production Readiness Phase 5** - a full end-to-end regression pass confirmed every phase works together, not just individually. See above.
- **Further hardening, beyond this initiative's scope**: bundle-size code-splitting (`vite build`'s "chunk larger than 500 kB" warning, deliberately deferred); a targeted error-boundary/loading-state review if a specific gap is ever identified (none was); an automated, CI-integrated regression suite (the single largest remaining gap - every verification to date is a hand-written, ephemeral script).
- RESOLVED (2026-08-08, DEC-018): real authentication - Import Intelligence's RLS is no longer permissive to `anon`; see AUTHENTICATION.md.
- **Multi-source ingestion** (Western Union, RIA, MoneyGram, TerraPay) - explicitly out of scope for Import Intelligence (confirmed by user decision, 2026-08-08); no parser exists for any of their file formats.
- **New Performance report definitions** (`PROCESSING_TIME`, `OFFICER_PERFORMANCE`'s speed component) now that D-6 supplies the underlying data - deliberately not built in the same pass as the data-availability fix.
- **Reconcile the legacy Treasury/Branch Liquidity/Funding system with Liquidity Management** - a genuine open question, not something this work could resolve unilaterally (LIQUIDITY_MANAGEMENT.md Section 14).

Carried forward from Sprint 16 - none blocking Sprint 17:

- **Remove out-of-scope financial metrics (D-9)** - the dashboard still renders USD Value, Revenue and USD Processed columns, now permanently `$0.00` because the projection layer carries no aggregate amounts by design. Removing the columns needs component changes. This is now the most visible open item.
- **Exports (D-3)** - the Excel/PDF/Print buttons remain disabled placeholders.
- RESOLVED (2026-08-13, DEC-022): **Audit reports (D-5)'s underlying blocker** - a real, persisted audit trail now exists (AUDIT_TRAIL.md). The report *definitions* themselves (Assignment History, Lifecycle History, Processing History, Proof Download History, User Activity) are still not built - separate, downstream Reporting work.
- **Executive and Branch dashboards (D-2)** - designed in REPORTING_ARCHITECTURE.md Section 10, not built.
- **Amend REPORTING_ARCHITECTURE.md Section 10.1** - it states that `reportService` and `dashboardService` never call each other; M4.5's approved scope required exactly that. See the M4.5 architectural note in CURRENT_SPRINT.md.
- **Sprint 16 closure** - Stabilization & Closure has not been run for this sprint: `npm run lint` has not been re-run since Sprint 15, and DEFINITION_OF_DONE.md's checklist is not yet complete.

Seven decisions remain open overall: D-1, D-2, D-3, D-7, D-8, D-9, plus D-6's remaining half (new report definitions, the data itself now exists). D-5's underlying persistence blocker is resolved (2026-08-13, DEC-022); the Audit report definitions it unblocks are not yet built - see ROADMAP.md.

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md, DEC-004). **Exceptions:** the Import Intelligence ledger (DEC-016); Shared Batch/Beneficiary/Assignment (DEC-019, Phase 2 Milestone 1); Branch Processing queue state and proof-of-payment Storage (DEC-020, Phase 2 Milestone 2); Liquidity Management (DEC-021, Phase 2 Milestone 3); the audit trail (DEC-022, Phase 3) - see ARCHITECTURE.md. **Phase 2 is complete - no REOS operational store remains in-memory-only.**
- REOS did not own application authentication (ARCHITECTURE.md). **Exception (DEC-018, 2026-08-08):** REOS now owns its own Supabase Auth integration - see ARCHITECTURE.md and AUTHENTICATION.md.
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No financial reporting - no revenue, USD processed, FX margin, commission, or forecasting (REPORTING_STANDARDS.md).
- No frozen business rule may be changed (BUSINESS_RULES.md).
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).
- Exactly one owner for Assignment creation/management (DECISIONS.md DEC-006).
- Reports must never become the system of record, must not duplicate operational data, and must not introduce persistence (REPORTING_STANDARDS.md).

## Last Updated

2026-08-15

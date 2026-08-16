# CURRENT SPRINT

Version: 27.0

Status: SPRINT 17 COMPLETE (MILESTONES 1-5). NO NUMBERED SPRINT CURRENTLY OPEN. REOS is now in **v1.0 Production Readiness**, a five-phase initiative (Authentication -> Persistence -> Audit Trail -> Hardening -> Testing/Verification). **Phases 1-4 are complete** (Authentication DEC-018; Operational Persistence DEC-019/020/021; Audit Trail DEC-022; Production Hardening first pass - full lint cleanup, RLS negative-path verification). **Phase 5 (Testing, Regression, Documentation) - a full end-to-end regression pass is complete**: the entire chain (Upload -> Confirm -> Assign -> Process -> Proof Upload/Complete -> Finalize -> Proof Download -> Reports -> Operations Dashboard -> Liquidity Dashboard) was driven live in one continuous flow after every Phase 1-4 change, confirming `reportingProjectionService.ts` (touched by every Phase 2 migration) still renders correct real data end to end - 8/8 assertions, zero console errors. The one remaining, explicitly out-of-scope-for-this-session gap: no automated, CI-integrated regression suite exists - every verification this project has ever run, including this one, is a hand-written, ephemeral script, deleted after use. See the dedicated section below and docs/AI/AUDIT_TRAIL.md / docs/AI/OPERATIONAL_PERSISTENCE.md / docs/AI/AUTHENTICATION.md. Preceding: the Operational Dataset layer (IMPORT_INTELLIGENCE.md Section 13, DEC-017), Import Intelligence (IMPORT_INTELLIGENCE.md, DEC-016), the Liquidity Management module (LIQUIDITY_MANAGEMENT.md, DEC-015), Shared Batch Assignment authorization/workflow completion, a Reporting compilation restore, and Decision D-6 (Branch Processing timestamps) - see the dedicated sections below.

Last Updated: 2026-08-15

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

Sprint 16's log, including M4.5, is preserved in git through commit `594e5e9`.

## REOS v1.0 Production Readiness - Phase 5: Full End-to-End Regression (out-of-sprint, 2026-08-15)

Not part of any numbered sprint. The last of five Production Readiness phases. Every phase (1-4) was individually verified live in a browser or via direct API calls at the time it was built; this pass verifies them **together**, in one continuous session, after all of it - something no individual milestone's own verification could prove, since each was necessarily scoped to its own slice.

**What was verified, one continuous flow, real browser:**
1. Operations Manager: created and funded a payout account (Phase 2 Milestone 3), uploaded/confirmed/assigned a real batch (Phase 2 Milestone 1, with Phase 3 audit events recording each step).
2. Branch Officer: started the transaction against the real payout account, uploaded a real proof image to Supabase Storage (Phase 2 Milestone 2), completed it (deducting the real balance), finalized branch processing.
3. **The genuinely new check**: as Operations Manager, in a brand-new session, the Operations Dashboard, the Reports page (default Shared Batches report), and the Liquidity Dashboard were all opened and confirmed to render **real data matching what was just created** - the batch reference on Reports, the payout account on the Liquidity Dashboard. `reportingProjectionService.ts` was touched by every single Phase 2 migration this session (Milestone 1, 2, and 3 each added `await` to its own read calls); this is the first time since those changes that Reports/Dashboards were actually loaded in a browser rather than just type-checked and built.

**Result:** 8/8 assertions passed, zero console errors across the entire chain.

**Validation:** `npx tsc --noEmit` - clean (unchanged by this pass - verification only, no source files modified). `npm run build` - succeeded. `npx eslint src` - zero findings inside REOS (unchanged from Phase 4).

Test accounts, every operational row created during the regression run, and uploaded Storage objects were deleted from the live Supabase project afterward (confirmed 0 rows/objects remaining).

**What Phase 5 does not include, honestly recorded:** an automated, CI-integrated regression suite. Every verification this project has run, from Sprint 15 onward through this session's five phases, has been a hand-written Playwright or direct-API script, executed once, and deleted immediately after - proving the code worked *at the moment it was checked*, not that it will keep working as REOS continues to change. This is recorded in TECH_DEBT.md as the single largest remaining gap between "verified" and "regression-safe," and is the natural next body of work beyond this initiative, not attempted here - building test infrastructure (choosing a runner, wiring CI, deciding what stays mocked vs. real) is a distinct decision from verifying the product, and was not part of what this session's standing instruction asked for.

**REOS v1.0 Production Readiness Phases 1 through 5 are now complete** under the scope actually asked for - real persistence everywhere, a real audit trail, a clean lint surface, verified cross-branch isolation, and a proven end-to-end regression. Two honestly-recorded, non-blocking open items carry forward: the `USER_CREATED` audit intermittency (Phase 3, TECH_DEBT.md), and the absence of an automated regression suite (this phase, TECH_DEBT.md).

## REOS v1.0 Production Readiness - Phase 4: Production Hardening, First Pass (out-of-sprint, 2026-08-13)

Not part of any numbered sprint. The fourth of five Production Readiness phases - open-ended by nature ("performance, error handling, recovery, loading states, scalability"); this pass scopes it to the concrete, already-documented gaps TECH_DEBT.md had accumulated across every prior phase, rather than inventing new hardening work speculatively.

**What was done:**
1. **Full REOS-internal lint cleanup.** Every `react-hooks/set-state-in-effect` finding recorded in TECH_DEBT.md's "Linting" section - `OperationsDashboardPage.tsx`, `ReportsPage.tsx`, `ProofDownloadPage.tsx` - is resolved, using the same "defer every `setState` path past an `await`" restructuring already established and proven three times this session (Milestone 2/3's `BranchProcessingQueue.tsx` effects). Two genuinely dead local variables in `excelValidationService.ts` (`invalidRecords`/`validRecords`, shadowed by a correctly-used pair of the same names inside `createValidationSummary`, confirmed dead by tracing every read) were removed. `layout/Sidebar.tsx`'s two `react-refresh/only-export-components` errors (pre-existing since Sprint 10) were fixed by extracting `sidebarSections`/`getActiveSidebarItem`/the `SidebarItem`/`SidebarSection` types into a new `sidebarConfig.ts` - Fast Refresh only works when a file exports components alone, and `Sidebar.tsx` exported a component plus data/a function from the same file. `Breadcrumbs.tsx`/`Header.tsx`, the only two other consumers, updated to import from the new file. `npm run lint` across `src/` now returns **zero findings inside REOS** - the only five remaining project-wide are the already-documented, deliberately-untouched `no-irregular-whitespace` (a real regex requirement, not a bug) and three findings in `funding/`/`authService.ts`/`fundingRequestService.ts`, legacy modules explicitly out of REOS scope.
2. **Real cross-branch RLS negative-path verification**, closing an item flagged as open in TECH_DEBT.md since Milestone 1 ("RLS branch-scoping... not yet exercised against a Branch Officer attempting to read a *different* branch's data directly"). Seeded a `PORT_SUDAN` Shared Batch/Beneficiary/Assignment/queue-item/payout-account directly (bypassing the app), bootstrapped a Branch Officer scoped to `KASSALA`, and confirmed via direct Supabase API calls (no UI involved) that the Kassala officer's own session cannot read any of the five PORT_SUDAN rows, and an UPDATE attempt against the PORT_SUDAN queue item affects zero rows. A positive control (the same rows, read as Operations Manager) confirmed the seeded data was genuinely readable to *someone*, ruling out "everything is unreadable" as a false-positive explanation. 9/9 assertions passed.

**Validation:** `npx tsc --noEmit` - clean. `npm run build` - succeeded, 202 modules. `npx eslint src` - zero findings inside REOS.

**Deliberately not attempted in this pass, with rationale:** bundle size / code-splitting (`vite build`'s "chunk larger than 500 kB" warning) - a real, standing performance note, but restructuring route-level loading via `React.lazy`/`Suspense` is a larger, more invasive cross-cutting change than the concrete, already-scoped items above, and REOS is an internal ops tool without a demonstrated need for faster cold-load; a broader error-boundary/loading-state audit across every page - no specific gap was identified to fix, and auditing "every page" without a concrete finding risks exactly the kind of scope invention the standing engineering principles warn against. Both are recorded in TECH_DEBT.md/ROADMAP.md as legitimate future Phase 4 candidates, not silently dropped.

Test data (five seeded rows, two bootstrapped accounts) deleted from the live Supabase project after verification (confirmed 0 rows remaining).

## REOS v1.0 Production Readiness - Phase 3: Audit Trail (out-of-sprint, 2026-08-13, DECISIONS.md DEC-022)

Not part of any numbered sprint. The third of five Production Readiness phases. Canonical spec: **docs/AI/AUDIT_TRAIL.md**.

**Why this exists.** REPORTING_ARCHITECTURE.md Section 5.3 found the entire Audit report category permanently blocked: REOS constructed audit objects (`TransactionProcessingAudit`, `ProofDownloadHistoryEntry`, `SharedBatchReassignmentAudit`) and discarded every one of them; `branchProcessingQueueService.ts`, the live processing path, produced no audit record at all. Escalated as Decision D-5, explicitly blocked on a persistence decision (DEC-004) - now unblocked by Phase 2's completion.

**What was built:**
- One new table, `audit_events`, append-only (no UPDATE/DELETE policy exists for any role - by design). One unified `AuditEvent`/`AuditAction`/`AuditEntityType` vocabulary (`types/audit.ts`) replaces the three previously-separate, previously-discarded shapes.
- `auditService.recordAuditEvent` - called directly from the service function performing each action (`branchProcessingQueueService.ts`, `branchAssignmentService.ts`, `proofDownloadService.ts`, `liquidityService.ts`, `userService.ts`), never from a page, so no audit gap can slip in at a forgotten call site.
- Actor role is resolved **server-side** via the existing `current_user_role()` RPC, not accepted as client input - a client cannot misreport its own role in its own audit record.
- RLS: SELECT restricted to Operations Manager only (matching REPORTING_ARCHITECTURE.md Section 8.1's own stated default); INSERT open to any authenticated role but constrained to `actor_user_id = auth.uid()` - a real defense-in-depth guarantee, not just app-level trust.
- Minimal, necessary signature changes to carry an actor id where none existed: `startBranchProcessingQueueItem`, `updateBranchProcessingQueueItemStatus`, and `finalizeBranchProcessing` each gained an actor parameter; `assignSharedBatchToBranch`/`reassignSharedBatch`/`markBatchDownloaded` became `async` (previously synchronous); `createUser` gained an `actorUserId` parameter, sourced from a session the calling page did not previously read at all.

**A real defect was found and fixed during implementation, not assumed away**: `BATCH_CONFIRMED`'s first placement shared a guard with an unrelated Import Intelligence background-checksum precondition, meaning confirming quickly enough would silently skip both the new audit record and - a pre-existing, previously unnoticed gap this surfaced - the Import Intelligence ledger entry itself. Fixed by giving the audit call its own, narrower guard (session + sharedBatch only).

**Validation:** `npx tsc --noEmit` - clean. `npm run build` - succeeded, 201 modules. `npx eslint` on every touched file - clean (one already-documented, pre-existing, untouched finding in `ProofDownloadPage.tsx`).

**Runtime verification - real browser, one continuous flow plus RLS checks:**
1. Operations Manager: created and funded a payout account, created a new user through the real Create User UI, uploaded/confirmed/assigned a real batch.
2. Branch Officer: started a transaction, put it on hold, resumed it, uploaded a real proof, completed it; started and returned a second transaction; finalized branch processing.
3. Direct Remit Officer: downloaded an individual proof, marked the batch downloaded.
4. **RLS negative check**: the Branch Officer's own direct read attempt against `audit_events` returned zero rows, confirmed by design (Operations-Manager-only visibility).

17 of 18 distinct audited actions confirmed recorded with correct server-resolved actor role, entity, and branch attribution.

**One known gap, honestly recorded rather than claimed resolved:** `USER_CREATED` events were observed to intermittently not persist despite `createUser` completing successfully and `recordAuditEvent` reporting no error. Investigated at length - RLS and role-resolution are proven correct (the identical mechanism worked for the other 17 action types, several performed by the same session moments before/after); a two-attempt retry (300ms, then 1000ms) was added as a mitigation but did not reliably resolve it across repeated test runs. Suspected but unconfirmed: a timing interaction specific to auditing an action immediately after an `admin-create-user` Edge Function call (the one action in this phase involving a Supabase Admin API round trip). See AUDIT_TRAIL.md Section 7 and TECH_DEBT.md. `BATCH_REASSIGNED` was verified by code review only (identical pattern to the verified `BATCH_ASSIGNED`), not driven live.

Test accounts, every operational row created during verification, and uploaded Storage objects were deleted from the live Supabase project afterward (confirmed 0 rows/objects remaining) - the same discipline applied to every test dataset this session.

**Not built, deliberately - separate, downstream scope:** the Audit report category itself (Assignment History, Lifecycle History, Processing History, Proof Download History, User Activity) - this phase persists the trail; report *definitions* reading it through the Reporting Projection Layer are Reporting module work, the same relationship every other store has to Reporting.

## REOS v1.0 Production Readiness - Phase 2, Milestone 3: Liquidity Management Persistence (out-of-sprint, 2026-08-13, DECISIONS.md DEC-021)

Not part of any numbered sprint. The third and last Phase 2 milestone - closes Phase 2 entirely. Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**.

**Why this exists.** Milestones 1 and 2 persisted every other live operational store; `liquidityStore.ts` (`PayoutAccount`, `FundingEvent`) was the last one still in-memory. `PayoutAccount.currentBalance` resetting on reload was already recorded (2026-08-08) as the strongest single argument for approving persistence generally - every other value REOS tracks is reconstructable from Direct Remit's own export, but a manually-entered, manually-adjusted balance is not.

**What was built:**
- Three Supabase tables (`payout_accounts`, `funding_events`, `funding_entries`), `id text primary key` throughout except `funding_entries` (a synthetic identity column, since `FundingEntry` has no id of its own in `types/liquidity.ts` - it is a value list embedded on `FundingEvent`, reconstructed at read time, the same shape Milestone 1 established for Assignment's transaction lists).
- `liquidityStore.ts` rewritten Supabase-backed - all eight exports keep their exact original names, now `async`. `liquidityService.ts`'s business logic (validation, error messages, `recordFunding`'s deliberately sequential per-entry processing) is otherwise untouched.
- Every real consumer updated to `await`: `branchProcessingQueueService.ts` (`deductForTransaction`), `reportingProjectionService.ts` (already async-first by design - no other change needed, the third time this file has paid off exactly as REPORTING_PROJECTION_LAYER.md Section 9.1 intended), `BranchProcessingQueue.tsx` (`selectedPayoutAccount` restructured from a synchronous derived value to state + effect), `PayoutAccountManager.tsx`/`FundingRecorder.tsx` (synchronous render-time reads restructured to `useEffect`-driven state; the shared `refreshSignal` counter `LiquidityManagementPage.tsx` already bumped after either sibling wrote is now passed down as an explicit prop and included in each sibling's fetch effect's dependency array, preserving the original design's intent now that a re-render alone no longer refetches).
- **A real RLS gap found and fixed during implementation, not assumed away**: `savePayoutAccount` always issues a Postgres upsert, and Postgres requires the INSERT policy to pass even when a row already exists and the statement resolves as an update - an Operations-Manager-only INSERT policy silently broke `deductForTransaction` (a genuine Branch Officer write, exercised during transaction completion) with "new row violates row-level security policy," caught by real browser verification, not code review. Fixed by widening INSERT to also allow Branch Officer scoped to their own branch, the same grain already accepted for `branch_processing_queue_items` in Milestone 2.

**Validation:** `npx tsc --noEmit` - clean. `npm run build` - succeeded, 200 modules, 1,046.76 kB. `npx eslint` on every new/touched file - clean, zero errors, zero warnings.

**Runtime verification - real browser, three sessions, 8/8 assertions, zero console errors:**
1. One continuous Operations Manager session: created a payout account, recorded funding against it (balance 5,000 -> 6,000), then a **hard page reload** confirmed both the account and its updated balance survive a real reload, not just an unrefreshed tab.
2. A brand-new Branch Officer session, zero prior interaction, uploaded and assigned a batch to the same branch, saw the OM-created account in the Start Processing picker, and completed a real transaction against it (proof upload included, reusing Milestone 2's Storage path).
3. **The persistence proof:** a brand-new Operations Manager session, zero prior interaction, opened Liquidity Management and saw the deducted balance (6,000 - 500 = 5,500) - proving both the funding write path and the deduction write path survive a genuinely fresh session, not just a successful write.

Test accounts, Shared Batch/Beneficiary/Assignment/queue-item/proof/payout-account/funding rows, and uploaded Storage objects were all deleted from the live Supabase project after verification (confirmed 0 rows/objects remaining) - the same discipline applied to every test dataset this session.

**REOS v1.0 Production Readiness Phase 2 is now complete.** Not built, deliberately - the next phases: an audit trail for operational actions (Phase 3); production hardening (Phase 4); testing, regression testing, and documentation at the depth each prior phase required (Phase 5).

## REOS v1.0 Production Readiness - Phase 2, Milestone 2: Branch Processing Queue and Proof Storage Persistence (out-of-sprint, 2026-08-09, DECISIONS.md DEC-020)

Not part of any numbered sprint. The second Phase 2 milestone. Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**.

**Why this exists.** Milestone 1 persisted Shared Batch/Beneficiary/Assignment; Branch Processing's own queue-item state and every proof-of-payment file were still entirely in-memory, the latter via `URL.createObjectURL(file)` - a blob URL that cannot survive a reload under any circumstances. Real proof persistence requires genuine Supabase Storage, not just a table.

**What was built:**
- Two new tables (`branch_processing_queue_items`, `proofs`) plus `branch_processing_status` (the branch-level PROCESSING/COMPLETED lock, discovered during implementation not to be derivable from queue items alone) and a private Supabase Storage bucket, `proof-of-payment`.
- `branchProcessingQueueService.ts` rewritten Supabase-backed - every export keeps its name and becomes `async`, with one deliberate exception: `addProofToBranchProcessingQueueItem` now takes the raw `File` and an uploader id instead of a pre-built `ProofOfPayment`, because real upload needs the file's bytes.
- `proofOfPaymentService.ts`: `createProofOfPayment` (pure, blob-URL) replaced with `uploadProofOfPayment` (real Storage upload) plus `createSignedProofUrl`/`createSignedProofUrls` - every `previewUrl` is now a freshly generated signed URL, never stored.
- **Confirmed-dead code deleted, not just flagged:** `TransactionProcessingPage.tsx` (and its exclusively-used dependents `TransactionCard.tsx`, `ProcessingProgress.tsx`, several now-orphaned functions/types in `transactionProcessingService.ts`/`types/transactionProcessing.ts`) - a mounted but unreachable route (nothing but its own self-referential navigation ever linked to it) carrying a second, un-migrated implementation of the same proof-upload/completion workflow `BranchProcessingQueue.tsx` already handles live. Keeping it would have meant building the real Storage integration twice.
- Every real consumer updated: `BranchProcessingQueue.tsx` (every synchronous read moved to `useEffect`-driven state, matching Milestone 1's pattern), `proofDownloadService.ts`, `reportingProjectionService.ts` (including `projectLiquidityAccounts`/`projectLiquidityBranches`, whose per-account `getReservedAmountForAccount` calls are now `Promise.all`'d), `AppRoutes.tsx` (route removed with the page).

**Validation:** `npx tsc --noEmit` - clean. `npm run build` - succeeded, 200 modules. `npx eslint src` on every touched file - clean; one new `react-hooks/set-state-in-effect` finding in a newly-added effect fixed directly (deferred every `setState` path past an `await Promise.resolve()`), not left as debt.

**Runtime verification - real browser, three sessions, 16/16 assertions, zero console errors:**
1. One continuous session: an Operations Manager funded a payout account, uploaded and assigned a real fixture batch; a Branch Officer started the transaction, uploaded a real proof image (confirmed rendered via a genuine Storage signed URL, not a broken image), completed it, and finalized branch processing.
2. A Direct Remit Officer, in a separate session, opened Proof Download for that batch and saw the completed transaction and its proof listed.
3. **The persistence proof:** a brand-new Branch Officer session, nothing uploaded in it, showed the same real transaction at 100% completion with the branch locked - proving the queue state and its proof survive a genuinely fresh session, not just a successful write.

Test accounts, Shared Batch/Beneficiary/Assignment/queue-item/proof rows, and the uploaded Storage objects were all deleted from the live Supabase project after verification (confirmed 0 rows/objects remaining) - the same discipline applied to every test dataset this session.

**Not built, deliberately, at the time:** persistence for Liquidity Management/Funding (`liquidityStore.ts` - `PayoutAccount`, `FundingEvent`); an audit trail (Phase 3); production hardening (Phase 4). Liquidity Management persistence was completed next, in Milestone 3 above (DEC-021) - Phase 2 is now fully complete.

## REOS v1.0 Production Readiness - Phase 2, Milestone 1: Shared Batch, Beneficiary, Assignment Persistence (out-of-sprint, 2026-08-09, DECISIONS.md DEC-019)

Not part of any numbered sprint. The first Phase 2 milestone - migrating REOS's live in-memory operational stores to Supabase, one module at a time, each independently verified (the module-by-module discipline IMPORT_INTELLIGENCE.md Section 10 and TECH_DEBT.md both recorded as the reason this was deferred as its own initiative). Canonical spec: **docs/AI/OPERATIONAL_PERSISTENCE.md**.

**Why this exists.** "Replace memory stores with repository-backed implementations while preserving existing interfaces wherever practical," with Shared Batch, Beneficiary, and Assignment persistence named as the first priorities - the most foundational operational data, since Branch Processing, Proof Management, and Reporting all read through it. Phase 1 (real authentication, DEC-018) removed the architectural blocker this work was previously deferred behind: RLS now has a real `auth.uid()` to key on.

**What was built:**
- Three Supabase tables (`shared_batches`, `beneficiaries`, `assignments`), `id text primary key` throughout (REOS already generates its own prefixed string ids client-side - `shared-batch-<uuid>` etc - so no id-generation code changed anywhere).
- **`Assignment.assignedTransactions`/`manualReviewTransactions`/`invalidTransactions` are deliberately not stored** - confirmed by inspection that `Beneficiary.processingStatusId` is set once, at validation, and never mutated again anywhere in the codebase, so these three lists are reconstructed at read time by querying `beneficiaries` filtered by `processing_status_id` for the assignment's batch - a view over the real data, not a second copy that could drift from it. See DEC-019 and OPERATIONAL_PERSISTENCE.md Section 1.
- A second `SECURITY DEFINER` RLS helper, `current_user_branch_id()` (same pattern as `current_user_role()`, DEC-018), scoping a Branch Officer's reads/writes to their own branch's data - matching BUSINESS_RULES.md's "Can only view Shared Batches assigned to their branch."
- `sharedBatchStore.ts` rewritten Supabase-backed - all ten exports keep their exact original names, now `async`.
- Every real consumer (found by import search before writing any code, not by guessing) updated to `await`: `branchProcessingQueueService.ts` (`hydrateBranchProcessingQueue`, `finalizeBranchProcessing`), `proofDownloadService.ts` (`buildProofDownloadBatchFromSharedBatch`), `reportingProjectionService.ts` (two call sites - already async-first by design, REPORTING_PROJECTION_LAYER.md Section 9.1, confirmed to have paid off exactly as intended: no other change needed there), `SharedBatchUploadPage.tsx`, `BranchAssignmentPage.tsx`, `BranchProcessingPage.tsx`, `ProofDownloadPage.tsx`, `BranchProcessingQueue.tsx`.
- `BranchAssignmentPage.tsx`/`BranchProcessingPage.tsx`/`ProofDownloadPage.tsx` restructured from synchronous render-time store reads to `useEffect`-driven fetches (the same pattern every reporting page has used since Sprint 16). `BranchProcessingQueue.tsx`'s `hydrateBranchProcessingQueue` call moved from a bare `useMemo` with `setState` calls in its body - a documented, pre-existing lint finding (TECH_DEBT.md, "Linting") - to a proper `useEffect`, closing that debt item as a forced side effect of this migration (a `useMemo` callback cannot be `async`), not a separate cleanup pass.

**The critical boundary, stated plainly:** Branch Processing's own queue-item state, Proof Management, and Liquidity Management are entirely unchanged and remain in-memory. Each is a real, separately-scoped future milestone, not attempted in this pass - exactly the discipline that kept Import Intelligence's original migration safe.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 203 modules, 1,045.99 kB. `npx eslint` on every new/touched file - clean except the three already-documented `set-state-in-effect`/`exhaustive-deps` findings from Phase 1 and Liquidity Management (confirmed via `git blame` to predate this milestone), plus one new instance of the same already-accepted `set-state-in-effect` class in `ProofDownloadPage.tsx`'s new data-fetching effect (`setLoading(true)` at the top of the effect - the same pattern already accepted in `OperationsDashboardPage.tsx`/`ReportsPage.tsx`).

**Runtime verification - real browser, two separate contexts, 9/9 assertions, zero console errors:**
1. Context 1 (continuous session): Operations Manager created a Branch Officer for PORT_SUDAN, uploaded a real fixture file, confirmed it, and assigned it via the embedded Assignment panel - all now writing to Supabase. Logged out, logged in as the real Branch Officer, and confirmed the real assigned transaction appeared in the Branch Processing queue for PORT_SUDAN.
2. **Context 2 (the persistence proof): a brand-new browser context, nothing uploaded in it** - logging in as the same Branch Officer and navigating to Branch Processing showed the exact same real transaction, including the real beneficiary name, not just a reference id. This is the actual proof persistence works for Shared Batch/Beneficiary/Assignment, not an assumption from a passing write - the same standard applied to Import Intelligence's own persistence proof.

Test accounts and the fixture's Shared Batch/Beneficiary/Assignment rows were deleted from the live Supabase project after verification (confirmed 0 rows remaining across `profiles`, `shared_batches`, `beneficiaries`, `assignments`) - the same discipline applied to every test dataset this session.

**Not built, deliberately - future Phase 2 milestones (at the time):** persistence for Branch Processing's queue state, Proof Management, or Liquidity Management/Funding; an audit trail (Phase 3); production hardening (Phase 4). Branch Processing's queue state and Proof Management were completed next, in Milestone 2 above (DEC-020) - see that section for the up-to-date boundary; only Liquidity Management/Funding persistence remains outstanding in Phase 2.

## REOS v1.0 Production Readiness - Phase 1: Authentication & Authorization (out-of-sprint, 2026-08-08, DECISIONS.md DEC-018)

Not part of any numbered sprint. The first of five Production Readiness phases (Authentication -> Persistence -> Audit Trail -> Hardening -> Testing). Canonical spec: **docs/AI/AUTHENTICATION.md**.

**Why this exists.** The instruction was explicit: replace the development authentication bypass, integrate real Supabase Auth, enable role-based permissions, enable proper Row-Level Security. This is the foundation every later phase depends on - persistence needs a real `auth.uid()` to key RLS on, and an audit trail needs a real actor to attribute actions to.

**What was built:**
- `public.profiles` table (one-to-one with `auth.users`) carrying role/branch/status - not a second copy of credentials. A `SECURITY DEFINER` helper (`current_user_role()`) avoids the classic RLS self-recursion pitfall; a second `SECURITY DEFINER` RPC (`clear_force_password_change()`) lets a user clear exactly one column on their own row without a general self-UPDATE policy.
- Edge Function `admin-create-user` - the only way to provision a real credential (client-side JS cannot safely call the Admin API). Authorizes callers itself (Operations-Manager-only), with a self-closing "first user becomes admin" bootstrap rule for when `profiles` is empty.
- `reosAuthService.ts`, `ReosAuthProvider`/`reosAuthContext.ts`, `RouteGuards.tsx` (`ReosSessionGate`, `RoleGate`, `BranchGate`, `ReosIndexRedirect`) - real session, real per-route and per-branch RBAC, replacing the single `localStorage.getItem("reos-auth")` check every route used identically.
- `ChangePasswordPage.tsx` - the mandatory first-login password change every newly created account is forced through, unskippable by direct navigation.
- Import Intelligence's `import_batches`/`import_beneficiaries` RLS tightened from permissive-to-`anon` (DEC-016, pending real auth) to `authenticated` + role-checked - closing that exact, previously-flagged gap.
- Every one of the 11 hardcoded actor/role literals found across REOS (`"OPERATIONS_MANAGER"`, `"current-user"`, `"BRANCH_OFFICER"`, `"DIRECT_REMIT_OFFICER"`, `"local-validation-engine"`) replaced with a real session value, in `BranchAssignmentPage.tsx`, `OperationsDashboardPage.tsx`, `LiquidityManagementPage.tsx`, `LiquidityDashboardPage.tsx`, `ReportsPage.tsx`, `SharedBatchUploadPage.tsx`, `ProofDownloadPage.tsx`, `BranchProcessingQueue.tsx`/`BranchProcessingPage.tsx`, `TransactionProcessingPage.tsx`, `excelValidationService.ts`.
- `SharedBatchUploadPage.tsx`'s embedded Assignment panel made role-aware: an Operations Manager sees the real, actionable form; a Direct Remit Officer sees an informational note directing to the dedicated Assignment page instead - the underlying DEC-014 rule was always enforced server-side, real auth just made the UI correctly reflect who's allowed to act.
- `userService.ts` migrated from an in-memory array to `profiles` queries, with every exported function signature preserved - the first store moved under the "preserve existing interfaces wherever practical" rule that governs Phase 2.
- `UserForm.tsx`'s "Password Hash" field (a raw, unhashed text box that fed nothing real) replaced with real `email`/`initialPassword` fields on create.

**A genuine architectural conflict was raised and resolved before writing code**, not discovered partway through: the same instruction that requested this phase also described a later "Operational Dataset" layer as the read source for Branch Processing and Liquidity Management - resolved as DEC-017 in the prior turn, narrowing that layer to reporting/analytics only. Not repeated here since it was already closed.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean throughout every stage of this large a change. `npm run build` - succeeded, 203 modules (+5), 1,040.20 kB. `npx eslint` on every new/touched file - clean except the three already-documented, untouched `set-state-in-effect` findings (`OperationsDashboardPage.tsx`, `ProofDownloadPage.tsx`, `ReportsPage.tsx`) and the pre-existing `BranchProcessingQueue.tsx` findings, all confirmed via `git blame` to predate this session.

**Runtime verification - real browser, three real roles, 18/18 assertions, zero console errors** - full narrative and the three real defects it found (a CORS misconfiguration on the Edge Function, a stale client-side session after password change causing a redirect loop, and relative-navigation breaking under the new nested route tree) in AUTHENTICATION.md Section 11. Test accounts and their Supabase Auth credentials were deleted after verification - the `profiles` table was confirmed empty again afterward, the same discipline applied to every other test dataset this session.

**Not built, deliberately:** failed-login-attempt tracking (unobservable via Supabase Auth's client API without a second event log); an admin password-reset UI (would need its own narrow Edge Function, same pattern as `admin-create-user`); anything depending on outbound email (invites, reset links) - deliberately avoided per AUTHENTICATION.md Section 4. See AUTHENTICATION.md Section 10.

## Import Intelligence (out-of-sprint, 2026-08-08, DECISIONS.md DEC-016)

Not part of any numbered sprint. REOS's first real, durable persistence. Canonical spec: **docs/AI/IMPORT_INTELLIGENCE.md**.

**Why this exists.** The stated objective was an Operational Data Platform: multi-year historical data, data coverage across reporting periods and sources, and duplicate detection against everything ever imported. All three are structurally impossible under an in-memory-only architecture - none of it can outlive a single browser tab. Raised as a blocker (a genuine contradiction with DEC-004) before any code was written; persistence was then explicitly approved, scoped to this ledger, with multi-source ingestion explicitly descoped (Direct Remit only - no file format for Western Union/RIA/MoneyGram/TerraPay has ever been seen, so no parser was invented for them).

**What was built:**
- A real Supabase migration (`import_intelligence_ledger`) against the already-connected, already-provisioned `remit-connect` project (previously used only for Supabase Auth wiring that the app's actual login flow never invokes - `LoginPage.tsx` is a dev bypass). Two tables: `import_batches`, `import_beneficiaries`. RLS enabled, permissive to `anon`/`authenticated` - matching the app's real, current, no-session security posture, not a new gap. Zero existing tables were touched; this was a clean slate.
- `src/lib/database.types.ts` - generated types from the live schema; `src/lib/supabase.ts` now uses them (`createClient<Database>`).
- `services/importIntelligenceService.ts` - SHA-256 file fingerprinting, duplicate detection (checksum or reference+period match), Reporting Period derivation (the mode of real business dates, never entered manually), durable persistence, Data Coverage, Import History.
- `components/DuplicateImportDialog.tsx` - Replace / Merge (reference-level dedup against the existing batch) / Cancel, with the matching prior import's detail always shown inline.
- `pages/ImportIntelligencePage.tsx` (`/reos/import-intelligence`) - a coverage grid (source x reporting period, real data only - the four undescoped sources always render uncovered, honestly) and an import history table.
- `SharedBatchUploadPage.tsx` extended: at Confirm Upload, checks the ledger and persists a durable record, **entirely independently of** the existing in-memory `saveSharedBatch`/`saveBeneficiaries` calls that drive the live workflow. A ledger failure never blocks confirming the upload - surfaced as a dismissible warning only.

**The critical architectural boundary, stated plainly:** this is not a migration of REOS's operational workflow to Supabase. Assignment, Branch Processing, Proof Management, and Liquidity Management are entirely unchanged and remain in-memory. Migrating them is real, separate, future work (IMPORT_INTELLIGENCE.md Section 10) - every one of their store functions is currently synchronous, and Supabase is inherently async, so that migration ripples into every page/component that calls them today. Attempting it in the same pass as standing up the first persistent table would have meant touching five already-working, already-verified modules with no dedicated verification pass for each - unacceptable regression risk. REPORTING_PROJECTION_LAYER.md Section 9.1 already anticipated this and built Reporting/Dashboards to absorb such a migration for free; the operational stores were not built that way, because DEC-004 didn't call for it until now.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 191 modules (+47, `@supabase/supabase-js`'s client entering the bundle graph for the first time), 1,008.72 kB. `npx eslint` on every new/touched file - clean except the two already-documented, untouched `Sidebar.tsx` findings.

**Runtime verification - real browser, three separate sessions, 11/11 assertions, zero console errors:**
1. Session 1: upload a real Direct Remit-format file, confirm - no duplicate warning (genuinely new), "Recorded in Import Intelligence" banner shown, live Assignment workflow still completes normally (regression check), Import Intelligence page shows the new batch in the same session.
2. **Session 2 (persistence proof): a brand-new browser context, nothing uploaded in it** - navigating straight to `/reos/import-intelligence` shows the batch from session 1. This is the actual proof persistence works, not an assumption from a passing write.
3. Session 2 continued: re-uploading the identical file triggers the duplicate dialog; Cancel adds nothing.
4. Session 3: re-uploading again and choosing Replace marks the prior batch `REPLACED` and records the new one `UNIQUE` - both visible, neither deleted.

Test rows were deleted from the live Supabase project after verification (`DELETE FROM import_batches WHERE file_name = '_fixture-import-intel.xlsx'`, cascading to beneficiaries) - the ledger was left as it was found, empty, the same discipline already applied to local temp files all session.

**Not built, deliberately - see IMPORT_INTELLIGENCE.md Section 10 for the full Phase 2 list:** persistence for Assignment, Branch Processing, Proof Management, or Liquidity Management; real authentication (RLS is permissive to match today's actual, unauthenticated app, not a regression); an individual-import line-item detail view (Import History is batch-level only); any Western Union/RIA/MoneyGram/TerraPay parser.

## Operational Dataset (out-of-sprint, 2026-08-08, DECISIONS.md DEC-017)

Not part of any numbered sprint. The read layer above Import Intelligence. Canonical spec: **docs/AI/IMPORT_INTELLIGENCE.md Section 13**.

**Why this exists.** The stated objective was completing the transition from file-centric to operational-data-centric: the operator should think about operational data, not imported files, with an Operational Dataset layer as "the single source of truth for all read operations" across Reports, Dashboards, Liquidity, Branch Processing, Historical Analytics, and Coverage. That literal framing was a genuine architecture conflict: Branch Processing's live queue state and Liquidity Management's balances were never part of Import Intelligence's scope, and DEC-016 explicitly deferred persisting the live operational workflow as separate future work to avoid regression risk across five already-verified modules. Raised as a blocker before any code was written; resolved by explicit scope choice - **reporting/analytics reads only**, Branch Processing and Liquidity Management unaffected (DEC-017).

**What was built:**
- `types/operationalDataset.ts` / `services/operationalDatasetService.ts` - the read layer. Every function reads exclusively through `importIntelligenceService.getImportHistory()`/`getImportBatchBeneficiaries()` (one Supabase query path, transformed in memory) - no second, competing query path against the ledger tables.
- **Data Coverage, redesigned**: Year -> Month -> Source, four statuses derived strictly from the ledger (`MISSING`, `IMPORTED`, `INCOMPLETE` - date range doesn't span the full month, `DUPLICATE` - more than one batch was ever recorded for this period+source). `pages/DataCoveragePage.tsx`, `/reos/import-intelligence/coverage`.
- **Import History, redesigned**: adds Coverage Impact (`FIRST_FOR_PERIOD` vs `ADDITIONAL`) and Validation Outcome per row; primary filters (Reporting Period, Source, Currency, Duplicate Status) and secondary/advanced filters (Import Batch Reference, Uploader) - Upload Timestamp and Uploader are audit fields, not operational ones, per the redesigned filter hierarchy. Each row links to a new per-batch detail page with the full beneficiary list, closing the previously-open "no beneficiary-level detail UI" tech debt item. `pages/ImportHistoryPage.tsx` + `pages/ImportBatchDetailPage.tsx`, `/reos/import-intelligence/history` and `/history/:batchId`.
- **Duplicate Management, new**: every connected group of related imports (union-find over checksum match, reference+period match, and the Replace/Merge chain), with the reasons and every member batch shown side by side. Deliberately a read/audit surface - Replace/Merge/Cancel remain upload-time-only actions (Section 5), since there is no "replace with nothing" to retroactively apply to a past import. `pages/DuplicateManagementPage.tsx`, `/reos/import-intelligence/duplicates`.
- **Historical Performance, new**: Month-over-Month and Year-over-Year transaction-count growth (null/"N/A" rather than a division-by-zero artifact when either side is empty), and Source comparison. Amounts are broken out by currency, never blended. Branch comparison is explicitly not offered and the page says why - the ledger has no branch dimension. `pages/HistoricalPerformancePage.tsx`, `/reos/import-intelligence/performance`.
- **Import Experience enhancement**: the post-confirm banner on `SharedBatchUploadPage.tsx` now shows Reporting Period, Business Date range, Source, Transaction count, Total Amount, Duplicate Status, Validation Outcome, and Coverage Impact together, via a new shared `components/ImportRecordSummary.tsx` (also used by the batch detail page, so the two never drift into different summaries of the same record).
- **Validation Outcome persistence**: a new migration, `import_batches_validation_outcome`, added `valid_record_count`/`invalid_record_count`/`manual_review_record_count` to `import_batches` - the validation summary the operator already saw at Confirm Upload, now durable rather than living only in transient component state.
- `pages/ImportIntelligencePage.tsx` rewritten as a lightweight overview linking to the four pages above, with three summary tiles (imports recorded, periods covered, sources with data).
- Sidebar: the four pages plus the overview now live under a new "Operational Data" section.

**The critical architectural boundary, stated plainly (DEC-017):** Branch Processing and Liquidity Management do **not** read through this layer. Both keep their own in-memory state as their operational source of truth, exactly as before. This layer is additive on top of Import Intelligence, for reporting and analytics only.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 198 modules (+7), 1,032.23 kB. `npx eslint` on every new/touched file - clean except the two already-documented, untouched `Sidebar.tsx` findings (confirmed via `git diff` that this change's Sidebar edit is a pure addition; the flagged lines are untouched).

**Runtime verification - real browser, 22/22 assertions, zero console errors:** uploaded a real fixture (5 rows, August 2026) and confirmed - Import Experience banner showed all required fields including Coverage Impact ("Filled a coverage gap"); live Assignment workflow completed end to end (real branch assignment, "Open Branch Processing" link appeared - regression check); Import Intelligence overview showed the correct summary counts; Data Coverage rendered the new period; Import History showed Coverage Impact and Validation Outcome, and its row link opened the batch detail page with the real beneficiary list; Historical Performance showed the period with "N/A" growth (no prior period to compare against) and the Branch-comparison disclaimer; re-uploading the identical file triggered the duplicate dialog, Replace was chosen, and the second import correctly showed Coverage Impact "Added onto existing coverage"; Duplicate Management explained the match ("Same file, byte for byte") and showed the `REPLACED` batch in its group; Data Coverage then showed `DUPLICATE` status for that period/source. Test rows were deleted from the live Supabase project after verification (confirmed 0 rows remaining in both tables) - the ledger was left as it was found, the same discipline applied every time this session.

**Not built, deliberately:** Branch Processing/Liquidity Management reads through this layer (DEC-017); Branch comparison in Historical Performance (no branch dimension in the ledger); retroactive Replace/Merge from Duplicate Management; Import-Ledger data wired into the existing `reportService.ts`/`ReportsPage.tsx` (that family stays scoped to `reportingProjectionService`, per REPORTING_STANDARDS.md).

## Liquidity Management Module (out-of-sprint, 2026-08-08, DECISIONS.md DEC-015)

Not part of Sprint 17 or any other numbered sprint. Full design and implementation of REOS's Operational Liquidity Management module, specified in **docs/AI/LIQUIDITY_MANAGEMENT.md** (the canonical reference - this entry summarizes it, does not replace it).

**Root requirement:** Branch Processing had no concept of the cash a branch actually pays out with. Every completed transaction was recorded as done with no link to a real, finite payout account, so REOS could not answer "can this branch still pay?" or "which account funded this transaction?" - a genuine operational gap, not a reporting one.

**Existing-architecture review (mandatory, performed before any code):** a complete, separate Branch Liquidity / Treasury / Funding system already exists in this repository, entirely outside REOS (`src/pages/branches`, `src/pages/treasury`, `src/pages/funding`, `src/types/Branch.ts` / `Treasury.ts` / `FundingRequest.ts`, `src/services/branchService.ts` / `treasuryService.ts` / `fundingRequestService.ts`). It tracks one aggregate liquidity figure per branch (not per-account), is approval-gated (Treasury approves/rejects funding requests - explicitly *not* the approved model here), and runs entirely on hardcoded seed data disconnected from any real transaction. **Not reused, not extended, not imported from** - LIQUIDITY_MANAGEMENT.md Section 3 records the three concrete reasons (different grain, different business process, different data reality) plus the ARCHITECTURE.md module-boundary finding. What genuinely *was* reused: REOS's own pre-existing, unused `types/branch.ts` `Branch` type, now backed by a minimal registry (`branchRegistryService.ts`) seeded with the same branch ids Assignment already uses - closing part of REPORTING_ARCHITECTURE.md's Decision D-7 as a side effect.

**Files created:**
- `docs/AI/LIQUIDITY_MANAGEMENT.md` - the canonical 15-section spec, written first.
- `types/liquidity.ts`, `types/liquidityDashboard.ts` - domain types (`PayoutAccount`, `FundingEvent`/`FundingEntry`, the dashboard view model).
- `services/liquidityStore.ts` - Map-based store, exact pattern as `sharedBatchStore.ts`.
- `services/liquidityService.ts` - `addPayoutAccount`, `updatePayoutAccount`, `setPayoutAccountStatus`, `recordFunding` (manual, no approval), `deductForTransaction` (the one real balance deduction, called only from Branch Processing completion).
- `services/branchRegistryService.ts` - the minimal branch registry described above.
- `services/liquidityDashboardService.ts` - mirrors `dashboardService.ts`'s pattern: a pure function from projections to a view model.
- `components/PayoutAccountManager.tsx`, `components/FundingRecorder.tsx` - account CRUD and funding recording UI.
- `pages/LiquidityManagementPage.tsx` (`/reos/liquidity`), `pages/LiquidityDashboardPage.tsx` (`/reos/liquidity/dashboard`).

**Files extended (not duplicated):**
- `services/branchProcessingQueueService.ts` - `BranchProcessingQueueItem` gained `payoutAccountId`; a new `startBranchProcessingQueueItem` (the only path into `IN_PROGRESS`, requiring a payout account with sufficient available balance the first time) and `getReservedAmountForAccount` (live-computed "reserved" liquidity, never stored); `completeBranchProcessingQueueItem` now calls `liquidityService.deductForTransaction` once - the only real deduction, at the one status transition with no path back out, so no reversal logic is needed anywhere (see LIQUIDITY_MANAGEMENT.md Section 7.1 for why deduction happens at completion, not account selection).
- `components/BranchProcessingQueue.tsx` - an account selector at Start Processing, offering only accounts with enough available balance; shows the selected account in Transaction Details.
- `types/reportingProjection.ts` + `services/reportingProjectionService.ts` - two new grains, `LiquidityAccountProjection` (one account) and `LiquidityBranchProjection` (one branch), plus `FundingEventProjection` (one funding event). `reservedBalance`/`availableBalance` are computed by calling `branchProcessingQueueService.getReservedAmountForAccount` - not recomputed.
- `types/report.ts` - `ReportCategory` gained `"LIQUIDITY"` (additive, does not touch the still-open Decision D-1); `ReportType` gained six values.
- `services/reportService.ts` - three new generate methods (`generateLiquidityBranchReport`, `generateLiquidityAccountReport`, `generateFundingHistoryReport`) serving six report definitions (Branch Liquidity, Daily Consumption, Account Balances, Low Balance Accounts, Liquidity Exceptions, Funding History) - the same "narrowed variant of one projection" pattern already used for `SHARED_BATCHES`/`READY_FOR_DOWNLOAD_BATCHES`/`DOWNLOADED_BATCHES`. Also `generateLiquidityDashboard`, mirroring `generateOperationsDashboard`.
- `routes/AppRoutes.tsx`, `layout/Sidebar.tsx` - two new routes, a new "Liquidity" Sidebar section.

**A real defect found and fixed during browser verification** (not a test artifact): `PayoutAccountManager` and `FundingRecorder` are sibling components both reading the same module-level `liquidityStore`. Adding an account in one did not refresh the other - React only re-renders a component when its own state or props change, and mutating an external store doesn't trigger that. Fixed by lifting a shared refresh signal to their parent, `LiquidityManagementPage`: each child calls a passed-in `onChange` after every write, which bumps the parent's state and re-renders both children together. Re-verified after the fix - an account added is now immediately fundable in the same view.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 144 modules (+8 from Sprint 17 M5's 136), JS 792.11 kB. `npx eslint` on every new/touched file - clean except pre-existing, already-documented findings (TECH_DEBT.md) plus one new instance of the same already-recorded `exhaustive-deps` warning class in `BranchProcessingQueue.tsx` (not fixed, matches the file's existing pattern).

**Runtime verification - real browser, real workflow, 16/16 assertions passed, zero console errors:** add a payout account -> edit it -> record funding (balance increases, history recorded, no approval/pending state) -> upload and assign a real Direct Remit file -> Branch Processing shows only accounts with sufficient available balance -> start processing with a selected account -> upload proof -> complete (balance deducts by the real transaction amount) -> Liquidity Management shows the new balance -> Liquidity Dashboard shows correct Total/Available/Reserved/Consumption Today/Funding Today -> a Branch Liquidity report generates with real data -> Operations Dashboard still renders (regression check, no interference from the new module). Screenshots confirmed all figures visually, not just by text match.

**Not built, deliberately:** actor-role gating on Liquidity Management's writes (matches Branch Processing's already-open, not-yet-resolved gap, TECH_DEBT.md - not a fourth inconsistent gating story); reconciliation with the legacy Treasury/Branch Liquidity/Funding system (recorded as an open item, not a business decision this work could make unilaterally); persistence for account balances (DEC-004 unaffected; LIQUIDITY_MANAGEMENT.md Section 12 records this as the strongest argument yet for approving it).

## Current Sprint

Sprint 17 - Shared Batch Import Modernization

## Current Module

Shared Batch Upload (`excelValidationService.ts`), with a later dependency on `sharedBatchService.parseBankField`.

## Scope Approval

Approved by the business owner on 2026-08-02, following the analysis of a real production Direct Remit export. Five business decisions were approved and are recorded in DECISIONS.md as **DEC-008 through DEC-012**:

1. **DEC-008** - the real Direct Remit Excel layout is the supported import contract.
2. **DEC-009** - the importer partially imports valid rows and flags invalid rows for review.
3. **DEC-010** - bank names are **not** normalized in this sprint.
4. **DEC-011** - transaction dates are captured from the Excel file.
5. **DEC-012** - there shall be one shared `parseBankField()` used by all import paths.

Sprint 17 is to be implemented **milestone by milestone**, not in one pass. Each milestone stops for review.

## Sprint Goal

Make REOS import the Direct Remit export that Direct Remit actually produces. Today it imports none of it: run against the real file, `excelValidationService` produced **0 valid records from 63 real transactions**, with all six required columns reported missing.

## The Problem, Measured

The real sample (`transactionhistoryRpt` worksheet, 100 sheet rows) was run through the shipped validation service on 2026-08-02. Result before Sprint 17:

```
totalRecords: 69 | validRecords: 0 | invalidRecords: 69
readyForAssignment: false | batchStatus: PENDING_REVIEW
issues: 75 (all ERROR)
```

Root causes found, in order of how early they break the import:

| # | Finding | Milestone |
|---|---|---|
| 1 | Header sits on sheet row 2; the service reads row 1, which is blank | **M1** |
| 2 | The header repeats mid-sheet at rows 35 and 71 (paginated export) | **M1** |
| 3 | 31 fully blank spacer rows are interleaved | **M1** |
| 4 | `TOTAL` subtotal rows at sheet rows 32, 67, 75 are not transactions | **M2** (folded in, DEC-013) |
| 5 | Column names differ entirely (`Payout Ref. No`, `Receiver Name`, `CCY`, `FC Amount`, `Bank`) | **M2** |
| 6 | Amounts are padded, comma-formatted text (`" 4,118,002 "`); `Number()` fails on all 63 | **M2** |
| 7 | Two row layouts in one file: 37 rows carry `Bank = "BANK OF KHARTOUM (Acc No: 4734114)"`; 26 rows carry the bank name in the `Dest Country` column and a bare account number in `Bank` | **M3** |
| 8 | `parseBankField` does not recognise the `(Acc No: ...)` form - fails on all 63 rows | **M3** (DEC-012) |
| 9 | `transactionDate` is never captured, though the file has a `Date` column (`DD/MM/YYYY`) | M4 (DEC-011) |

## Milestones

- **M1 - Row Structure Detection: COMPLETE.** Locate the header row; ignore leading blank rows, repeated page headers, and blank data rows. Detail below.
- **M2 - Column Contract: COMPLETE.** Alias-based column resolution, structural transaction-row detection (DEC-013), tolerant amount parsing. Detail below.
- **M3 - Bank Field: COMPLETE.** One shared `parseBankField` (DEC-012) now handles the `(Acc No: ...)` form and both row layouts. **The real file now imports successfully: 63/63 valid records.** Detail below.
- **M4 - Transaction Date: COMPLETE.** Captures the `Date` column, converting `DD/MM/YYYY` to ISO (DEC-011). Detail below.
- **M5 - Stabilization & Closure: NOT STARTED.** Runtime verification with the real file, documentation sync, final validation.

## Allowed Directories

M1, M2 and M3: `src/features/reos/services/**` and `docs/AI/**`. No page, component, type, route or business rule was modified in any of them.

## Milestone Log

### M1 - Row Structure Detection: COMPLETE

One file changed: `services/excelValidationService.ts`. No behaviour outside row scanning was touched - no column mapping, no amount parsing, no bank parsing, no date capture. Those are M2 to M4.

**What changed:**
- `findHeaderRowIndex(rows)` - the header is now located rather than assumed to be row 1. Falls back to row 0 when no recognised header exists, preserving behaviour for files this service already handled.
- `isHeaderRow(row)` - a row is a header when it carries at least **two** recognised labels. Two rather than one is deliberate: the real file contains beneficiary bank cells whose entire value is the word `Bank`, and a one-label rule would misread those data rows as headers and silently drop real transactions.
- `headerLabels` - recognises both the legacy required column names and the approved Direct Remit labels. This list **locates** headers only; it does not map them to fields, which is M2. A Direct Remit file therefore still reports its required columns as missing until M2 lands.
- Data rows are now taken from below the located header, excluding blank rows and every repeated header.
- Each row carries its **true 1-based spreadsheet row number**. Validation issues now point at the row the operator sees in Excel; the previous code derived the number from the filtered array index, so it drifted as soon as any row was skipped - issues pointed at the wrong row whenever a file had blank lines.

**Measured impact on the real file:** records went **69 -> 66**. The two repeated headers and the blank spacer rows are gone. Row-validation messages now cite real sheet rows (first `Row 3`, last `Row 75`) instead of shifted positions.

**Still 0 valid records, as expected.** M1 fixes which rows are read, not how their columns are understood. The six missing-column errors remain until M2. Import remains blocked - correctly - at this milestone.

**Regression check:** a legacy-format file (the original six required columns) still validates **2/2 valid, `readyForAssignment: true`, 0 issues**. M1 is backward compatible.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` clean; `npm run build` succeeded.

### M2 - Column Contract: COMPLETE

One file changed: `services/excelValidationService.ts`. `parseBankField`, transaction dates and bank normalization were not touched - they are M3, M4 and DEC-010 respectively.

**What changed:**
- **Alias-based column resolution.** `columnAliases` maps each required field to the header labels that may supply it: `Direct Remit Reference` <- `Payout Ref. No`, `Beneficiary Name` <- `Receiver Name`, `Amount` <- `FC Amount`, `Currency` <- `CCY`. Both contracts import through one code path; there is no second parser and no per-format branch. `requiredColumns` and `headerLabels` are now derived from this one table, so header recognition and field resolution cannot drift apart.
- **Structural transaction-row detection** (DEC-013). A row is a transaction only if it carries a transaction identifier. This is what removes the three `TOTAL` subtotal rows - by the absence of a reference, never by matching the word "TOTAL", which is presentation text and may be localised. When the reference column is absent entirely, every row is kept so the existing missing-data validation still reports them rather than the file silently importing as empty.
- **Tolerant amount parsing.** `parseAmountValue` strips ordinary whitespace, the non-breaking (U+00A0) and narrow no-break (U+202F) spaces Excel writes in numeric columns, and thousands separators, preserving the decimal point. **The business rule is unchanged** - an amount is valid when present and finite, exactly as before; only how the text is read changed.
- `getCellValue` now accepts an optional index, because an unresolved column has none. An absent column reads as an empty cell, which the existing missing-value validation reports - the same outcome as before, expressed honestly in the types.

**Measured impact on the real file:**

| | Before Sprint 17 | After M1 | After M2 |
|---|---|---|---|
| Records | 69 | 66 | **63** |
| Missing-column errors | 6 | 6 | **2** |
| Amounts parsed | 0 / 63 | 0 / 63 | **63 / 63** |
| References mapped | 0 | 0 | **63** |
| Beneficiary names mapped | 0 | 0 | **63** |
| Currencies mapped | 0 | 0 | **63** |
| Valid records | 0 | 0 | 0 |

63 records is exactly the number of real transactions in the file. Amounts now range 1,016,379 to 63,000,000 SDG.

**Independent cross-check of amount parsing:** the parsed amounts sum to **226,553,323**. The file's own three `TOTAL` rows sum to 65,174,868.87 + 60,567,746.64 + 100,810,707.38 = **226,553,322.89**. The parsed total agrees with the source system's own totals to source rounding - the per-row values are whole numbers while the totals carry cents. This is strong evidence the amount column is being read correctly, not merely parsed without error.

**Still 0 valid records, and correctly so.** Only two required columns remain unresolved - `Bank Name` and `Account Number` - because the export supplies both in one composite `Bank` column. Splitting it belongs to the single shared `parseBankField` in M3 (DEC-012); mapping the composite onto `Bank Name` here would place an account number inside a bank name, which is exactly what the frozen rule forbids. **M3 is the milestone that makes the import succeed.**

**Regression check:** the legacy-format file still validates **2/2 valid, `readyForAssignment: true`, 0 issues**. Backward compatible.

**Validation:** `tsc` clean; `npm run build` succeeded, 135 modules, JS 759.60 kB.

### M3 - Bank Field: COMPLETE

Two files changed: `services/sharedBatchService.ts` (the parser itself) and `services/excelValidationService.ts` (wiring it in). Transaction dates and bank normalization were not touched - M4 and DEC-010 respectively.

**Unification (DEC-012).** `excelValidationService.ts` previously required two separate `Bank Name` / `Account Number` columns and did no parsing at all; `sharedBatchService.parseBankField` existed but was called only from the unused CSV import path and could not recognise the export's `(Acc No: ...)` form. There are now **zero** duplicate parsers: `excelValidationService` imports `parseBankField` from `sharedBatchService` and calls it directly. This is the only cross-file import Sprint 17 has introduced.

**`parseBankField` extended to three input shapes**, tried in order, all returning `{ bankName, accountNumber }`:
1. **Labelled account** - `"BANK OF KHARTOUM (Acc No: 4734114)"` (Layout A). Both values come from the one cell.
2. **Bare account number** - `"3686824"` (Layout B). The Bank cell is only digits; the bank name is supplied by the caller as `fallbackBankName`.
3. **Trailing account token** - `"Bank of Khartoum 1002003001"`. The pre-existing behaviour, unchanged, still exercised by the CSV path.

Anything else returns a bank name with no account number, exactly as before. The function signature changed from `parseBankField(bankField)` to `parseBankField(bankField, fallbackBankName = "")` - purely additive; the CSV path's existing single-argument call site required no change.

**Column resolution in `excelValidationService.ts`.** `Bank Name` and `Account Number` were removed from the generic alias table (they are not a simple 1:1 alias - which columns even apply depends on which shape the file uses) and are now resolved by a dedicated `resolveBankFields`:
- If both `Bank Name` and `Account Number` columns exist (legacy shape), read directly - no parsing, no behaviour change.
- Else if a `Bank` column exists (Direct Remit shape), call `parseBankField(bankCell, destCountryCell)` per row. `Dest Country` supplies the fallback name for Layout B rows; for Layout A rows the labelled match already supplies a name, so the fallback is simply unused.
- Else, both columns are reported missing, exactly as the legacy-only contract always has.

**Bank names are returned exactly as received**, apart from trimming surrounding whitespace - no normalization, mapping or correction of any kind (DEC-10). Verified: the real file's nine spellings of the same bank across two scripts (`BANK OF KHARTOUM`, `Bank of Khartoum`, `ALKHARTOUM`, `KHARTOUM BANK`, `khartoum`, `khartoum bank`, `BANK Of KHARTOUM`, `بنك الخرطوم`, `الخرطوم`, plus the typo `BANK OF KHATOUM`) all import as distinct, unmodified strings.

**Measured impact on the real file:**

| | After M2 | **After M3** |
|---|---|---|
| Missing-column errors | 2 (`Bank Name`, `Account Number`) | **0** |
| Bank names populated | 0 / 63 | **63 / 63** |
| Account numbers populated | 0 / 63 | **63 / 63** |
| Valid records | 0 | **63 / 63** |
| `readyForAssignment` | false | **true** |
| `batchStatus` | `PENDING_REVIEW` | **`READY_FOR_ASSIGNMENT`** |

**Both layouts confirmed by direct inspection**, not merely inferred from the aggregate count. Layout A: `{ref: "110100004246", bankName: "BANK OF KHARTOUM", accountNumber: "4734114"}`. Layout B (Dest Country fallback): `{ref: "55542286121", bankName: "بنك الخرطوم", accountNumber: "3686824"}` - Arabic script preserved exactly.

**Regression check:** the legacy-format file still validates **2/2 valid**, with both `(bankName, accountNumber)` pairs read directly from their original two columns.

**Validation:** `tsc` clean; `npm run build` succeeded, **136 modules (+1)** - `sharedBatchService.ts` entered the bundle's module graph for the first time via the new import edge - JS 760.90 kB.

### M4 - Transaction Date: COMPLETE

One file changed: `services/excelValidationService.ts`. No other milestone's behavior touched - column resolution, amount parsing and bank-field parsing are untouched.

**What changed:**
- `Date` is resolved via `findSingleColumnIndex` (the same pattern M3 already uses for `Bank`/`Dest Country` - not a simple 1:1 alias, and deliberately **not** added to `requiredColumns`: DEC-011 asks that the date be captured when present, not that its absence invalidate a row).
- `parseTransactionDate` converts the export's `DD/MM/YYYY` text to ISO (`YYYY-MM-DD`), with a strict round-trip calendar check (so `31/02/2026` does not silently become `03/03/2026`). An absent column, empty cell, or unparseable value returns `""` - the exact value every row already had before this milestone - and does not add a validation issue or affect row validity.
- `Beneficiary.transactionDate` is now populated from this instead of the hardcoded `""` every previous milestone left it at.
- ISO (not the source `DD/MM/YYYY` text) is required because two existing downstream consumers depend on it: `reportService`/`reportingProjectionService`'s `compareDescending` sorts `transactionDate` with plain string `localeCompare`, and `dashboardService.getAgeMinutes`/`isSameOperationalDay` parse it with `new Date(...)`. Neither works correctly against `DD/MM/YYYY` text; both already work correctly against ISO.

**Verified with a real in-memory `.xlsx` buffer** (built with the same `xlsx` library the service parses, not a hand-built replica), run through the actual `validateExcelUpload` via Vite's own module loader: a valid `15/07/2026` cell parsed to `2026-07-15`; an unparseable date cell and an empty date cell both produced `""` with no new validation issue and no effect on row validity; a regression row set still validated 3/3.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 136 modules, JS 760.98 kB.

**Closes a Sprint 16 finding** (TECH_DEBT.md): transaction-level date columns and date filters had no data to work with; the dashboard's "Transactions Today" was permanently 0 because nothing populated `transactionDate`. That gap is now closed for the import layer - `Beneficiary.transactionDate` carries a real, ISO-formatted value when the source file provides one. Reporting/Dashboard components themselves were not touched (out of this milestone's file scope) and required no change, since they already consume whatever `transactionDate` value is present.

**Not yet done:** M5 (Stabilization & Closure) - runtime verification of the real Direct Remit file through the application UI, not just the validation service in isolation.

### M5 - Stabilization & Closure: COMPLETE (2026-08-06)

**Real browser verification, for the first time this sprint.** Every prior M1-M4 verification in this sprint (and the two out-of-sprint fixes that followed) ran against the service layer directly via Vite's module loader - never against a real browser driving the real UI, which PROJECT_STATE.md's standing caveat names as the only verification that actually proves a real user's path works. This milestone closes that gap: Playwright/Chromium was installed for this session (not added to `package.json` - installed with `--no-save`, used, then uninstalled; nothing about the dependency tree is different after this milestone than before it), and the full workflow was driven end to end against a synthetic `.xlsx` built to the real Direct Remit contract (`Payout Ref. No`, `Date` DD/MM/YYYY, `Receiver Name`, `CCY`, `FC Amount`, `Dest Country`, `Bank` with the `(Acc No: ...)` form) with a real image file for proof upload.

**Driven, in a real headless browser, via real client-side navigation (not URL `goto`, which would trigger a full reload and reset the in-memory store per DEC-004 - this distinction mattered, see "found and fixed" below):**
Upload -> validate -> Confirm Upload -> Branch Assignment panel shows the real batch automatically -> Confirm Assignment -> click the real `BranchProcessingNavigation` link -> Branch Processing queue shows both real beneficiaries -> Start Processing -> upload proof -> Complete (both transactions) -> Finalize Processing -> Reports renders -> Dashboard renders. **11/11 assertions passed, zero browser console errors.**

**Found and fixed a false alarm in the verification method itself, not the app**, worth recording because it's exactly the kind of thing this sprint's own standing caveat warns about: the first verification pass used `page.goto()` to jump directly to the Branch Processing URL, which - because `page.goto` is a full browser navigation, not a React Router transition - reset REOS's in-memory store (a correct consequence of DEC-004, not a bug) and made the queue appear empty. Corrected to navigate via the real in-app link (`BranchProcessingNavigation.tsx`'s `<Link>`) and the Sidebar, exactly as a real user would, after which the queue showed the real data. A second false alarm (a case-sensitive assertion regex not matching a CSS-`text-transform: uppercase` label) was traced with a full data-flow trace confirming the underlying value was correct at every layer (queue item -> assignment -> projection -> report -> dashboard stat) before concluding the assertion, not the app, was wrong. **No application defect was found.**

**Stabilization pass:**
- `npx eslint src/features/reos` run for the first time since Sprint 15 (per TECH_DEBT.md's own note that it hadn't been re-run project-wide). All findings are pre-existing, confirmed via `git diff` to be on lines this session's commits never touched. Two are newly recorded because they postdate the Sprint 15 audit (`OperationsDashboardPage.tsx`, `ReportsPage.tsx` - both Sprint 16) and one because it was never previously surfaced (`excelValidationService.ts`'s intentional-whitespace regex, Sprint 17 M2). None fixed - see TECH_DEBT.md, "Linting".
- No dead code, no duplicate logic, and no unused imports were introduced by this sprint or the two out-of-sprint fixes that followed it - `tsc`'s `noUnusedLocals`/`noUnusedParameters` (both enabled project-wide) would have caught any, and did not.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 136 modules, JS 762.02 kB.

**Sprint 17 is now fully complete: M1 through M5.**

## Out-of-Sprint Engineering - Branch Processing Timestamps & Actor Attribution (Decision D-6, 2026-08-05)

Not part of Sprint 17. REPORTING_ARCHITECTURE.md Decision D-6 and REPORTING_PROJECTION_LAYER.md Section 4.6 pre-designed this exact extension; TECH_DEBT.md and ROADMAP.md both carried it forward as known, approved-in-principle work once its dependency (nothing - it needs no persistence) was clear. Implemented after confirming (2026-08-05) that persistence stays out of scope and this item doesn't require it - it is purely additive in-memory state, same as everything else in REOS.

**Root cause closed:** `BranchProcessingQueueItem` carried no timestamps or actor attribution. `proofDownloadService.buildProofDownloadBatchFromSharedBatch` hardcoded `completedByUserId: null, completedAt: null` when mapping to `CreditToAccountTransaction`, so `dashboardService.getAverageProcessingMinutes` always returned `null` ("No data"), and `BranchPerformanceRow.processingSpeedMinutes` being always `null` drove `getBranchHealth` to `YELLOW` for every branch regardless of real performance.

**Files modified:**
- `services/branchProcessingQueueService.ts` - `BranchProcessingQueueItem` gained `startedAt`, `completedAt`, `completedByUserId`, `returnedAt`, `returnedByUserId`. `startedAt` is set once, on the first `ASSIGNED`/`ON_HOLD -> IN_PROGRESS` transition (resuming from hold does not reset it). `completeBranchProcessingQueueItem`/`returnBranchProcessingQueueItem` gained an actor-id parameter and now set the corresponding timestamp/actor pair. No transition rule, gating, or existing signature behavior otherwise changed.
- `components/BranchProcessingQueue.tsx` - its two call sites now pass the same `branchOfficerUserId` constant the component already used for proof uploads (existing hardcoded-actor convention - REOS has no session; not a new pattern).
- `services/proofDownloadService.ts` - `buildProofDownloadBatchFromSharedBatch` no longer hardcodes the per-transaction `completedAt`/`completedByUserId`/`returnedAt`/`returnedByUserId`; it reads them from the queue item, which now actually has them.
- `types/reportingProjection.ts` - added the fields REPORTING_PROJECTION_LAYER.md Section 4.6 pre-specified for this unblock: `startedAt`/`completedAt`/`completedByUserId`/`returnedAt`/`returnedByUserId`/`processingMinutes` on `ProcessingReportProjection`, `averageProcessingMinutes` on `BranchReportProjection`.
- `services/reportingProjectionService.ts` - `projectProcessing` now reads the new queue-item fields and computes `processingMinutes` (null unless both `startedAt` and `completedAt` are present); `projectBranches` computes `averageProcessingMinutes` per branch from that branch's queue items. This is the one computation the projection layer's own design document assigns to it (Section 4.6) - not "recomputing what another module already computes."
- `services/dashboardService.ts` - `getAverageProcessingMinutes` now averages the real `processingMinutes` values the projection layer supplies instead of returning a hardcoded `null`; `buildBranchPerformance` now reads each branch's own `averageProcessingMinutes` from its projection instead of calling one global (and previously always-null) function for every branch row - a correctness fix, since branch-level "processing speed" should reflect that branch, not an enterprise-wide figure.

**Not modified:** `assignmentService.ts`, `branchAssignmentService.ts`, `reportService.ts`, no new report definitions (Processing Time / Throughput / Officer Performance are still undefined - deferred as a distinct next milestone, since they're new report UI/definitions, not a data-availability fix). No persistence, no new dependency, no workflow-owner change.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 136 modules, JS 762.02 kB. `npx eslint` on every touched file - clean (the 3 pre-existing `set-state-in-render` errors in `BranchProcessingQueue.tsx`, TECH_DEBT.md's "Linting" section, are untouched lines, not introduced here).

**Runtime verification:** An 11-assertion functional smoke test drove the real, largely-unmodified chain through Vite's own module loader (not a hand-built replica): hydrate queue -> transition to `IN_PROGRESS` (`startedAt` set) -> upload proof -> complete (`completedAt`/`completedByUserId` set) -> `buildProofDownloadBatchFromSharedBatch` (real values, not null) -> `projectProcessing` (`processingMinutes` computed) -> `projectBranches` (`averageProcessingMinutes` computed) -> `buildOperationsDashboard` (Average Processing Time stat no longer reads "No data"; branch health reads `GREEN`, not the previous permanent `YELLOW`) -> reassignment regression check still passes. All 11 passed. Dev server also confirmed serving `/reos/dashboard`, the Branch Processing route, and every other workflow route at `200`. **Interactive browser click-through was not performed** - same environment limitation noted throughout this session (no headless-browser driver available).

**Remaining, deliberately deferred:** `OFFICER_PERFORMANCE`, `PROCESSING_TIME` and `RETURN_RATE`/`WORKLOAD` report definitions still do not exist in `reportService.ts` - the data to build them now exists, but defining new reports (columns, filters, UI wiring) is separate scope from unblocking the data, and is the natural next milestone.

## Acceptance Criteria (sprint-level)

- The real Direct Remit export imports, with valid rows imported and invalid rows flagged (DEC-008, DEC-009). **Met as of M3** - 63/63 real transactions import as valid records.
- Transaction dates are captured (DEC-011). **Met as of M4.**
- Exactly one `parseBankField` implementation exists and every import path uses it (DEC-012). **Met as of M3.**
- Bank names are imported as written; no normalization (DEC-010). **Met as of M3** - verified against nine real spellings across two scripts.
- Existing legacy-format files continue to validate unchanged.
- Verified by running the real file through the application, not by a passing build alone.
- TypeScript compiles; production build succeeds.

## Explicitly Out of Scope

- Bank name normalization, aliasing or fuzzy matching (DEC-010).
- Any change to frozen business rules, the Shared Batch lifecycle, or Assignment ownership (DEC-006).
- Reporting, dashboards, exports and audit reports - Sprint 16 items, unchanged here.
- Persistence (DEC-004).

## Carried Forward from Sprint 16

Sprint 16 delivered Reporting and the Operations Dashboard end to end but **never had a Stabilization & Closure pass**: `npm run lint` has not run since Sprint 15, and DEFINITION_OF_DONE.md's checklist was not completed. Eight Sprint 16 decisions (D-1, D-2, D-3, D-5, D-6, D-7, D-8, D-9) remain open in REPORTING_ARCHITECTURE.md. None blocks Sprint 17.

Note that **DEC-011 closes a Sprint 16 finding**: capturing the transaction date makes transaction-level date columns, date filters, and the dashboard's "Transactions Today" work for the first time. Done as of M4 (2026-08-05).

## Out-of-Sprint Hotfix - Shared Batch Assignment Authorization (2026-08-03)

Not part of Sprint 17. Directed as an urgent fix to `branchAssignmentService.assignSharedBatchToBranch`'s role check, which a runtime verification found did not match the actor-role assignment given for this fix (Operations Manager assigns; Direct Remit Officer no longer does).

**This directly reverses DEC-006 and BUSINESS_RULES.md's Approved Business Flow / Approved Roles, neither of which has been updated.** DEC-006 (Sprint 14 Milestone 1.5, APPROVED) states `branchAssignmentService.ts` "enforces the frozen role rules (Direct Remit Officer assigns; Operations Manager reassigns)"; BUSINESS_RULES.md's Approved Business Flow step 7 and the Direct Remit Officer role both say the same. The change was made on explicit, repeated instruction after this conflict was raised and the instruction was reaffirmed. **DECISIONS.md and BUSINESS_RULES.md still describe the old rule and were not updated** - out of scope for the instruction given, but a genuine one-source-of-truth gap until someone updates them. See TECH_DEBT.md-worthy note here since TECH_DEBT.md itself was out of scope for this fix.

**Root cause:** `assignSharedBatchToBranch` (`services/branchAssignmentService.ts`) checked `actorRole !== "DIRECT_REMIT_OFFICER"`. The only live call site, `SharedBatchUploadPage.tsx`'s Branch Assignment panel, hardcoded `actorRole: "DIRECT_REMIT_OFFICER"` (REOS has no session/auth context yet, same pattern as the Reports hardcoded-actor note in TECH_DEBT.md).

**Files modified:**
- `src/features/reos/services/branchAssignmentService.ts` - `assignSharedBatchToBranch`'s role check and thrown message changed from Direct Remit Officer to Operations Manager. `reassignSharedBatch` (Operations Manager) was not touched.
- `src/features/reos/pages/SharedBatchUploadPage.tsx` - the hardcoded `actorRole` passed to `assignSharedBatchToBranch` changed from `"DIRECT_REMIT_OFFICER"` to `"OPERATIONS_MANAGER"` to match, otherwise the live Assign button would throw on every use.

**Searched, not modified:** `BranchAssignmentPage.tsx` / `BranchAssignmentForm.tsx` (role comes from a form `<select>`, not hardcoded - no code change needed, operator now selects Operations Manager); `BranchAssignmentPanel.tsx`, `BranchAssignmentStatus.tsx`, `AssignmentSummary.tsx`, `BranchAssignedBatchView.tsx` (no role/`canAssign` logic present); `assignmentService.createAssignment` (internal detail per DEC-006, no role check). Proof Management (`ProofDownloadPage.tsx`, `proofDownloadService.ts`) and Branch Processing were not searched beyond confirming they don't call `assignSharedBatchToBranch` - untouched.

**Build status:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` and `npm run build` both fail, but on pre-existing, unrelated errors in `types/report.ts` / `reportService.ts` / `ReportsPage.tsx` / `ReportFilters.tsx` that were already present in the working tree before this fix (confirmed by stashing all changes and re-running `tsc` clean against commit `594e5e9`). Both files this fix touched compile with zero errors of their own - isolated by running `tsc` with the fix applied and confirming no new diagnostics appear against those two files.

**Runtime verification:** Partial. The dev server (`npm run dev`) was started and confirmed serving. Full browser-driven click-through (login, upload, confirm, assign, verify `ASSIGNED`, then Proof Download) was **not completed** - this environment has no headless-browser driver available (`chromium-cli` not installed, `playwright` not a project dependency). Verified instead by static trace of the only two code paths that call `assignSharedBatchToBranch`/`reassignSharedBatch` in the live app, confirming the sole live call site now matches the new required role and that reassignment's `OPERATIONS_MANAGER` check is untouched. **A real browser click-through is still owed** before this is considered fully verified per WORKFLOW.md's standard.

## Sprint 17 Stabilization - Reporting Compilation Restore (2026-08-03)

Not new functionality. `npx tsc` / `npm run build` had been broken since before this session by an uncommitted, stray edit to `types/report.ts` unrelated to any recorded decision (Sprint 17's own M1-M3 allowed directories explicitly excluded `types/**`).

**Root cause:** `types/report.ts` had been edited, uncommitted, to a shape that predates Sprint 16 M4.4: it dropped `ReportRow`, `ReportFilter.batchReference`, `ReportResult.totals`, and four `ReportType` members (`COMPLETED_TRANSACTIONS`, `RETURNED_TRANSACTIONS`, `READY_FOR_DOWNLOAD_BATCHES`, `DOWNLOADED_BATCHES`), and reintroduced `SharedBatchReportRow` / `TransactionReportRow` / `BranchBatchReportRow` - the exact three types TECH_DEBT.md already records as deleted dead code from the pre-M4.4 `location.state` path. `reportService.ts`, `ReportsPage.tsx` and `ReportFilters.tsx` were all still at their last-committed (`594e5e9`) shape and depend on the committed type contract, so the mismatch broke both `tsc` and `npm run build` with 17 diagnostics, none in the three consumer files themselves.

**Fix:** `types/report.ts` reverted to its committed (`594e5e9`) content - `git checkout HEAD -- src/features/reos/types/report.ts`. Confirmed before reverting that the reintroduced types and the added `ReportFilter.lifecycleStatus` field have zero references anywhere in `src` (grepped), so nothing was lost by removing them again; every field the revert restores (`ReportRow`, `batchReference`, `totals`, the four `ReportType` members) is actively read by `reportService.ts` / `ReportsPage.tsx` / `ReportFilters.tsx`, none of which needed any change. No redesign - this restores the exact type contract Sprint 16 M4.4 shipped and verified live.

**Files modified:** `src/features/reos/types/report.ts` only (reverted). `reportService.ts`, `ReportsPage.tsx`, `ReportFilters.tsx` were inspected, found already correct, and left untouched. Assignment, Branch Processing, Proof Management, the Sprint 17 import path, and Dashboard logic were not touched.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 136 modules, CSS 21.70 kB, JS 760.89 kB (matches the last known-clean Sprint 17 M3 build).

**Runtime verification:** Dev server started and confirmed serving; all five workflow routes (`/`, `/reos/reports`, `/reos/dashboard`, `/reos/shared-batches/upload`, `/reos/branch-assignment`) returned `200`. Vite's on-demand dev transform of `main.tsx`, `reportService.ts` and `ReportsPage.tsx` was forced via direct request and completed with no transform/resolution errors. **Interactive click-through (actually generating a report, uploading a batch, clicking Assign, exercising Proof Management, and checking browser console) was not performed** - no headless-browser driver is available in this environment, same limitation as the Assignment Authorization hotfix above. Because this fix touches only `types/report.ts` and every other file in the five workflows checked is byte-identical to the last commit (`594e5e9`, itself verified live per PROJECT_STATE.md Workflow Status), no regression is expected in Assignment, Branch Processing, or Proof Management - but this is reasoning from an unchanged diff, not a fresh live observation, and a real click-through is still owed.

## Shared Batch Assignment Workflow Completed (2026-08-03)

Closes the gap identified by the prior dependency analysis: `BranchAssignmentPage.tsx` could not display or use a real uploaded Shared Batch because beneficiaries were never persisted anywhere beyond `SharedBatchUploadPage.tsx`'s own local component state.

**Root cause.** Three facts, together: (1) `excelValidationService.validateExcelUpload` returns real `beneficiaries`, but only `SharedBatchUploadPage.tsx` ever saved the `SharedBatch` itself (`saveSharedBatch`) - the beneficiaries were kept only in that page's `useState` and discarded once the tab/route changed. (2) `BranchAssignmentPage.tsx` never called `getAllSharedBatches()` - it held its own `useState<SharedBatch | null>(null)`, populated only by a manual form (`createUnassignedSharedBatch`) that fabricated a batch from typed values. (3) Even had it loaded a real batch, its `assignSharedBatchToBranch` call hardcoded `beneficiaries: []`, so any resulting Assignment would carry zero real transactions regardless. Everything downstream of a correctly-populated `Assignment` (`assignmentService.createAssignment`, `branchProcessingQueueService.hydrateBranchProcessingQueue`, `getAssignmentsByBranch`) was already correct and required no change - confirmed by the dependency analysis before implementation and by the runtime smoke test below.

**Files modified (four, exactly as scoped - no service logic changed beyond the two additive accessors):**
- `services/sharedBatchStore.ts` - added `saveBeneficiaries(sharedBatchId, beneficiaries)` and `getBeneficiaries(sharedBatchId): readonly Beneficiary[]`, a `Map<string, Beneficiary[]>` alongside the existing `sharedBatches`/`assignments` maps, following the exact same save/get-with-copy pattern as `saveSharedBatch`/`getAllSharedBatches` (DEC-007's precedent). No existing function changed.
- `pages/SharedBatchUploadPage.tsx` - one added line, `saveBeneficiaries(result.sharedBatch.id, result.beneficiaries)`, immediately after the existing `saveSharedBatch(result.sharedBatch)`. No validation or business logic touched.
- `pages/BranchAssignmentPage.tsx` - `createUnassignedSharedBatch` (the fabrication path) deleted. Now reads `getAllSharedBatches()` on every render, filtered to `assignmentStatus === "UNASSIGNED"`, rendered as a selectable list (new inline markup, no new component file, reusing the existing `theme` tokens the sibling `BranchAssignmentPanel.tsx` already uses for the same kind of choice). Selecting a batch and submitting the form now calls `getBeneficiaries(batch.id)` and passes the real array into `assignSharedBatchToBranch` - the hardcoded `beneficiaries: []` is gone. `actorRole`/`assignedByUserId` are now hardcoded to `"OPERATIONS_MANAGER"`/`"current-user"`, matching the exact pattern `SharedBatchUploadPage.tsx`'s already-working inline flow uses (TECH_DEBT.md's documented hardcoded-actor stopgap, not a new pattern). Reassignment branch logic is otherwise unchanged.
- `components/BranchAssignmentForm.tsx` - the five manual identity fields (`sharedBatchId`, `sharedBatchReference`, `fileName`, `uploadedByUserId`, `totalBeneficiaries`) and the `actorRole`/`actorUserId` fields were removed; the form now collects only `branchId` and, for reassignment, `reassignmentReason` (the latter is a frozen business-rule requirement, untouched). Same form, same submit shape, no wizard.

**Not modified**, as instructed: `branchAssignmentService.ts`, `assignmentService.ts`, `branchProcessingQueueService.ts`, `proofDownloadService.ts`, `excelValidationService.ts`, `sharedBatchService.ts`, dashboard logic, reporting logic. `types/**` untouched - `Beneficiary` already existed as a type.

**Validation:** `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean. `npm run build` - succeeded, 136 modules, JS 760.46 kB.

**Runtime verification.** Two layers, since no headless-browser driver is available in this environment (same limitation noted in the two preceding entries):
1. **Functional smoke test against the real, unmodified services**, driven through Vite's own `createServer({ middlewareMode: true }).ssrLoadModule(...)` - the same module resolution and TS/JSX transform the dev server itself uses, not a hand-written replica. Simulated the full chain against `sharedBatchStore.ts`, the untouched `branchAssignmentService.ts`, and the untouched `branchProcessingQueueService.ts`: save a batch + 2 real beneficiaries -> batch appears in `getAllSharedBatches()` filtered to `UNASSIGNED` -> `getBeneficiaries` returns both real records -> `assignSharedBatchToBranch` with `OPERATIONS_MANAGER` succeeds, batch becomes `ASSIGNED` and `isLocked` -> Assignment's `assignedTransactions` contains both beneficiaries -> the batch drops out of the unassigned list -> `hydrateBranchProcessingQueue` (unmodified) receives both beneficiaries by their real ids -> `reassignSharedBatch` (unmodified) still succeeds. **All 10 assertions passed** on the first run.
2. **Module-transform check**: `BranchAssignmentPage.tsx`, `BranchAssignmentForm.tsx`, `SharedBatchUploadPage.tsx`, `ReportsPage.tsx`, `OperationsDashboardPage.tsx`, `ProofDownloadPage.tsx`, `BranchProcessingPage.tsx` were each forced through Vite's dev transform directly - all seven transform with no errors. Dev server also confirmed serving all five workflow routes at `200`.

**Not performed:** an actual browser click-through (visually confirming the batch list renders, clicking a batch, clicking Assign, watching Reports/Dashboard update on screen, opening Proof Management). The smoke test proves the underlying logic and data flow are correct; it does not prove the React components render that data correctly on screen. This is the same gap flagged in the two preceding entries and remains owed.

**Reports / Dashboard / Proof Management:** not modified, and none of their source consumes anything changed here beyond reading `SharedBatch`/`Assignment` records through the same `getAllSharedBatches`/`getAllAssignments` accessors they already used (Sprint 16 M4.1-M4.5) - the smoke test's assertion that `assignmentStatus` flips to `ASSIGNED` in the store is the same signal Reports/Dashboard already read. Proof Management's files were not touched or imported by any change in this entry.

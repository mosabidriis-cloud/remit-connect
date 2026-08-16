# Audit Trail

Canonical architecture for REOS v1.0 Production Readiness Phase 3: a real, persisted, append-only audit trail for operational actions. Closes DECISIONS.md **D-5**, blocked since Sprint 16 M4.2 on exactly this - "REOS creates audit records but stores none of them" (REPORTING_ARCHITECTURE.md Section 5.3).

## 1. Why This Exists

REPORTING_ARCHITECTURE.md Section 5.3 found the entire Audit report category permanently blocked: `TransactionProcessingAudit`, `ProofDownloadHistoryEntry`, and `SharedBatchReassignmentAudit` were all constructed by their respective services and then discarded - held only in component state, gone on unmount, never queried again. `branchProcessingQueueService.ts` - the live processing path - produced no audit object at all for `start`/`complete`/`return`/`on-hold`.

BUSINESS_RULES.md establishes the mandate: "REOS owns operational workflow and audit only" (Source of Truth), and the Operations Manager role explicitly "manages... audit" (Approved Roles). **Note on citation accuracy:** REPORTING_ARCHITECTURE.md, TECH_DEBT.md, and prior sessions quoted BUSINESS_RULES.md as stating "All business actions must be auditable" and "Audit logs are immutable" verbatim. On direct re-inspection of BUSINESS_RULES.md while designing this phase, neither phrase appears there verbatim - the actual text is the two lines quoted above. This does not change the conclusion (audit is still clearly a REOS-owned responsibility), but the exact wording previously attributed to BUSINESS_RULES.md should not be re-cited as a direct quote going forward.

D-5 was blocked specifically on persistence - "building one means introducing append-only state that must survive the actions it records... governed by DEC-004." Phase 2's completion (DEC-019/020/021) removed that blocker: REOS now has real Supabase-backed persistence and RLS everywhere it matters.

## 2. Design

**One audit vocabulary, not three.** Rather than separately persisting `TransactionProcessingAudit`/`ProofDownloadHistoryEntry`/`SharedBatchReassignmentAudit` as different shapes, `types/audit.ts` defines one `AuditEvent`/`AuditAction`/`AuditEntityType` vocabulary that every real business action maps onto. `ProofDownloadHistoryEntry` still exists and is still returned by `proofDownloadService.ts`'s functions (for the page's own inline download-history display - an unrelated, unchanged UI concern) but each of those functions now *also* calls `recordAuditEvent` directly, so the durable record and the page's transient display are two independent consumers of the same underlying action, not the same object serving two purposes.

**`recordAuditEvent` is called from services, never from pages.** Every real write path - `branchProcessingQueueService.ts`, `branchAssignmentService.ts`, `proofDownloadService.ts`, `liquidityService.ts`, `userService.ts` - calls `auditService.recordAuditEvent` directly, at the point of the write. This guarantees an action cannot ship an audit gap just because one of several call sites into it forgot to record one - there is exactly one call site per action, inside the function that performs it, matching "one owner per workflow."

**Actor role is resolved server-side, not client-supplied.** `RecordAuditEventInput` takes `actorUserId` but deliberately not `actorRole` - every audited action is performed by the currently-authenticated session, so `recordAuditEvent` calls `current_user_role()` (the same `SECURITY DEFINER` RPC RLS already trusts, AUTHENTICATION.md Section 3) to read the real role from `profiles` for the caller's own `auth.uid()`. A client cannot misreport its own role in its own audit record.

**A failed audit write never blocks the business action it describes.** The same non-blocking-additive-persistence precedent Import Intelligence established: a Supabase outage must not stop a Branch Officer from completing a transaction. `recordAuditEvent` never throws; failures are logged via `console.error` and retried (see Section 5).

## 3. Data Model

One table, `remit-connect` Supabase project:

```sql
audit_events (
  id text primary key
  actor_user_id text
  actor_role text
  action text                -- see AuditAction, types/audit.ts
  entity_type text           -- SHARED_BATCH | ASSIGNMENT | QUEUE_ITEM | BRANCH | PROOF | PAYOUT_ACCOUNT | FUNDING_EVENT | USER
  entity_id text
  branch_id text              -- nullable - not every action is branch-scoped
  details text
  performed_at timestamptz
  created_at timestamptz default now()
)
```

Write-once, insert-only. **No UPDATE/DELETE RLS policy exists on this table, by design** - an audit log that could be edited or removed after the fact is not an audit log.

## 4. RLS

- **SELECT**: `OPERATIONS_MANAGER` only - matches REPORTING_ARCHITECTURE.md Section 8.1's own stated default ("Audit reports, if D-5 is approved, should default to Operations Manager only"). Verified live: a Branch Officer's own read attempt against `audit_events` returns zero rows.
- **INSERT**: any authenticated REOS role, but `with check (actor_user_id = (select auth.uid()::text))` - a defense-in-depth guarantee beyond the app-level trust every other insert policy in this project relies on. A client can record an event for its own action only, never on another user's behalf, enforced at the database level regardless of what the client-side code sends.
- No UPDATE, no DELETE, for any role.

## 5. What Was Built

`types/audit.ts` (new), `services/auditService.ts` (new) - `recordAuditEvent`, `getAllAuditEvents`, `getAuditEventsByBranch` (the latter two unused by any report yet - see Section 7).

Every real business-action write path updated to call `recordAuditEvent`, with the minimum necessary signature changes to carry an actor where one wasn't already threaded through:

- `branchProcessingQueueService.ts`: `startBranchProcessingQueueItem` gained a `startedByUserId` parameter (previously took none); `updateBranchProcessingQueueItemStatus` gained an `actorUserId` parameter (the ON_HOLD path); `finalizeBranchProcessing` gained a `finalizedByUserId` parameter. `addProofToBranchProcessingQueueItem`/`completeBranchProcessingQueueItem`/`returnBranchProcessingQueueItem` already carried an actor id from Milestone 1/2 and needed no signature change. `BranchProcessingQueue.tsx`'s three call sites updated to pass `actorUserId` (already a prop on the component).
- `branchAssignmentService.ts`: `assignSharedBatchToBranch`/`reassignSharedBatch` both became `async` (previously pure/synchronous) to call Supabase; their three call sites (`SharedBatchUploadPage.tsx`, `BranchAssignmentPage.tsx` x2) gained `await`.
- `proofDownloadService.ts`: `markBatchDownloaded` became `async` (previously synchronous); its one call site (`ProofDownloadPage.tsx`) gained `await`. `downloadProofZip`/`downloadIndividualProof` were already `async`.
- `liquidityService.ts`: `addPayoutAccount`/`updatePayoutAccount`/`setPayoutAccountStatus`/`recordFunding` each gained an audit call at their existing write point - no signature change, all four already carried `actorUserId`. `deductForTransaction` is deliberately **not** separately audited - it is always called from `completeBranchProcessingQueueItem`, which already records `TRANSACTION_COMPLETED`; auditing both would record the same business action twice under two different names.
- `userService.ts`: `createUser` gained a new `actorUserId` parameter (its only call site, `UserCreatePage.tsx`, updated to source it from `useReosSession()`, which that page did not previously call at all). `updateUser` needed no new parameter - `UserUpdateInput.lastUpdatedBy` already carried the acting user's id.
- `SharedBatchUploadPage.tsx`: `BATCH_UPLOADED` and `BATCH_CONFIRMED` have no natural service-layer home (uploading and confirming are page-level orchestration over several services, not a single service function), so both are recorded directly in the page's own handlers - the one deliberate exception to "services record their own actions."

## 6. A Real Defect Found and Fixed During Implementation

`BATCH_CONFIRMED`'s first placement was gated behind the same guard that protects the (unrelated) Import Intelligence `persistImport` call: `if (!uploadedFile || !fileChecksum || !sharedBatch || !validationSummary || !session) { return; }`. `fileChecksum` is computed by a **background** promise kicked off at upload time ("off the interactive path," `computeFileChecksum(file).then(setFileChecksum)`) - if an operator confirms the upload before that promise resolves, the guard was already silently skipping `persistImport` (a pre-existing, previously-unnoticed gap in Import Intelligence recording), and adding the audit call at the same spot made it silently skip `BATCH_CONFIRMED` too. Fixed by moving the audit call to its own, narrower guard (`sharedBatch && session` only) - the confirmed-in-the-live-workflow fact does not depend on an unrelated Import Intelligence fingerprinting timing detail. The pre-existing Import Intelligence gap this surfaced is recorded in TECH_DEBT.md, not fixed here (out of this phase's scope - it's Import Intelligence's own contract, unrelated to auditing).

## 7. Verified, and What Is Not Yet Fully Verified

**Verified live in a browser, one continuous flow plus RLS checks:** payout account creation and funding, a new user created through the real Create User UI, a Shared Batch uploaded/confirmed/assigned, a transaction started/put on hold/resumed/proof-uploaded/completed, a second transaction started/returned, branch processing finalized, a proof individually downloaded and the batch marked downloaded by a Direct Remit Officer. 17 of 18 distinct `AuditAction` values were confirmed recorded with correct `actor_role` (server-resolved), `entity_type`/`entity_id`, and `branch_id` - `BATCH_REASSIGNED` was not separately exercised (see below). A Branch Officer's direct read attempt against `audit_events` was confirmed to return zero rows, proving the SELECT policy.

**Known gap, honestly recorded, not swept under the rug:** `USER_CREATED` was observed to intermittently - in several verification runs, consistently - not persist despite `createUser()` completing successfully and `recordAuditEvent` reporting no error in its own return value. Investigated at length: RLS itself is proven correct (the identical mechanism succeeds for 17 other action types, including several performed by the same Operations Manager session moments before and after); the acting role consistently resolves correctly when the call is observed directly; a retry (two attempts, 300ms then 1000ms delay) was added as a mitigation but did not reliably resolve it in repeated test runs. The suspected but unconfirmed cause is a timing interaction specific to recording an audit event immediately after an `admin-create-user` Edge Function call (the one action in this phase that involves a Supabase Admin API round trip, distinct from every other audited action). Not fixed - see TECH_DEBT.md. Every other of the 18 `AuditAction` values, including `USER_UPDATED` (no Edge Function involved), showed no such issue.

**Not separately verified in the browser pass:** `BATCH_REASSIGNED` - it shares `assignSharedBatchToBranch`'s exact code pattern (same function shape, same `recordAuditEvent` call site structure, already verified correct for `BATCH_ASSIGNED`) and was deprioritized under time constraints rather than genuinely at risk; confirmed correct by code review, not by driving the reassignment flow live.

## 8. Not Built - Deliberately Separate Scope

The Audit *report category* itself (Assignment History, Lifecycle History, Processing History, Proof Download History, User Activity - REPORTING_ARCHITECTURE.md Section 5.3's five originally-blocked reports) is not built in this phase. This phase persists the trail; building report *definitions* that read `getAllAuditEvents()`/`getAuditEventsByBranch()` through the Reporting Projection Layer is separate, downstream Reporting work, the same relationship every other store already has to Reporting.

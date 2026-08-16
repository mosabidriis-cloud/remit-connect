# Operational Persistence

Canonical architecture for REOS v1.0 Production Readiness Phase 2: migrating the live in-memory operational stores to Supabase-backed repositories, one module at a time, each independently verified. This document accumulates across Phase 2 milestones; each milestone gets its own numbered section.

## Guiding Rules (apply to every milestone in this phase)

- **Preserve interfaces.** Every store keeps its exact exported function names; only the implementation moves from a `Map`/array to Supabase queries, and every function becomes `async`. Callers change how they call (`await`), not what they call.
- **IDs are unchanged.** REOS already generates its own prefixed string ids client-side (`shared-batch-<uuid>`, `beneficiary-<n>-<uuid>`, `<sharedBatchId>-<branchId>-<timestamp>`). Tables use `id text primary key`, not `uuid`, so no id-generation code changes anywhere.
- **No new business logic.** Derived values that were computed from other in-memory data stay derived, not duplicated into new columns. Where a value was always a filter over another array in memory, it is a query over the corresponding table now - never a second stored copy that could drift from the source.
- **One store, one migration, one verification pass.** Each milestone migrates exactly one store's data, threads `await` through every real consumer, and is verified live in a browser before moving to the next. Never migrate two stores in the same pass - IMPORT_INTELLIGENCE.md Section 10 and TECH_DEBT.md both record this as the reason Phase 2 was deferred as its own initiative in the first place.

## Milestone 1: Shared Batch, Beneficiary, and Assignment Persistence

Migrates `sharedBatchStore.ts` - the most foundational operational store; everything downstream (Branch Processing, Proof Management, Reporting) reads through it.

### 1. Existing Architecture Review

- `SharedBatch.id`/`Beneficiary.id`/`Assignment.id` are all custom prefixed strings generated client-side (`excelValidationService.createBatchId`/`createBeneficiaryId`, `assignmentService.createAssignment`), never raw UUIDs - schema uses `text` primary keys.
- **`Assignment.assignedTransactions`/`manualReviewTransactions`/`invalidTransactions` are not independent data.** `assignmentService.createAssignment` builds them by filtering the batch's own `beneficiaries` array by `processingStatusId` at the moment of assignment - they are not separately mutated afterward anywhere in the codebase (confirmed by inspection: `processingStatusId` is set exactly once, at validation time, and never written again). Storing them as a second copy in `assignments` would be exactly the duplicate-data anti-pattern this project's engineering principles rule out. The `assignments` table therefore stores only the assignment record itself (branch, actor, timestamps, cached counts); the three transaction lists are reconstructed at read time by querying `beneficiaries` for the same `shared_batch_id`, filtered by `processing_status_id` - a view, not a copy, and incapable of drifting from its source by construction.
- **`Beneficiary.assignedBranchId` is dead for scoping purposes** - set to `null` at creation and never written again anywhere in the codebase (confirmed by inspection). `SharedBatch.assignedBranchId` and `Assignment.assignedBranchId` are the fields actually used for branch scoping everywhere in the app. RLS on `beneficiaries` therefore scopes through a join to `shared_batches.assigned_branch_id`, not through the beneficiary's own (unused) column.
- Every real consumer of `sharedBatchStore.ts`'s ten exports was enumerated by import search before writing any code: `branchProcessingQueueService.ts`, `SharedBatchUploadPage.tsx`, `ProofDownloadPage.tsx`, `BranchProcessingPage.tsx`, `BranchAssignmentPage.tsx`, `proofDownloadService.ts`, `reportingProjectionService.ts`. `reportingProjectionService.ts` was already async-first by design (REPORTING_PROJECTION_LAYER.md Section 9.1) specifically to absorb this migration for free - confirmed true: its two call sites only needed `await` added, nothing else.

### 2. Data Model

Three tables, `remit-connect` Supabase project:

```sql
shared_batches
  id text primary key
  reference text
  file_name text
  upload_date timestamptz
  uploaded_by_user_id text
  total_beneficiaries integer
  assigned_beneficiaries integer
  completed_beneficiaries integer
  returned_beneficiaries integer
  duplicate_reference_count integer
  manual_review_count integer
  assignment_status text            -- UNASSIGNED | ASSIGNED
  lifecycle_status text              -- ASSIGNED | PROCESSING | COMPLETED | READY_FOR_DOWNLOAD | DOWNLOADED
  assigned_branch_id text
  assigned_by_user_id text
  assigned_at timestamptz
  is_locked boolean
  last_reassigned_by_user_id text
  last_reassigned_at timestamptz
  last_reassignment_reason text
  created_at timestamptz default now()

beneficiaries
  id text primary key
  shared_batch_id text references shared_batches(id) on delete cascade
  direct_remit_reference text
  transaction_date date              -- null when absent/unparseable, same as the in-memory "" case
  beneficiary_name text
  currency text
  amount numeric
  destination_country text
  bank_name text
  account_number text
  processing_status_id text
  return_reason_id text
  receipt_uploaded boolean
  manual_review_required boolean
  manual_review_reason text
  created_at timestamptz default now()

assignments
  id text primary key
  shared_batch_id text references shared_batches(id) on delete cascade
  batch_reference text
  assigned_branch_id text
  assigned_branch_name text
  assigned_by text
  assigned_at timestamptz
  ready_transaction_count integer
  manual_review_count integer
  invalid_count integer
  status text                        -- PENDING | ASSIGNED
  created_at timestamptz default now()
```

Write pattern per table, matching the in-memory store's own semantics exactly:
- `shared_batches`: insert once at upload; update in place thereafter (lifecycle transitions, assignment, reassignment) - matches `saveSharedBatch`'s `Map.set` (always upsert).
- `beneficiaries`: insert once at upload, never updated - matches `saveBeneficiaries` being called exactly once per batch, and `processingStatusId` never mutating.
- `assignments`: upsert (insert on first assignment, update in place on reassignment, same `id`) - matches `saveAssignment`'s `Map.set`.

### 3. RLS

A second `SECURITY DEFINER` helper, `current_user_branch_id()`, alongside `current_user_role()` (AUTHENTICATION.md Section 3) - needed to scope a Branch Officer's reads to their own branch without a second RLS recursion path.

- **`shared_batches`**: SELECT/INSERT/UPDATE for `OPERATIONS_MANAGER`/`DIRECT_REMIT_OFFICER`; `BRANCH_OFFICER` SELECT/UPDATE scoped to `assigned_branch_id = current_user_branch_id()` (they read and advance the lifecycle of their own branch's batches during Branch Processing, never anyone else's - matches `BranchGate`, AUTHENTICATION.md Section 5). No DELETE policy - the app never deletes a Shared Batch.
- **`beneficiaries`**: SELECT scoped through a join to `shared_batches.assigned_branch_id` for `BRANCH_OFFICER`, open to `OPERATIONS_MANAGER`/`DIRECT_REMIT_OFFICER`; INSERT for `OPERATIONS_MANAGER`/`DIRECT_REMIT_OFFICER` only (write-once, at upload). No UPDATE/DELETE policy - the app never writes to a beneficiary row after creation.
- **`assignments`**: SELECT for all three roles (`BRANCH_OFFICER` scoped to `assigned_branch_id = current_user_branch_id()`); INSERT/UPDATE restricted to `OPERATIONS_MANAGER` only - matches `branchAssignmentService.ts`'s own enforcement (DEC-014) exactly, RLS as a second, independent layer behind it rather than the only one.

### 4. What Changes Where

`sharedBatchStore.ts` rewritten Supabase-backed, same ten exports, all now `async`. Every real consumer updated to `await`:
- `branchProcessingQueueService.ts`: `hydrateBranchProcessingQueue` and `finalizeBranchProcessing` become `async` (they call into the store); every other export in this file is untouched - its own queue-item state is Milestone 2, not this one.
- `proofDownloadService.ts`: `buildProofDownloadBatchFromSharedBatch` becomes `async` (calls `getAssignmentsByBranch`).
- `reportingProjectionService.ts`: two call sites gain `await` - no other change, confirming the async-first design paid off exactly as REPORTING_PROJECTION_LAYER.md Section 9.1 intended.
- `SharedBatchUploadPage.tsx`: writes were already inside `async` handlers; gains `await`.
- `BranchAssignmentPage.tsx`, `BranchProcessingPage.tsx`: previously read the store synchronously at render time (`getAllSharedBatches()`, `getAssignmentsByBranch()` called directly in the component body) - restructured to `useEffect`-driven fetches with loading state, the same pattern already used by every reporting page since Sprint 16.
- `ProofDownloadPage.tsx`: `getSharedBatch` was called synchronously in `useState`'s initializer - restructured to `useEffect`.
- `BranchProcessingQueue.tsx`: `hydrateBranchProcessingQueue` was called synchronously inside a bare `useMemo` with `setState` calls in its body - already a documented, pre-existing lint finding (TECH_DEBT.md, "Linting"). This migration forces the fix regardless, since a `useMemo` callback cannot be `async`: moved to a proper `useEffect`, closing that debt item as a side effect of this milestone, not a separate cleanup pass.

### 5. Decisions

DECISIONS.md **DEC-019** records the "views over stores, not duplicate copies" rule for `Assignment`'s transaction lists and the branch-scoping design, as the pattern every subsequent Phase 2 milestone follows.

### 6. Technical Debt Carried Forward

Recorded in TECH_DEBT.md as each milestone lands.

## Milestone 2: Branch Processing Queue and Proof Storage Persistence

Migrates `branchProcessingQueueService.ts` (queue-item state and branch-level lock status) and, inseparably, the proof-of-payment files those queue items carry. Treated as one milestone rather than two, by deliberate exception to "one store, one migration" (Guiding Rules above): queue-item state and its embedded `proofs` array are facets of the same entity, not independent domains like Shared Batch vs. Liquidity - splitting them would leave a "transaction shows COMPLETED but its proof is gone after reload" state, which violates the "no shortcuts, no placeholders" quality bar more than combining them violates the one-migration guideline.

### 1. Existing Architecture Review

- `ProofOfPayment.previewUrl` was generated via `URL.createObjectURL(file)` - a blob URL scoped to the browser tab that created it. It cannot survive a reload or a second session under any circumstances, independent of where the surrounding metadata lives. Real persistence therefore requires genuine Supabase Storage, not just a Postgres table for the metadata.
- `proofOfPaymentService.ts` was confirmed stateless (pure functions only, no module-level state) before this milestone - "Proof Management persistence" was never a separate store to migrate; the proof data is embedded on `BranchProcessingQueueItem.proofs`, owned entirely by `branchProcessingQueueService.ts`.
- `ReturnReason` is static reference data (`defaultReturnReasons`, a hardcoded array) - not operational data. A queue item persists only `return_reason_id`; the reason object itself is resolved against the in-memory catalog at read time, the same pattern already used for other reference data in this codebase.
- Every real consumer of `branchProcessingQueueService.ts` was enumerated before writing code: `BranchProcessingQueue.tsx`, `proofDownloadService.ts`, `reportingProjectionService.ts`, plus a type-only import from `types/reportingProjection.ts`.
- **`TransactionProcessingPage.tsx` was confirmed genuinely dead code and deleted in this milestone**, not merely flagged. It was mounted at `branches/:branchId/processing/:batchId/transactions/:transactionId` but the only `navigate()` calls into that route pattern were self-referential (the page navigating to its own next transaction); nothing else in the app - not the Sidebar, not `BranchProcessingQueue.tsx` (the live, properly-wired transaction UI) - ever linked to it. It carried its own parallel implementation of proof upload and transaction completion against a completely different in-memory model (`CreditToAccountTransaction`/`BranchProcessingBatch`, driven by React Router `location.state`, the exact anti-pattern Sprint 16 eliminated everywhere else). Migrating this milestone's proof upload to real Storage would have meant either building that integration twice or leaving an unreachable page silently broken; deleting it was the correct call under "avoid duplicate services/business logic/parallel implementations," not scope creep. Removed with it, confirmed exclusively used by the deleted page: `TransactionCard.tsx`, `ProcessingProgress.tsx`, and the now-orphaned functions/types in `transactionProcessingService.ts`/`types/transactionProcessing.ts` (`addProofToTransaction`, `completeTransaction`, `returnTransaction`, `getNextTransactionIndex`, `TransactionProcessingAudit`, `TransactionAuditAction`, `ReturnTransactionInput`). `defaultReturnReasons`/`getActiveReturnReasons` and `CreditToAccountTransaction`/`CreditToAccountTransactionStatus`/`BranchProcessingBatch` remain - still used by the live `BranchProcessingQueue.tsx`, `proofDownloadService.ts`, `reportService.ts`, `ReportTable.tsx`, and `dashboard.ts` respectively.

### 2. Data Model

Two tables plus a private Storage bucket, `remit-connect` Supabase project:

```sql
branch_processing_queue_items
  id text primary key                -- "<assignmentId>-<beneficiaryId>", same composite id as the in-memory version
  assignment_id text references assignments(id) on delete cascade
  branch_id text
  beneficiary_id text references beneficiaries(id) on delete cascade
  status text                        -- ASSIGNED | IN_PROGRESS | COMPLETED | ON_HOLD | RETURNED
  return_reason_id text              -- looked up against the static defaultReturnReasons catalog at read time
  return_comment text
  started_at timestamptz
  completed_at timestamptz
  completed_by_user_id text
  returned_at timestamptz
  returned_by_user_id text
  payout_account_id text             -- plain reference, not a FK - Liquidity Management is still in-memory (Milestone 3)
  created_at timestamptz default now()

proofs
  id text primary key
  queue_item_id text references branch_processing_queue_items(id) on delete cascade
  file_name text
  file_type text
  file_size integer
  storage_path text                  -- path within the proof-of-payment bucket - the durable reference
  uploaded_by_user_id text
  uploaded_at timestamptz
  expires_at timestamptz             -- the 90-minute business-domain TEMPORARY -> EXPIRED window, unrelated to the Storage signed URL's own short TTL
  status text                        -- TEMPORARY | DOWNLOADED | EXPIRED
  created_at timestamptz default now()

branch_processing_status
  branch_id text primary key
  status text                        -- PROCESSING | COMPLETED
  created_at timestamptz default now()
```

`branch_processing_status` did not appear in the original design draft - the branch-level PROCESSING/COMPLETED lock (previously `branchProcessingStatusState`, an in-memory `Map<branchId, status>`) is genuinely separate state from any one queue item, not derivable from them (a branch with every item terminal is *eligible* to finalize, not automatically locked - `finalizeBranchProcessing` is a distinct write). A branch with no row here defaults to `PROCESSING`, matching the Map's prior default for an unseen key.

`previewUrl` is never a column - it is a signed URL generated fresh on every read (`proofOfPaymentService.createSignedProofUrl`/`createSignedProofUrls`, batched one Storage call per read rather than one per proof), consistent with the bucket being private.

Storage bucket `proof-of-payment`: private (`public: false`). Object path convention: `<queueItemId>/<proofId>-<sanitizedFileName>`.

### 3. RLS

Reuses `current_user_role()` and `current_user_branch_id()` (Milestone 1) - no new SQL functions.

- **`branch_processing_queue_items`**: SELECT for `OPERATIONS_MANAGER` (all) and `DIRECT_REMIT_OFFICER` (all - needed to build the Proof Download view, which reads through `getBranchProcessingQueue`); `BRANCH_OFFICER` scoped to `branch_id = current_user_branch_id()`. INSERT/UPDATE for `OPERATIONS_MANAGER` and `BRANCH_OFFICER` (own branch) only - `DIRECT_REMIT_OFFICER` never writes here, matching BUSINESS_RULES.md ("does not process branch transactions"). Deliberately tighter than Milestone 1's `shared_batches` (which grants `DIRECT_REMIT_OFFICER` write too) - reasoned per-table from actual route access (AUTHENTICATION.md Section 6: `BranchGate` admits `OPERATIONS_MANAGER`/`BRANCH_OFFICER`, not `DIRECT_REMIT_OFFICER`), not copied from the nearest existing policy.
- **`proofs`**: SELECT for `OPERATIONS_MANAGER`/`DIRECT_REMIT_OFFICER` (all); `BRANCH_OFFICER` via a join to `branch_processing_queue_items.branch_id`. INSERT for `OPERATIONS_MANAGER`/`BRANCH_OFFICER` (own branch, via the same join) - uploading is a Branch Officer action. UPDATE for `OPERATIONS_MANAGER`/`DIRECT_REMIT_OFFICER` - the only write is `markBatchDownloaded`-adjacent status changes during proof download, a Direct Remit Officer action (the function itself, `proofOfPaymentService.markProofDownloaded`, remains orphaned/unwired - pre-existing, TECH_DEBT.md).
- **`branch_processing_status`**: SELECT/write for `OPERATIONS_MANAGER` (all) and `BRANCH_OFFICER` (own branch). `DIRECT_REMIT_OFFICER` has no access - nothing they do depends on branch-level lock status.
- **Storage (`storage.objects`, bucket `proof-of-payment`)**: SELECT and INSERT for all three authenticated roles. Branch-level scoping is not enforced at the Storage layer (unlike the table policies above) - doing so would require parsing the object path inside the policy for a single-tenant internal app where the table-level RLS above already correctly scopes the metadata; the same permissive-to-authenticated-REOS-roles pattern already used elsewhere when finer scoping wasn't clearly warranted. No UPDATE/DELETE policy - proofs are never edited or deleted through the app today (the same "no DELETE policy" state as every other write-once table in this system; proof expiry, TECH_DEBT.md, is enforced nowhere yet, so nothing needs to delete a Storage object).

### 4. What Changes Where

`branchProcessingQueueService.ts` rewritten Supabase-backed. Every export keeps its exact name; every export becomes `async`, **except one deliberate signature change**:

- `addProofToBranchProcessingQueueItem(itemId, proof: ProofOfPayment)` → `addProofToBranchProcessingQueueItem(itemId, file: File, uploadedByUserId: string): Promise<BranchProcessingQueueItem>`. The old shape took an already-built `ProofOfPayment` object; a real Storage upload needs the file's actual bytes, which a pre-built metadata object cannot carry. This is the one place in Milestone 2 where "preserve interfaces wherever possible" gives way to a genuine external constraint (real byte upload has to happen somewhere), not a redesign of choice.
- `proofOfPaymentService.ts`: `createProofOfPayment` (pure, blob-URL-producing) replaced by `uploadProofOfPayment` (async, performs the real Storage upload, returns a `ProofOfPayment` with a real `storagePath` and a freshly signed `previewUrl`) plus `createSignedProofUrl`/`createSignedProofUrls`. `createProofMetadata` and `markProofDownloaded` are untouched (both remain orphaned, pre-existing).
- `types/proofOfPayment.ts`: `ProofOfPayment` gains a required `storagePath: string` field - additive, not breaking, since every real proof now maps 1:1 to a `proofs` row.
- `getBranchProcessingQueueSummary` reads only the `status` column (not full item hydration) - a deliberate optimization, since a summary needs counts, not beneficiaries/proofs/signed URLs, and this function is called on every dashboard/report refresh via `reportingProjectionService.ts`.
- `BranchProcessingQueue.tsx`: every synchronous read (`getBranchProcessingQueueSummary`, `isBranchProcessingComplete`, `getReservedAmountForAccount` inside a `useMemo`) restructured to `useEffect`-driven state, the same pattern Milestone 1 established. One new lint consideration handled directly: an effect with an early-exit branch that would otherwise call `setState` synchronously before any `await` now defers past the first microtask (`await Promise.resolve()`) unconditionally, so every `setState` call in that effect is reachable only after an `await` - satisfies `react-hooks/set-state-in-effect` without changing behavior.
- `proofDownloadService.ts`: `buildProofDownloadBatchFromSharedBatch` awaits `getBranchProcessingQueue` (now async). `fetchProofBytes`'s `fetch(proof.previewUrl)` needed no change - a signed HTTPS URL fetches exactly like a blob URL did.
- `reportingProjectionService.ts`: every call site of `getAllBranchProcessingQueueItems`, `getBranchProcessingQueueSummary`, `getBranchProcessingStatus`, `getReservedAmountForAccount` gains `await`; `projectLiquidityAccounts`/`projectLiquidityBranches` (which call `getReservedAmountForAccount` per account, now async) restructured from a synchronous `.map` to `Promise.all`. No projection's *shape* changed - only how its inputs are fetched.
- `AppRoutes.tsx`: the `TransactionProcessingPage` route removed along with the file.

### 5. Decisions

DECISIONS.md **DEC-020** records: the decision to migrate Branch Processing queue state and proof Storage together as one milestone; the `addProofToBranchProcessingQueueItem` signature change and why it was necessary rather than avoidable; the deletion of `TransactionProcessingPage.tsx` and its exclusively-used dependents as confirmed dead code, not a speculative cleanup.

### 6. Technical Debt Carried Forward

- **`branch_processing_status` is a one-way lock with no reset path** - once a branch is finalized to `COMPLETED`, nothing in the codebase ever writes it back to `PROCESSING`, so a second batch assigned to the same branch on a later day would find it permanently locked. This is not a Milestone 2 regression - the original in-memory `branchProcessingStatusState` Map had the exact same one-way semantics (a process restart was its only reset, which is not a real operational reset either). Whether a branch's lock should ever clear for a new processing cycle is a business-workflow question, not an engineering one - not decided here.
- Signed URL TTL (1 hour, `proofOfPaymentService.ts`) is a Storage-access mechanism only, distinct from the business-domain 90-minute `TEMPORARY -> EXPIRED` window on `proofs.expires_at`. Neither is enforced against the other today - proof expiry enforcement remains unimplemented (carried forward from before this milestone).
- No Storage DELETE policy exists for the `proof-of-payment` bucket - consistent with proof expiry/deletion being unimplemented; will need revisiting together if/when expiry enforcement is built.
- RLS scoping for `storage.objects` is role-based only, not branch-scoped (see Section 3) - acceptable for a single-tenant internal app today, worth reconsidering if REOS ever needs per-branch Storage isolation.

## Milestone 3: Liquidity Management Persistence

Migrates `liquidityStore.ts` (`PayoutAccount`, `FundingEvent`) - the last Phase 2 store. Closes Phase 2 entirely: every live REOS operational store is now Supabase-backed.

### 1. Existing Architecture Review

- `liquidityStore.ts` (pure storage, `Map`-based) and `liquidityService.ts` (business logic, validation, and the only writers of `PayoutAccount.currentBalance`) were already cleanly separated before this milestone - the same separation `sharedBatchStore.ts` has from `branchAssignmentService.ts`/`assignmentService.ts`. Preserved exactly: `liquidityStore.ts` becomes Supabase-backed, `liquidityService.ts`'s business logic is untouched except for `await`.
- Every real consumer was enumerated before writing code: `branchProcessingQueueService.ts` (`deductForTransaction`, the one real balance deduction, called from `completeBranchProcessingQueueItem`), `BranchProcessingQueue.tsx` (`getPayoutAccountsByBranch`, for the Start Processing account picker), `reportingProjectionService.ts` (`getAllPayoutAccounts`/`getAllFundingEvents`, already async-first by design), `PayoutAccountManager.tsx` and `FundingRecorder.tsx` (every write path: `addPayoutAccount`, `updatePayoutAccount`, `setPayoutAccountStatus`, `recordFunding`).
- **`FundingEntry` has no id of its own in `types/liquidity.ts`** - it is a value list embedded on `FundingEvent`, written once alongside its parent and never independently addressed. `funding_entries` therefore has its own synthetic identity-column primary key (nothing else needed one), and entries are reconstructed at read time by querying for the parent event's id - the same "child rows, not a duplicate copy" shape Milestone 1 established for Assignment's transaction lists.
- **`PayoutAccountManager.tsx`/`FundingRecorder.tsx` read their data synchronously during render** (`const accounts = getPayoutAccountsByBranch(branchId)`), relying on a shared `refreshSignal` counter the parent page (`LiquidityManagementPage.tsx`) already bumped after either sibling wrote, to force both to re-render and re-read the in-memory store fresh. Becoming `async` breaks the "re-read during render" half of that pattern; the fix keeps the same signal but passes it down as an explicit prop, driving each sibling's own data-fetching `useEffect` - the counter's *purpose* (both children observably back in sync after either writes) is unchanged, only its mechanism.

### 2. Data Model

Three tables, `remit-connect` Supabase project:

```sql
payout_accounts
  id text primary key
  branch_id text
  bank text
  account_number text
  currency text
  current_balance numeric
  minimum_threshold numeric
  status text                        -- ACTIVE | INACTIVE
  last_updated_at timestamptz
  last_updated_by_user_id text
  created_at timestamptz default now()

funding_events
  id text primary key
  branch_id text
  total_amount numeric
  updated_by_user_id text
  updated_at timestamptz
  reference text
  notes text
  created_at timestamptz default now()

funding_entries
  id bigint generated always as identity primary key   -- synthetic; FundingEntry has no id of its own
  funding_event_id text references funding_events(id) on delete cascade
  account_id text references payout_accounts(id) on delete cascade
  previous_balance numeric
  funding_amount numeric
  new_balance numeric
```

Write pattern, matching the in-memory store's own semantics exactly: `payout_accounts` upserts on every write (`savePayoutAccount`, called by all five business-logic functions - creation and every balance/identity change alike); `funding_events`/`funding_entries` insert once, together, at `recordFunding` - never updated afterward, matching the original `Map.set` being the only write either ever received.

### 3. RLS

Reuses `current_user_role()`/`current_user_branch_id()` - no new SQL functions.

- **`payout_accounts`**: SELECT for `OPERATIONS_MANAGER` (all) and `BRANCH_OFFICER` (own branch - needed for the Start Processing account picker, `/reos/liquidity` itself stays Operations-Manager-only at the route level). UPDATE for `OPERATIONS_MANAGER` (all) and `BRANCH_OFFICER` (own branch) - `deductForTransaction` is a genuine Branch Officer write path, called during transaction completion. **INSERT for `OPERATIONS_MANAGER` and `BRANCH_OFFICER` (own branch) both**, which looks broader than the UI needs (only `addPayoutAccount`, an Operations-Manager-only action, truly inserts a new row) - required because `savePayoutAccount` always issues a Postgres `UPSERT` (`INSERT ... ON CONFLICT DO UPDATE`), and Postgres evaluates the INSERT policy for an upsert regardless of whether the row already exists and the statement ends up updating it. Splitting `savePayoutAccount` into separate insert-only and update-only code paths purely to narrow this policy was judged not worth the interface change for a single-tenant internal app already trusting branch-scoped writes at this same broad grain elsewhere (`branch_processing_queue_items`, Milestone 2). No DELETE policy - the app never deletes a payout account.
- **`funding_events`/`funding_entries`**: SELECT/INSERT for `OPERATIONS_MANAGER` only - `FundingRecorder.tsx` only renders on the Operations-Manager-only `/reos/liquidity` route, and no Branch Officer or Direct Remit Officer action ever reads or writes funding history directly (Reports/Dashboard, which do read it via `reportingProjectionService.ts`, are themselves Operations-Manager-only routes). No UPDATE/DELETE policy - the app never edits or deletes a funding event.

### 4. What Changes Where

`liquidityStore.ts` rewritten Supabase-backed, same eight exports, all now `async`. `liquidityService.ts`'s business logic is unchanged - every validation rule, every error message, the exact sequencing of `recordFunding`'s per-entry processing (deliberately kept as a sequential `for` loop, not `Promise.all`, so a request that named the same account twice would still see the second entry's read reflect the first entry's write, matching the in-memory version's behavior by construction) - only `await` was added.

Every real consumer updated:
- `branchProcessingQueueService.ts`: the one `deductForTransaction` call site gains `await`.
- `reportingProjectionService.ts`: `getAllPayoutAccounts`/`getAllFundingEvents` call sites gain `await` - no other change, the same "async-first design pays off" outcome Milestone 1 recorded for this file.
- `BranchProcessingQueue.tsx`: `getPayoutAccountsByBranch` inside the existing `eligiblePayoutAccounts` effect (Milestone 2) gains `await`; `selectedPayoutAccount`, previously a synchronous derived `const` computed in the render body, is restructured into its own state + `useEffect`, using the same "defer every path past an `await`" shape Milestone 2 established to avoid a `set-state-in-effect` finding on its early-exit branch.
- `PayoutAccountManager.tsx`/`FundingRecorder.tsx`: every synchronous store read moves to `useEffect`-driven state; `LiquidityManagementPage.tsx`'s `refreshSignal` is now passed down as an explicit prop (see Section 1) rather than only forcing a parent re-render.

### 5. Decisions

DECISIONS.md **DEC-021** records the completion of Phase 2, the `payout_accounts` INSERT-policy widening rationale (a Postgres upsert mechanics constraint, not a deliberate authorization broadening), and the `refreshSignal`-as-prop restructuring.

### 6. Technical Debt Carried Forward

- **`payout_accounts` INSERT policy is broader than the UI's own intent** (Section 3) - a Branch Officer can, via a crafted request bypassing the UI, create a new payout account for their own branch, something only Operations Manager can do through the app. Splitting `savePayoutAccount`'s upsert into insert-only/update-only paths would close this precisely; not done here, consistent with the same trust grain already accepted for `branch_processing_queue_items` in Milestone 2.
- **Phase 2 is now complete** - no REOS operational store remains in-memory-only except reference data that was never meant to persist (`defaultReturnReasons`, static). Phase 3 (audit trail) and Phase 4 (production hardening) are next.

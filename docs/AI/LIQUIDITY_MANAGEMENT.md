# Liquidity Management

Canonical architecture specification for REOS's Operational Liquidity Management module. Written before any implementation code, per the approved workflow for this module.

## 1. Purpose

Liquidity Management tracks the cash REOS branches actually hold and pay out with. Every Branch Officer completing a Credit-to-Account transaction draws that payout from a specific bank account the branch controls; this module is the record of what each of those accounts holds, how it was funded, and how live transaction processing consumes it. It answers three operational questions: how much can a branch pay out right now, which account should fund the next transaction, and when does a branch need more cash.

It is **not** a treasury or approval system. Funding a branch's accounts happens outside REOS (a real bank transfer, a cash delivery - REOS does not move money); this module only records that it happened, the same way Proof Management records a payment REOS did not itself make.

## 2. Scope

In scope:
- Payout accounts owned by a branch (bank, account number, currency, balance, status).
- Manual funding events that increase an account's balance, with full history.
- Live balance consumption when Branch Processing completes a transaction.
- Reporting and a dedicated dashboard over the above, through the existing Reporting Projection Layer.

Out of scope (unchanged REOS boundaries, BUSINESS_RULES.md):
- Treasury, Cash Pickup, Banking Core, approval workflows.
- Any persistence beyond the existing in-memory architecture (DEC-004).
- Funding REOS does not perform - REOS only records that funding arrived.
- Financial reporting (revenue, FX margin, commission). Account balances are an **operational capacity** metric - "can this branch pay out?" - not a financial one; see Section 13 for why this is not the same class of number BUSINESS_RULES.md excludes.

## 3. Existing Architecture Review

Before any code was written, the following was read in full: `src/pages/branches/`, `src/pages/treasury/`, `src/pages/funding/`, and their services and types (`src/services/branchService.ts`, `treasuryService.ts`, `fundingRequestService.ts`; `src/types/Branch.ts`, `Treasury.ts`, `FundingRequest.ts`, `SharedBatch.ts`).

**Finding: a complete, separate Branch Liquidity / Treasury / Funding system already exists, entirely outside REOS.**

- `src/types/Branch.ts` - `Branch` (numeric `id`) with one aggregate `BranchLiquidity` (`usdBalance`, `sdgBalance`, `liquidityLimit`, `minimumThreshold`, `availableLiquidity`, `health: "Healthy"|"Warning"|"Critical"`). No per-account breakdown - a branch has one balance, not N accounts.
- `src/services/branchService.ts` - a hardcoded array of 12 fictional branches (`branchSeeds`, invented managers/phones/emails), `export const branches: Branch[] = ...`. Static seed data, not derived from anything operational.
- `src/types/Treasury.ts` + `src/services/treasuryService.ts` / `src/pages/treasury/TreasuryPage.tsx` - an **approval-gated** funding request workflow: a branch requests funds, Treasury approves or rejects.
- `src/types/FundingRequest.ts` + `src/services/fundingRequestService.ts` / `src/pages/funding/FundingRequestPage.tsx` - a funding **execution** queue (`Pending -> Sent -> Received -> Available`), also disconnected from any real transaction.
- `src/types/SharedBatch.ts` - this tree even has its **own, separate, disconnected `SharedBatch` concept** (numeric ids, `"Direct Remit Excel"` source, its own transaction list) - unrelated to REOS's real `sharedBatchStore`/`excelValidationService`.

**Conclusion: this is a self-contained, mocked prototype for a different problem, not a system this module should extend.** Three concrete reasons, not a preference:

1. **Different grain.** The legacy system tracks one liquidity figure per branch. The approved model for this module is per-**account** (bank + account number + currency + balance), which the legacy `BranchLiquidity` type cannot represent without a redesign of a system this module does not own.
2. **Different business process.** The legacy system is approval-gated (Treasury approves/rejects a request). The approved model here is explicitly **not**: "Treasury approval workflow is NOT used... No approval. No pending state. No treasury queue." Reusing the legacy service would import a workflow this module is specifically told not to have.
3. **Different data reality.** The legacy system runs entirely on hardcoded seed data with no connection to any real operational entity. This module's entire purpose is the opposite: live balances consumed by real Branch Processing completions, feeding the real Reporting Projection Layer.
4. **Module boundary.** ARCHITECTURE.md: REOS "does not own... Application layout outside REOS." The legacy tree lives under its own `MainLayout`, entirely outside `src/features/reos/`. Building this module against it would cross a boundary that already exists for a reason - and the reverse: nothing outside REOS may depend on REOS.

**What genuinely is reused, per "if existing modules already solve part of this, extend them":** REOS already has an unused `types/branch.ts` (`Branch`: `id`, `code`, `name`, `city`, `state`, `status`) - defined for exactly this purpose but never backed by a registry (REPORTING_ARCHITECTURE.md Decision D-7 recorded this gap: "no branch registry service exists"). This module adds the minimal registry D-7 was waiting for, seeded with the same branch ids REOS's Assignment flow already uses (`PORT_SUDAN`, `KASSALA`, `DONGOLA`, `KOSTI` - `BranchAssignmentPanel.tsx`), not a new invented set. This closes part of D-7 as a side effect, not a goal.

## 4. Dependency Map

```
                    liquidityStore.ts (NEW)
                    PayoutAccount, FundingEvent - owned here
                            |
              +-------------+-------------+
              v                           v
      liquidityService.ts (NEW)    reportingProjectionService.ts (EXTENDED)
      add/edit/disable account,    projectLiquidityAccounts,
      recordFunding, deductForTransaction   projectFundingEvents
              ^                           |
              | (one call: deduct)        v
   branchProcessingQueueService.ts   reportService.ts (EXTENDED)     liquidityDashboardService.ts (NEW)
   (EXTENDED: payoutAccountId,             |                                    |
   startBranchProcessingQueueItem,         v                                    v
   getReservedAmountForAccount)      ReportsPage.tsx (unmodified,      LiquidityDashboardPage.tsx (NEW)
              ^                       consumes new definitions)
              |
   BranchProcessingQueue.tsx (EXTENDED: account selector)

   branchRegistryService.ts (NEW, closes part of D-7)
              ^
              | read by
   LiquidityManagementPage.tsx (NEW), liquidityDashboardService.ts
```

Direction of dependency matches REPORTING_PROJECTION_LAYER.md exactly: operational modules (`liquidityService`, `branchProcessingQueueService`) never import the projection layer or `reportService`/`dashboardService`; the projection layer reads operational modules; report/dashboard services read only the projection layer.

**The one new cross-module call**: `branchProcessingQueueService.completeBranchProcessingQueueItem` calls `liquidityService.deductForTransaction` once, synchronously, in the same function that already marks a transaction `COMPLETED` - the same pattern `hydrateBranchProcessingQueue` already uses calling `sharedBatchStore.updateSharedBatchLifecycleStatus`. No new dependency direction is introduced; an existing one-service-calls-another precedent is reused.

## 5. Ownership Matrix

| Data | Owning module | Owning store | Written by |
|---|---|---|---|
| Payout account identity, bank, account number, currency, status, minimum threshold | Liquidity Management | `liquidityStore.ts` | `liquidityService.ts` only |
| Payout account `currentBalance` | Liquidity Management | `liquidityStore.ts` | `liquidityService.recordFunding` (increase) and `liquidityService.deductForTransaction` (decrease, called only from `branchProcessingQueueService.completeBranchProcessingQueueItem`) |
| Funding events / history | Liquidity Management | `liquidityStore.ts` | `liquidityService.recordFunding` only |
| Which account a transaction draws from (`payoutAccountId`) | Branch Processing | `branchProcessingQueueService.ts`'s queue state | `branchProcessingQueueService.startBranchProcessingQueueItem` only |
| "Reserved" amount per account (in-flight, not yet completed) | Branch Processing | derived, not stored | computed on read from queue state (`getReservedAmountForAccount`) - never persisted, so it can never drift from the queue |
| Branch identity (id, name) | Liquidity Management (new registry) | `branchRegistryService.ts` | static seed, matches ids already used by `BranchAssignmentPanel.tsx` |
| Liquidity projections (account, branch, funding, consumption) | Reporting | `types/reportingProjection.ts` + `reportingProjectionService.ts` | read-only, reprojected on every call, never stored |

One owner per concern, matching every other REOS module.

## 6. Domain Model

```
PayoutAccount
  id, branchId, bank, accountNumber, currency
  currentBalance          - the only stored balance; everything else is derived
  minimumThreshold
  status: ACTIVE | INACTIVE
  lastUpdatedAt, lastUpdatedByUserId

FundingEvent
  id, branchId
  entries: [{ accountId, previousBalance, fundingAmount, newBalance }]  - one event may fund 1..N accounts
  totalAmount
  updatedByUserId, updatedAt
  reference (optional), notes (optional)

BranchProcessingQueueItem (EXTENDED, not duplicated)
  ...existing fields (Sprint 13-17)...
  payoutAccountId: string | null   - NEW. Set once, at Start Processing.
```

No `LiquidityConsumption` or `LiquidityReservation` entity is introduced. Both are **derived, not stored** - see Section 7. Storing them would duplicate what `BranchProcessingQueueItem` already is the source of truth for, exactly the class of duplication ARCHITECTURE.md and this session's history (Sprint 13's duplicate status machine) exist to prevent.

## 7. Workflow

### 7.1 Live consumption (the approved flow, as implemented)

```
Upload -> Assignment -> Branch Processing
                              |
                    Operator opens a transaction (ASSIGNED)
                              |
                    Operator selects a payout account
                    (only accounts with sufficient AVAILABLE
                     balance are offered)
                              |
                    Start Processing -> status IN_PROGRESS,
                    payoutAccountId set on the queue item.
                    No balance changes yet - the amount is
                    now "reserved" (Section 7.2), not deducted.
                              |
                    Proof uploaded
                              |
                    Complete -> the ONE moment a real deduction
                    happens: liquidityService.deductForTransaction
                    is called, currentBalance decreases, status
                    becomes COMPLETED.
                              |
                    Dashboard / Reports reflect the new balance
                    on their next read (no caching, same as
                    every other REOS projection).
```

**Why deduction happens at Complete, not at account selection.** The existing state machine (`canTransitionToStatus`) has no path back out of `COMPLETED`, but `IN_PROGRESS -> RETURNED` is a real, frequent path. If the balance were deducted at selection time, a returned transaction would require a reversal - new state, new failure modes, nothing else in REOS has this shape. Deducting once, at the one truly terminal, irreversible transition, needs no reversal logic at all: a returned transaction simply never reached the deduction point.

### 7.2 Reserved liquidity is computed, never stored

"Reserved" for an account is the sum of `beneficiary.amount` across that account's `IN_PROGRESS` queue items, computed live from `branchProcessingQueueService`'s own state (`getReservedAmountForAccount`, a read-only export following the exact shape of the existing `getBranchProcessingQueueSummary`). It updates the instant a transaction's status changes, because it is not a separate fact that could go stale - it **is** the queue.

- **Current Balance** = `PayoutAccount.currentBalance` (real, only changes at funding or completion).
- **Reserved Balance** (per account) = live sum described above.
- **Available Balance** = Current − Reserved. This is what a new transaction may draw against.
- **Projected Balance** = the same number as Available, presented at the point a transaction is about to be assigned an account - "what this account will hold once in-flight work completes." Not a second calculation.
- **Branch Total / Reserved / Available** = the same three figures summed across the branch's `ACTIVE` accounts.
- **Pending Processing** = sum of amounts for `ASSIGNED` (not yet started, no account chosen) items in the branch - work that exists but has not yet committed to an account.
- **Remaining Liquidity** = the branch's Available figure, the name used on the Dashboard.

No number here is computed twice by two different pieces of code. `reportingProjectionService.ts` and `branchProcessingQueueService.startBranchProcessingQueueItem`'s own account-sufficiency check both call the same `getReservedAmountForAccount` export.

### 7.3 Funding (manual, no approval)

```
Operations Manager opens Liquidity Management
        |
Selects a branch
        |
Selects one or more accounts, enters an amount for each
        |
Submits - liquidityService.recordFunding runs once per account:
  previousBalance recorded, currentBalance increased,
  one FundingEntry built
        |
One FundingEvent is stored (covering every account touched),
with an optional reference and notes
        |
Dashboard and Reports reflect the new balances and the funding
event on their next read
```

No pending state, no approval step, no queue - matching the instruction exactly. This is a deliberate, narrower flow than the legacy Treasury/FundingRequest system (Section 3): it records that funding already happened, it does not decide whether it should.

### 7.4 Account lifecycle

Add account -> Edit (bank, account number, currency, minimum threshold - never balance directly) -> Disable (status `INACTIVE`; excluded from new account selection and from Total/Available sums, but its history and current balance remain visible - disabling is not deletion). No approvals, per the instruction.

## 8. Data Model (types)

New file `src/features/reos/types/liquidity.ts`:

```ts
export type PayoutAccountStatus = "ACTIVE" | "INACTIVE";

export interface PayoutAccount {
  id: string;
  branchId: string;
  bank: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  minimumThreshold: number;
  status: PayoutAccountStatus;
  lastUpdatedAt: string;
  lastUpdatedByUserId: string;
}

export interface FundingEntry {
  accountId: string;
  previousBalance: number;
  fundingAmount: number;
  newBalance: number;
}

export interface FundingEvent {
  id: string;
  branchId: string;
  entries: FundingEntry[];
  totalAmount: number;
  updatedByUserId: string;
  updatedAt: string;
  reference: string | null;
  notes: string | null;
}
```

Health reuses the existing `BranchHealth` vocabulary (`types/dashboard.ts`: `"GREEN" | "YELLOW" | "RED"`) rather than inventing a second one (the legacy system's `"Healthy"|"Warning"|"Critical"` is exactly the kind of second vocabulary this module avoids).

`BranchProcessingQueueItem` gains one field, `payoutAccountId: string | null` - see Section 6.

## 9. UI

New pages, built from REOS's existing component kit (`theme.ts`, `common/PageContainer`, `PageHeader`, `DataTable`, `KpiCard`, `EmptyState`) - no import from the legacy `src/pages/**` UI kit (`MainLayout`, `Card`, `Button`), consistent with Section 3's boundary finding.

- **`LiquidityManagementPage.tsx`** (`/reos/liquidity`) - branch selector, account list (add / edit / disable), funding recording form, funding history table. Operations Manager and Branch Officer both operate here (per the approved model, "Branch users can Add account... Record funding received" - though funding recording is scripted to the Operations Manager actor per Section 7.3's "Operations Manager records funding received").
- **`LiquidityDashboardPage.tsx`** (`/reos/liquidity/dashboard`) - see Section 10.
- **Branch Processing integration** - `BranchProcessingQueue.tsx` gains an account selector at the "Start Processing" action, offering only accounts with sufficient available balance; no new page.

## 10. Dashboard

`liquidityDashboardService.ts` (new, mirrors `dashboardService.ts`'s existing pattern - a pure function from projections to a view model, no store access of its own) assembles:

- Per branch: Total Liquidity, Available Liquidity, Reserved Liquidity, Health, Consumption Today, Funding Today.
- Per account (within a branch): bank, account number, currency, current balance, reserved, available, minimum threshold, health.
- Enterprise-wide: Critical Branches, Low Balance Branches, Largest Branch, Largest Account, Funding History (recent).
- Outstanding Liquidity: enterprise-wide Total Liquidity across all branches.

Same rule as every existing dashboard: reuses `reportingProjectionService`'s liquidity projections, never recomputes a sum the projection layer already produced.

## 11. Reports

Six new `ReportType` values, one new `ReportCategory` (`"LIQUIDITY"` - additive; does not touch the pending D-1 Volume/Performance/Audit decision), served by two new projection grains:

| Report | Grain | Projection |
|---|---|---|
| Branch Liquidity | one branch | `LiquidityBranchProjection` |
| Daily Consumption | one branch | `LiquidityBranchProjection` (narrowed/sorted by `consumptionToday`) |
| Account Balances | one account | `LiquidityAccountProjection` |
| Low Balance Accounts | one account | `LiquidityAccountProjection` (filtered, health != GREEN) |
| Liquidity Exceptions | one account | `LiquidityAccountProjection` (filtered, health == RED) |
| Funding History | one funding event | `FundingEventProjection` |

Same pattern Sprint 16/17 already established for "narrowed variant of the same projection" (e.g. Ready-For-Download / Downloaded Batches both reuse `BatchReportProjection`) - no second report engine, no per-report filtering logic outside `reportService.matchesFilters`.

## 12. Future Persistence

Unaffected by DEC-004: this module is in-memory only, like every other REOS store, and will be lost on reload exactly as `sharedBatchStore` is today. `PayoutAccount.currentBalance` is the one genuinely business-critical number in this module that operators will expect to survive a reload in production - flagged here explicitly as the strongest argument yet for approving persistence (stronger than reporting history, which is reconstructable from source data; a manually-entered balance is not), but not assumed or built ahead of that approval.

## 13. Decisions

Recorded as **DEC-015** in DECISIONS.md: account balances and funding amounts are operational capacity data, not financial reporting. BUSINESS_RULES.md excludes "revenue, USD processed, FX margin, commission, forecasting" - none of those are computed here. A payout account balance answers "can this branch pay a beneficiary right now," the same operational question Branch Processing already answers per-transaction; it does not answer "how much did REOS make." No report or dashboard in this module sums balances into a revenue or margin figure.

## 14. Technical Debt

Recorded in TECH_DEBT.md, not fixed here:
- The legacy Treasury/Branch Liquidity/Funding system (Section 3) remains unreconciled - two conceptually related but functionally distinct systems now exist in this repository. Recommend a future decision on whether the legacy system is retired, or formally scoped as a distinct "Executive Treasury" surface outside REOS.
- No actor-role gating exists on this module's write operations (`addPayoutAccount`, `recordFunding`, etc.), matching Branch Processing's already-recorded gap (TECH_DEBT.md) rather than introducing a fourth, inconsistent gating story.
- `branchRegistryService.ts` is deliberately minimal (4 seeded branches, matching the ids already used elsewhere in REOS) - not a full branch administration module. D-7 (branch registry) is only partially closed.

## 15. Integration Strategy

- **Branch Processing**: extended, not duplicated - one new field, one new start-transition function, one new call inside the existing completion function.
- **Reporting**: extended via the existing projection layer, two new grains, reusing `reportService`'s existing generate/filter/sort pattern.
- **Dashboard**: a new, dedicated dashboard service and page, matching REPORTING_ARCHITECTURE.md Section 10's model of separate dashboard surfaces over one shared projection layer - not bolted onto the Operations Dashboard, which already has its own scope.
- **Legacy Treasury/Funding/Branch system**: not integrated, not modified, not imported from. See Section 3.

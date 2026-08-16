# Import Intelligence

Canonical architecture specification for REOS's Import Intelligence capability: the durable record of every Shared Batch import, its fingerprint, its reporting period, and the operational coverage that record makes visible. This is the first genuinely persistent data REOS has ever stored (DEC-016, exercising DEC-004's "unless explicitly approved" clause).

## 1. Purpose

Answer three questions REOS could never answer before, because nothing survived a reload:

- **What has ever been imported?** (Import History)
- **What periods and sources have real data, and where are the gaps?** (Data Coverage)
- **Has this file, or this batch reference for this period, already been imported?** (Duplicate Detection)

Files are evidence, not the system of record. Once imported, the durable fact "this was imported, with this fingerprint, covering these dates" belongs to REOS - permanently, not for the length of a browser tab.

## 2. Scope

In scope:
- A durable ledger of import events (`import_batches`, `import_beneficiaries` in Supabase).
- File fingerprinting and duplicate detection against that ledger.
- Reporting Period derivation from real business dates, never entered manually.
- Data Coverage (by reporting period, by source) and Import History views.
- The **Operational Dataset** layer (2026-08-08, Section 13): a read layer above this ledger for reporting/analytics only - Data Coverage (redesigned, richer status), Import History (redesigned, with filters and per-batch drill-down), Duplicate Management, and Historical Performance. Explicitly does not extend to Branch Processing's or Liquidity Management's live state (DECISIONS.md DEC-017).

Explicitly out of scope (confirmed in the same conversation that approved this work):
- **Multi-source ingestion.** Western Union, RIA, MoneyGram, and TerraPay are represented as a `source` column and appear in the Data Coverage grid as permanently uncovered - REOS has never imported anything from them, and no parser exists for their file formats because none has ever been seen. This is honest incompleteness, not a placeholder.
- **Migrating the live operational workflow to persistence.** Assignment, Branch Processing, Proof Management, and Liquidity Management remain exactly as they were - in-memory, per DEC-004's original default. See Section 7 and Section 10.

## 3. Existing Architecture Review

Performed before any schema or code:

- **A real Supabase project already exists and is already connected**: `remit-connect` (id `czswszihkthyicoifbtx`), wired via `.env.local` (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) and `src/lib/supabase.ts`. It had zero tables before this work - a clean slate, not a schema to reconcile.
- **Supabase Auth is already wired but never actually used.** `src/services/authService.ts` implements a complete `login`/`logout`/`getSession`/`onAuthStateChange` wrapper around `supabase.auth`, but `src/pages/auth/LoginPage.tsx` never calls it - it accepts any username/password and sets `localStorage.setItem("reos-auth", "true")`. No real Supabase session is ever established today. This directly shaped the RLS design (Section 9) - gating tables on `auth.uid()` would silently reject every query the app makes, since no query is ever made with a real session.
- **Two other Supabase projects exist on the account** (`mosabidriis@gmail.com's Project`, inactive; `remit intel dashboard`, active, unrelated) - neither is referenced by this codebase's environment configuration. Not used.
- **A separate, legacy Treasury/Branch Liquidity/Funding system** (`src/pages/branches`, `treasury`, `funding`) already has its own `SharedBatch` type (`src/types/SharedBatch.ts`) - entirely disconnected, hardcoded seed data, unrelated to REOS's real `sharedBatchStore`/`excelValidationService`. Confirms, again, that nothing under `src/pages/**` is a candidate for reuse here (same finding as LIQUIDITY_MANAGEMENT.md Section 3).

## 4. Data Model

Two tables, in the `remit-connect` Supabase project, applied as migration `import_intelligence_ledger` (plus `import_batches_validation_outcome`, 2026-08-08 - see Section 13):

```sql
import_batches
  id uuid primary key
  source text                      -- DIRECT_REMIT | WESTERN_UNION | RIA | MONEYGRAM | TERRAPAY
  file_name text
  file_checksum text                -- SHA-256 of the file's bytes
  batch_reference text
  reporting_period text             -- 'YYYY-MM', derived (Section 5)
  business_date_min date
  business_date_max date
  transaction_count integer
  total_amount numeric               -- null when the file mixes currencies
  currency text                      -- null when the file mixes currencies
  duplicate_status text              -- UNIQUE | REPLACED | MERGED
  replaces_batch_id uuid             -- self-referential, set on Replace/Merge
  uploaded_by_user_id text
  upload_timestamp timestamptz
  created_at timestamptz
  valid_record_count integer         -- Validation Outcome snapshot (Section 13); null for batches imported before 2026-08-08
  invalid_record_count integer
  manual_review_record_count integer

import_beneficiaries
  id uuid primary key
  import_batch_id uuid references import_batches(id) on delete cascade
  direct_remit_reference text
  business_date date
  beneficiary_name text
  currency text
  amount numeric
  destination_country text
  bank_name text
  account_number text
  processing_status_id text
  created_at timestamptz
```

`import_beneficiaries` is deliberately not named `beneficiaries` - it is a durable copy for coverage/duplicate-detection purposes, not the live Branch Processing queue (`branchProcessingQueueService.ts`'s `BranchProcessingQueueItem.beneficiary`), which remains the operational source of truth for a transaction's live state.

TypeScript types generated from the live schema: `src/lib/database.types.ts` (regenerate after any migration change - do not hand-edit table shapes there). Domain types: `src/features/reos/types/importIntelligence.ts`.

## 5. Duplicate Detection

Every confirmed upload is fingerprinted with SHA-256 over the file's raw bytes (`computeFileChecksum`). Before persisting, `checkForDuplicateImport` queries the ledger for:
- Any non-`REPLACED` batch with the same file checksum (the exact same file, byte for byte), or
- Any non-`REPLACED` batch with the same batch reference **and** the same derived reporting period (the same nominal import, even if the file changed slightly).

If either matches, the operator sees every match (file name, reporting period, transaction count, when and by whom it was uploaded) and chooses:

- **Replace** - the prior import is marked `REPLACED` (kept, not deleted - audit trail); the new one is persisted in full as `UNIQUE`.
- **Merge** - the prior import is left untouched; only beneficiaries whose Direct Remit Reference is **not already recorded** against it are persisted, under a new batch marked `MERGED`. Re-confirming the exact same file under Merge a second time persists zero new rows - it is naturally idempotent, not specially cased.
- **Cancel** - nothing is persisted. The live Assignment workflow is entirely unaffected either way (Section 7) - Cancel only means "don't add this to the ledger," not "undo the upload."

There is no separate "View Existing" action - the matching import's detail is always shown inline in the same dialog, so there is nothing further to navigate to before deciding.

## 6. Reporting Period

Derived, never entered manually (`deriveReportingPeriod`): the most common `YYYY-MM` among the file's real business dates (`Beneficiary.transactionDate`, captured by Sprint 17 M4/DEC-011). Using the mode rather than the min or max means one stray out-of-range row can't misclassify an entire file's period. Falls back to the current month only when no beneficiary carries a usable date - an edge case, not the common path, since Sprint 17 M4 already made real dates the normal case.

## 7. Integration with the Live Operational Workflow - the critical boundary

**Import Intelligence is additive and non-blocking.** `SharedBatchUploadPage.tsx`'s existing flow - `saveSharedBatch`, `saveBeneficiaries` into the in-memory `sharedBatchStore`, and everything downstream (Assignment, Branch Processing, Proof Management, Liquidity Management) - is completely unchanged. The only new step is: at the moment "Confirm Upload" is clicked, the app *also* checks the ledger for duplicates and *also* persists a durable record, entirely independently.

If the Supabase call fails - network issue, RLS misconfiguration, anything - `finalizeConfirm` still confirms the upload in the live workflow. The failure is surfaced as a dismissible, informational warning ("Import Intelligence: ... The live Assignment workflow is unaffected"), never a blocker. This was a deliberate design constraint, not an oversight: a new capability must not be able to break the one that already works and is already verified.

## 8. Data Coverage & Import History (original design, 2026-08-08; superseded in place by Section 13)

The original single-page design read the ledger directly (`getCoverage`, `getImportHistory`) and rendered one Source x Period grid plus a flat history table. Both capabilities still exist and still read only the ledger - they were redesigned the same day, in place, into the Operational Dataset layer described in Section 13, with a richer coverage status vocabulary and dedicated pages. `getCoverage` no longer exists (superseded by `operationalDatasetService.getCoverageMatrix`); `getImportHistory` still exists in `importIntelligenceService.ts` as the one Supabase read the Operational Dataset layer builds on (Section 13).

## 9. Security Posture

RLS is enabled on both tables. Policies are permissive to the `anon` and `authenticated` roles (`using (true) with check (true)`). This is a deliberate match to REOS's **current, already-accepted** security posture, not a new gap:

- Section 3 establishes that no real Supabase session is ever created today (`LoginPage.tsx` is a dev bypass).
- TECH_DEBT.md already records "no actor-role gating" as an open, accepted item for Branch Processing and Liquidity Management.
- Wiring real authentication is explicitly listed in BUSINESS_RULES.md as requiring approval that was not sought or given here ("Authentication changes").

Permissive RLS is therefore the only policy that doesn't silently fix (or silently break) authentication as a side effect of this work. Flagged clearly as a genuine production-readiness gap: **when real authentication is approved, these policies must be revisited** - anyone with the published anon key can currently read and write the entire import ledger.

## 10. Phase 2 - Not Done, By Design

This work approved and built persistence for the import ledger only. Explicitly not attempted, and not implied to be done:

- Migrating `sharedBatchStore.ts` (SharedBatch, Assignment) to Supabase.
- Migrating `branchProcessingQueueService.ts`'s live queue to Supabase.
- Migrating Proof Management (`proofOfPaymentService.ts`) to Supabase.
- Migrating Liquidity Management (`liquidityStore.ts` - `PayoutAccount`, `FundingEvent`) to Supabase - despite TECH_DEBT.md recording its balance as "the strongest argument yet for approving persistence," that argument is not yet acted on.

Each of the above is a real, separate migration - every currently-synchronous store function (`getSharedBatch`, `getBranchProcessingQueue`, etc.) would need to become asynchronous, which ripples into every page and component that calls them today. REPORTING_PROJECTION_LAYER.md Section 9.1 already anticipated this exact migration and designed the *reporting* side to absorb it for free (the projection layer and everything downstream is already async); the *operational* side was not built async-first, because DEC-004 didn't call for it at the time. Attempting all of it in the same pass as this ledger would have meant touching five already-working, already-verified modules without a dedicated verification pass for each - exactly the kind of regression risk this work was bound not to introduce. Recommended as its own future, explicitly-scoped initiative, module by module.

## 11. Decisions

DECISIONS.md **DEC-016** records the persistence approval and its scope. **DEC-017** (2026-08-08) records the Operational Dataset's scope - reporting/analytics only, not Branch Processing's or Liquidity Management's live state. No other decision was required - Reporting Period, Duplicate Detection, Data Coverage, Coverage Impact, and Historical Performance's growth figures are all mechanical/derived, not business-rule questions.

## 12. Technical Debt

Recorded in TECH_DEBT.md:
- Permissive RLS pending real authentication (Section 9).
- Phase 2 migration of the live operational stores is unstarted (Section 10).
- `total_amount`/`currency` on `import_batches` are `null` for any file mixing currencies - correct behavior (no invented aggregate), but means Historical Performance's per-period amounts are broken out by currency rather than blended, and are incomplete for mixed-currency files. Direct Remit's real export observed in Sprint 17 was single-currency throughout, so this has not yet been exercised against real mixed data.
- RESOLVED (2026-08-08, Section 13): individual-import beneficiary-level detail is now built (`ImportBatchDetailPage.tsx`, route `/reos/import-intelligence/history/:batchId`).
- `valid_record_count`/`invalid_record_count`/`manual_review_record_count` are `null` for any batch imported before 2026-08-08 (the column didn't exist yet) - their Validation Outcome reads "Not recorded" rather than a fabricated number, which is correct but means Import History's Validation Outcome column is incomplete for old data. There is no old data yet (the ledger was emptied of test rows before this feature shipped), so this is a theoretical gap today.
- Historical Performance's Branch comparison is not built - the ledger has no branch dimension (Section 13).

## 13. Operational Dataset (2026-08-08, DECISIONS.md DEC-017)

The read layer above this ledger, built in response to the objective "the user should no longer think about imported files, they should think about operational data." Scoped narrowly by DEC-017 after a genuine architecture conflict was raised and resolved: the instruction that prompted this layer described it as the single source of truth for Reports, Dashboards, Liquidity, Branch Processing, Historical Analytics, and Coverage - but Branch Processing's live queue state and Liquidity Management's balances were never part of Import Intelligence's scope, and DEC-016 explicitly deferred persisting the live operational workflow as separate future work. Confirmed scope: **reporting and analytics reads only** - Branch Processing and Liquidity Management keep their own in-memory state as their operational source of truth, unchanged.

**Architecture.** `operationalDatasetService.ts` reads exclusively through `importIntelligenceService.getImportHistory()`/`getImportBatchBeneficiaries()` - one Supabase query path, transformed in memory into four derived views - rather than a second, competing query path against `import_batches`/`import_beneficiaries`. This keeps `importIntelligenceService.ts` the one place that talks to the ledger tables, per its own file-header contract.

**Data Coverage (redesigned)** - Year -> Month -> Source, with four statuses derived strictly from the ledger, nothing inferred:
- `MISSING` - no batch was ever recorded for this period+source.
- `DUPLICATE` - more than one batch was ever recorded for this period+source, even if now resolved to one active batch via Replace - flagged for Duplicate Management, not hidden.
- `INCOMPLETE` - exactly one batch, but its business date range doesn't span the full calendar month (`business_date_min` day != 1, or `business_date_max` day != the month's last day).
- `IMPORTED` - exactly one batch, spanning the full month.

Page: `DataCoveragePage.tsx`, route `/reos/import-intelligence/coverage`.

**Import History (redesigned)** - every batch, most recent first, each now also carrying **Coverage Impact**: `FIRST_FOR_PERIOD` (the earliest-uploaded batch ever recorded for its source+period - it filled a coverage gap) or `ADDITIONAL` (it added onto or duplicated existing coverage), computed by sorting the ledger by upload timestamp and marking the first occurrence of each (source, reportingPeriod) pair. Filters follow the redesigned hierarchy: **primary** - Reporting Period, Source, Currency, Duplicate Status (all rendered as dropdowns); **secondary/advanced**, collapsed by default - Import Batch Reference and Uploader, reflecting that Upload Timestamp and Uploader are audit fields, not operational ones. Branch is deliberately not a filter here - the ledger has no branch dimension (branch assignment happens after import, in the live workflow, and is never persisted to this ledger). Each row links to `ImportBatchDetailPage.tsx` (`/reos/import-intelligence/history/:batchId`) - the batch's full field summary plus every durably-recorded beneficiary, closing the previously-open "no beneficiary-level detail UI" gap.

Page: `ImportHistoryPage.tsx`, route `/reos/import-intelligence/history`.

**Duplicate Management (new)** - every connected group of related imports (union-find over the same signals `checkForDuplicateImport` already uses: same file checksum; same batch reference + reporting period; plus the explicit `replaces_batch_id` chain), each group showing every reason it was flagged and every member batch side by side. Deliberately a **read/audit surface, not a second place to trigger Replace/Merge/Cancel** - those actions only make sense against a specific incoming file being checked against the ledger at the moment of upload (Section 5); there is no "replace with nothing" to retroactively apply to a past import, and the page says so.

Page: `DuplicateManagementPage.tsx`, route `/reos/import-intelligence/duplicates`.

**Historical Performance (new)** - Month-over-Month and Year-over-Year transaction-count growth (both `null`/"N/A" when either side of the comparison has zero transactions, rather than showing a division-by-zero artifact), and Source comparison (all five sources listed; only DIRECT_REMIT is ever non-zero, same honest-incompleteness pattern as Data Coverage). Amounts are broken out **by currency** per period rather than blended into one figure, since blending currencies would fabricate a number the source data doesn't support (same constraint that makes `total_amount` null for mixed-currency batches). **Branch comparison is explicitly not offered** - the ledger records what was imported, not how it was later assigned to a branch, which is a live-workflow event this layer does not read; the page states this rather than silently omitting it. Branch-scoped data remains available in Reports, reading the live operational stores as it always has.

Page: `HistoricalPerformancePage.tsx`, route `/reos/import-intelligence/performance`.

**Import Experience.** `SharedBatchUploadPage.tsx`'s post-confirm banner now shows the full field set immediately: Reporting Period, Business Date range, Source, Transaction count, Total Amount, Duplicate Status, Validation Outcome, and Coverage Impact (via the shared `ImportRecordSummary.tsx` component, also used by `ImportBatchDetailPage.tsx` so the two never drift into two different summaries of the same record). Coverage Impact is computed as a best-effort follow-up call after `persistImport` succeeds - it never blocks or overrides the import record itself if it fails.

**Validation Outcome persistence.** A new migration (`import_batches_validation_outcome`) added `valid_record_count`/`invalid_record_count`/`manual_review_record_count` to `import_batches` - a snapshot of the validation summary the operator saw at Confirm Upload, now durable rather than living only in `SharedBatchUploadPage.tsx`'s transient component state. This closes the "Import History has no Validation Outcome" gap without inventing new business logic - it persists a summary `excelValidationService` already computes.

**What was deliberately not built**, and why - see Section 12 and DECISIONS.md DEC-017:
- Branch Processing and Liquidity Management do not read through this layer.
- Branch comparison in Historical Performance.
- Retroactive Replace/Merge from Duplicate Management.
- Wiring Import-Ledger-driven data into the existing `reportService.ts`/`ReportsPage.tsx` - that family of reports remains scoped to `reportingProjectionService` (live operational data), per REPORTING_STANDARDS.md's existing architecture. "Reports" (operational) and "Historical Performance" (import-ledger) are two distinct report families reading two distinct data sources, matching the two-source architecture DEC-004/DEC-016 already established, not merged into one filter model.

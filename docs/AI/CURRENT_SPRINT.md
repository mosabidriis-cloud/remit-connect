# CURRENT SPRINT

Version: 17.1

Status: SPRINT 17 IN PROGRESS - MILESTONE 1 (Row Structure Detection) and MILESTONE 2 (Column Contract) COMPLETE. M3 ONWARD NOT YET STARTED.

Last Updated: 2026-08-02

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

Sprint 16's log is preserved in git through commit `5ad316a` (M1 through M4.4). **M4.5 was never committed**, so its record is retained verbatim in the Appendix at the end of this file rather than lost. Commit Sprint 16 before that appendix is trimmed.

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
| 7 | Two row layouts in one file: 37 rows carry `Bank = "BANK OF KHARTOUM (Acc No: 4734114)"`; 26 rows carry the bank name in the `Dest Country` column and a bare account number in `Bank` | M3 |
| 8 | `parseBankField` does not recognise the `(Acc No: ...)` form - fails on all 63 rows | M3 (DEC-012) |
| 9 | `transactionDate` is never captured, though the file has a `Date` column (`DD/MM/YYYY`) | M4 (DEC-011) |

## Milestones

- **M1 - Row Structure Detection: COMPLETE.** Locate the header row; ignore leading blank rows, repeated page headers, and blank data rows. Detail below.
- **M2 - Column Contract: COMPLETE.** Alias-based column resolution, structural transaction-row detection (DEC-013), tolerant amount parsing. Detail below.
- **M3 - Bank Field: NOT STARTED.** One shared `parseBankField` (DEC-012) handling the `(Acc No: ...)` form and both row layouts. **This is the milestone that makes the import succeed** - `Bank Name` and `Account Number` are the only required columns still unresolved.
- **M4 - Transaction Date: NOT STARTED.** Capture the `Date` column, converting `DD/MM/YYYY` to ISO (DEC-011).
- **M5 - Stabilization & Closure: NOT STARTED.** Runtime verification with the real file, documentation sync, final validation.

## Allowed Directories

M1 and M2: `src/features/reos/services/**` and `docs/AI/**`. No page, component, type, route or business rule was modified in either.

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

## Acceptance Criteria (sprint-level)

- The real Direct Remit export imports, with valid rows imported and invalid rows flagged (DEC-008, DEC-009).
- Transaction dates are captured (DEC-011).
- Exactly one `parseBankField` implementation exists and every import path uses it (DEC-012).
- Bank names are imported as written; no normalization (DEC-010).
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

Note that **DEC-011 closes a Sprint 16 finding**: capturing the transaction date will make transaction-level date columns, date filters, and the dashboard's "Transactions Today" work for the first time.

---

## Appendix - Sprint 16 M4.5 (retained because it was never committed)

Delete this appendix once Sprint 16 is committed.

### M4.5 - Operations Dashboard Integration: COMPLETE AND VERIFIED LIVE

The last page still on the legacy data path. `OperationsDashboardPage.tsx` sourced `OperationsDashboardSourceData` from `location.state`, nothing navigated there with it, and every KPI rendered `0` for a real user.

**What changed - only the data source:**
- `services/dashboardService.ts`: `buildOperationsDashboard` now takes reporting projections (`OperationsDashboardProjections`) instead of operational entities. It no longer reads or knows about `SharedBatch`, `BranchProcessingBatch` or `ProofDownloadBatch`. **Its output type is unchanged**, so every widget renders exactly as before. Branch rows take their queue counts verbatim from `BranchReportProjection`, which the projection layer fills from `getBranchProcessingQueueSummary` - nothing is recomputed.
- `services/reportService.ts`: added `generateOperationsDashboard(scope, role)`, which gathers the four projections through its own generate operations and hands them to `dashboardService` for view-model assembly. It exists so the page has exactly one service dependency.
- `pages/OperationsDashboardPage.tsx`: `useLocation` and all `location.state` handling removed; consumes `reportService` only, with an error box matching the ReportsPage pattern. Layout, cards, alerts, tables, drill-down behaviour and styling are untouched, and **no component was modified**.

**Dead code removed with `location.state`:** the `OperationsDashboardLocationState` type, the role-from-state plumbing, the unreachable `GENERAL_MANAGER` notice block and its `formatRole` helper, and in `dashboardService` the `revenueRate` input, `sumUsdValue`, and the `OperationsDashboardSourceData` dependency.

**Architectural note.** REPORTING_ARCHITECTURE.md Section 10.1 says Reporting and Dashboards are sibling consumers of the projection layer and that "neither service calls the other". M4.5's approved scope required the page to consume **only** `reportService`, which means `reportService` must expose the dashboard operation and therefore call `dashboardService`. The intent of 10.1 is preserved: `reportService` supplies projections and nothing else, and `dashboardService` still owns every dashboard aggregate. Section 10.1 should be amended to describe this arrangement.

**Two KPI groups deliberately left at zero:** USD Value / Revenue / USD Processed (financial, out of scope per REPORTING_STANDARDS.md, D-9); and Transactions Today / Transactions Processed / Average Processing Time (no transaction date on import, no completion timestamp - D-6).

**Runtime verification (M4.5):** the full chain was re-run in a browser on a fresh store with a 2-row fixture and real proof uploads, all navigation client-side. Empty dashboard correct before data. After the workflow: Ready For Download `1` while the batch sat at that status, Completed Batches correctly `0` once past it, Branch Performance `Port Sudan Branch / 2 transactions / 0 errors / 0 returns / 0 workload / YELLOW`, a real Work Queue row (`Ready For Download / DR-M45-BATCH / PORT_SUDAN / 1 min`), Branch Ranking naming Port Sudan Branch, all Exception counters correct. Marking the batch downloaded moved Ready For Download `1 -> 0` and Downloaded Batches `0 -> 1` and emptied the Work Queue, without a reload. Branch, processing and proof statistics all matched the underlying queue exactly. Client-side navigation preserved state throughout. No regression in Reporting; no new console errors.

**Validation:** `tsc` clean; `npm run build` succeeded, 135 modules, JS 758.75 kB, bundle hash changed.

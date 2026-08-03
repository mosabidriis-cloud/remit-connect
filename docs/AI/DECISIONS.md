# Decisions

## Template

- Date:
- Decision:
- Context:
- Rationale:
- Status:

## Log

### DEC-001 - Direct Remit is the source of truth

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: Direct Remit remains the source of truth for Direct Remit batches. REOS owns operational workflow and audit only.
- Context: ARCHITECTURE.md data ownership boundary; BUSINESS_RULES.md source of truth.
- Rationale: REOS is an operational workflow and audit layer, not a system of record.
- Status: APPROVED

### DEC-002 - SharedBatch remains the parent object

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: SharedBatch is the parent object once a Direct Remit batch is created into REOS. One Shared Batch is assigned to exactly one branch and cannot be split across branches.
- Context: BUSINESS_RULES.md frozen rules.
- Rationale: Keeps batch assignment and lifecycle unambiguous and auditable.
- Status: APPROVED

### DEC-003 - One transaction belongs to exactly one BranchAssignment

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: A transaction belongs to exactly one BranchAssignment. Shared Batches cannot be split across multiple branches.
- Context: BUSINESS_RULES.md frozen rules.
- Rationale: Preserves single-branch accountability for processing and audit.
- Status: APPROVED

### DEC-004 - Current implementation is in-memory only

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: No persistence is implemented unless explicitly approved by the active sprint. Current REOS implementation is in-memory only.
- Context: ARCHITECTURE.md persistence boundary.
- Rationale: Avoids committing to storage/schema decisions while workflow and UI are still stabilizing. Tracked as ongoing debt - see TECH_DEBT.md (Persistence).
- Status: APPROVED

### DEC-005 - Sprint scope is frozen once approved

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: Once a sprint's scope is approved in CURRENT_SPRINT.md, it is frozen for that sprint. Expanding scope mid-sprint requires an explicit new decision, not in-flight assumption.
- Context: CURRENT_SPRINT.md; WORKFLOW.md; DEFINITION_OF_DONE.md.
- Rationale: Prevents scope creep and keeps sprint acceptance criteria verifiable.
- Status: APPROVED

### DEC-006 - branchAssignmentService.ts is the canonical Assignment workflow

- Date: Approved 2026-08-01 (Sprint 14 Milestone 1.5)
- Decision: `branchAssignmentService.ts` (`assignSharedBatchToBranch` / `reassignSharedBatch`) is the only entry point that may create or update an `Assignment`. It enforces the frozen role rules (Direct Remit Officer assigns; Operations Manager reassigns) and the one-branch-per-batch lock. Internally it calls `assignmentService.createAssignment` to build the `Assignment` record (beneficiary ready/manual-review/invalid triage) - that function is now an internal implementation detail and must not be called directly from pages or components.
- Context: Two independent Assignment-creation paths were found during Sprint 14 Milestone 1 (`SharedBatchUploadPage.tsx` calling `assignmentService.createAssignment` inline, with no role or lock enforcement, vs. `BranchAssignmentPage.tsx` calling `branchAssignmentService.ts`, which enforced the rules but never produced an `Assignment` object). Consolidated in Milestone 1.5.
- Rationale: `branchAssignmentService.ts` already enforced BUSINESS_RULES.md's role and locking rules; `assignmentService.createAssignment` already correctly built the `Assignment` record Branch Processing depends on. Combining them under one canonical entry point removes the duplicate ownership without discarding either implementation.
- Status: APPROVED

### DEC-007 - Reporting may read operational data through read-only enumerators

- Date: Approved 2026-08-02 (Sprint 16, first implementation milestone - recorded as M4.1)
- Decision: The Reporting module may enumerate operational data enterprise-wide through additive, read-only accessors on the owning stores/services. Approved as REPORTING_ARCHITECTURE.md / REPORTING_PROJECTION_LAYER.md Decision D-4. Three accessors are approved: `getAllSharedBatches` and `getAllAssignments` (`sharedBatchStore.ts`), and `getAllBranchProcessingQueueItems` (`branchProcessingQueueService.ts`). Each must return copies, must never expose an internal collection, must never trigger hydration, and must never modify lifecycle or processing state.
- Context: `sharedBatchStore.ts` exposed only single-record and per-branch reads, and `branchProcessingQueueService.ts` only a per-branch read, so Reporting could not assemble an enterprise-wide result set without knowing every branch id in advance. BUSINESS_RULES.md gives the Operations Manager enterprise-wide visibility as a frozen rule, so this was a genuine capability gap. Recorded in TECH_DEBT.md during the Sprint 16 architecture review.
- Rationale: The alternative - letting Reporting reach into store internals, or having pages aggregate directly - would duplicate store logic and hard-wire consumers to the current in-memory shape. Additive read accessors keep each module the owner of its own data (ARCHITECTURE.md), change no transition, validation rule, or existing signature, and leave DEC-004's persistence boundary untouched. Ownership is unaffected: Reporting owns nothing it reads, and DEC-006 continues to reserve Assignment creation and update to `branchAssignmentService.ts`.
- Status: APPROVED

### DEC-008 - The real Direct Remit Excel export is the supported import contract

- Date: Approved 2026-08-02 (Sprint 17)
- Decision: The layout of the production Direct Remit export (`transactionhistoryRpt` worksheet: `Payout Ref. No`, `Date`, `Receiver Name`, `CCY`, `FC Amount`, `Dest Country`, `Bank`) is the supported import contract for Shared Batch upload.
- Context: A real sample was analysed on 2026-08-02 and run through the shipped `excelValidationService`. It failed completely - 0 valid records from 63 real transactions, all six required columns reported missing - because the service expected a different column set, assumed the header was the first row, and could not parse comma-formatted amounts.
- Rationale: REOS cannot require Direct Remit to change its export format; the importer must accept what the source system actually produces. Fixing the importer is cheaper and lower-risk than a data-entry or transformation step between the two systems.
- Status: APPROVED

### DEC-009 - Partial import with invalid rows flagged for review

- Date: Approved 2026-08-02 (Sprint 17)
- Decision: The importer imports valid rows and flags invalid rows for review rather than rejecting the whole file.
- Context: The real export mixes clean rows with rows whose bank and account data sit in different columns, plus non-transaction rows.
- Rationale: Consistent with the existing frozen rule for duplicate Direct Remit References ("Import all records. Flag duplicate transactions. Do not automatically reject the batch."), so the same operator experience applies to every kind of bad row.
- Status: APPROVED

### DEC-010 - Bank name normalization is out of scope for Sprint 17

- Date: Approved 2026-08-02 (Sprint 17)
- Decision: Bank names are imported as written. No normalization, aliasing or fuzzy matching in this sprint.
- Context: The real file spells one bank at least nine ways across two scripts, including a typo (`BANK OF KHARTOUM`, `Bank of Khartoum`, `ALKHARTOUM`, `KHARTOUM BANK`, `khartoum`, `بنك الخرطوم`, `الخرطوم`, `BANK OF KHATOUM`).
- Rationale: Deciding that two spellings are the same bank is an operations judgement with routing consequences, not a parsing detail. Recorded as future work rather than guessed at.
- Status: APPROVED

### DEC-011 - Transaction dates are captured from the Excel file

- Date: Approved 2026-08-02 (Sprint 17)
- Decision: The importer captures the transaction date from the export's `Date` column into `Beneficiary.transactionDate`.
- Context: `excelValidationService` currently sets `transactionDate: ""` on every imported beneficiary. Sprint 16 M4.4 recorded the consequences: transaction-level reports show "None" for every date, date filters cannot narrow transaction rows, and the dashboard's "Transactions Today" is permanently 0.
- Rationale: The data exists in the source file; not capturing it degrades reporting for no reason.
- Status: APPROVED

### DEC-012 - One shared parseBankField implementation

- Date: Approved 2026-08-02 (Sprint 17)
- Decision: There shall be exactly one `parseBankField` implementation, used by every import path.
- Context: BUSINESS_RULES.md freezes the rule "Bank field is parsed into bankName and accountNumber". It is implemented once, in `sharedBatchService.parseBankField`, on a CSV path nothing calls; the live path (`excelValidationService`) instead demands separate Bank Name and Account Number columns, contradicting the frozen rule. Tested against the real file, the existing `parseBankField` also fails on all 63 rows because it does not recognise the `(Acc No: ...)` form.
- Rationale: Same reasoning as DEC-006 for Assignment: one frozen business rule deserves one implementation. Two divergent parsers is the duplication class Sprints 13, 14 and 15 each had to undo.
- Status: APPROVED

### DEC-013 - Transaction rows are identified structurally, by transaction identifier

- Date: Approved 2026-08-02 (Sprint 17 Milestone 2)
- Decision: A row is a transaction row if and only if it carries a transaction identifier (Direct Remit Reference / Payout Ref. No). Rows without one are not transactions and are skipped, including subtotal rows. Detection must not rely on display text. Required columns are resolved through an alias table, so the legacy format and the Direct Remit export share one import path.
- Context: The approved export is a paginated report. It interleaves blank spacer rows, repeats its header at each page break, and writes a `TOTAL` subtotal row per page section. Sprint 17 M1 removed the blank rows and repeated headers, but the three subtotal rows survived as phantom invalid records - visible to the operator under DEC-009 as bogus rows needing review on every import.
- Rationale: The presence of a reference is a structural property of a transaction; the word "TOTAL" is presentation text that may be localised or restyled at any time, and this export is already bilingual. Alias-based column resolution avoids a second parser or a per-format branch, keeping one code path for both contracts.
- Consequence, accepted: a row that carries data but no reference is now skipped silently rather than flagged invalid. That is correct for subtotal rows; for a genuinely malformed transaction missing only its reference it means the row disappears rather than being reported. Recorded in TECH_DEBT.md.
- Status: APPROVED

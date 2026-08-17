# REOS Business Rules

## Project

REOS (Remit Exchange Operations System) is an internal employee-only operations portal for Remit Exchange.

## Source of Truth

- CURRENT_SPRINT.md is the authoritative definition for the active module.
- Direct Remit remains the source of truth for Direct Remit batches.
- REOS owns operational workflow and audit only.

## Approved Business Flow

1. Direct Remit Officer uploads a Direct Remit batch.
2. Direct Remit Officer validates the uploaded batch.
3. REOS parses beneficiary records.
4. REOS normalizes the Bank field into bankName and accountNumber.
5. REOS detects duplicate Direct Remit References and flags duplicates for manual review.
6. Direct Remit Officer creates a Shared Batch.
7. Direct Remit Officer manually assigns the Shared Batch to one branch (DECISIONS.md DEC-025, reverses DEC-014's move of this step to Operations Manager); Operations Manager may also perform initial assignment as a backup/override.
8. The Shared Batch becomes locked immediately after assignment.
9. Branch Officer processes assigned transactions only.
10. Branch Officer uploads one or more proof-of-payment screenshots for completed transactions.
11. Direct Remit Officer downloads proof-of-payment files and uploads proofs back to Direct Remit.

## Approved Roles

### Operations Manager

- Owns the system lifecycle.
- Manages users, branches, audit, reports, dashboards, settings, and master data.
- May assign Shared Batches to branches as a backup/override (DECISIONS.md DEC-025; the Direct Remit Officer is the primary actor for initial assignment).
- Reassigns Shared Batches as an administrative override - the only role that may reassign (DECISIONS.md DEC-006, DEC-014).

### Direct Remit Officer

- Owns the batch lifecycle.
- Uploads Direct Remit batches.
- Validates uploaded batches.
- Creates Shared Batches.
- Assigns Shared Batches to branches - initial assignment only (DECISIONS.md DEC-025, reverses DEC-014's move of this step to Operations Manager).
- Views current branch payout account balances/liquidity positions, read-only, to inform branch assignment routing (DECISIONS.md DEC-026).
- Views completed batches.
- Downloads proof-of-payment files.
- Uploads proofs back to Direct Remit.
- Does not process branch transactions.
- Does not reassign Shared Batches - reassignment remains Operations-Manager-only (DECISIONS.md DEC-006, unaffected by DEC-025).

### Branch Officer

- Belongs to one branch.
- Processes assigned transactions only.
- Views assigned batches only.
- Opens assigned batches.
- Views imported transaction data.
- Uploads one or more proof-of-payment screenshots.
- Completes transactions.
- Establishes and maintains their own branch's daily payout account listing - create, edit, enable/disable payout accounts, and record funding received (top-ups) against them (DECISIONS.md DEC-027, reverses DEC-024's OM-only account creation for this own-branch case).
- Returns transactions.
- Cannot assign or reassign Shared Batches.
- Can only view Shared Batches assigned to their branch.
- Cannot edit imported data.
- Cannot delete completed transactions.
- Cannot manage users.

## Frozen Rules

- One User = One Role.
- One User = One Branch.
- Operations Manager has enterprise-wide visibility.
- Imported beneficiary data is read-only.
- Direct Remit Reference is the operational transaction identifier.
- Bank field is parsed into bankName and accountNumber.
- Read-only transaction fields include Direct Remit Reference, Beneficiary Name, Bank Name, Account Number, Amount, Currency, and Transaction Date.
- One Shared Batch is assigned to exactly one branch.
- Shared Batches cannot be split across multiple branches.
- Batch assignment is manual.
- Batch becomes locked immediately after assignment.
- Branch Officers cannot edit imported beneficiary information.
- No manual amount entry.
- No transfer reference entry.
- A transaction may contain multiple proof-of-payment screenshots.
- Proof uploads consist only of image files.
- A transaction cannot be completed until at least one proof exists.
- Return Transaction requires a predefined Return Reason and may include an optional comment.
- Proof-of-payment files are temporary.
- Proof-of-payment files are automatically deleted 90 minutes after upload.
- Only proof metadata remains permanently.
- REOS responsibility ends after the Direct Remit Officer downloads proof files.

## Out of Scope Unless Explicitly Approved

- Treasury
- Cash Pickup
- Banking Core
- ERP
- CRM
- Generic approval workflows
- Generic workflow engine
- Notifications
- Supabase persistence
- Authentication changes
- Automatic cleanup scheduler

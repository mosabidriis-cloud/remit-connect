# CURRENT SPRINT

Version: 1.0

Status: Active

## Module

Sprint 6 - Credit-to-Account Processing

## Authority

This document is the authoritative definition for the active REOS module.

## Business Goal

Allow Branch Officers to process assigned Credit-to-Account transactions while preserving complete operational audit.

## Branch Officer Scope

Branch Officers may:

- View assigned batches only.
- Open assigned batches.
- View imported transaction data.
- Upload one or more proof-of-payment screenshots.
- Complete transactions.
- Return transactions.

Branch Officers may not:

- Edit imported data.
- Assign batches.
- Reassign batches.
- Delete completed transactions.
- Manage users.

## Direct Remit Officer Scope

Direct Remit Officers may:

- View completed batches.
- Download proof-of-payment files.

Direct Remit Officers may not process transactions.

## Operations Manager Scope

Operations Managers may:

- View all branches.
- View all transactions.
- View processing.
- Use administrative override only where already defined.

## Processing Rules

- Imported transaction data is read-only.
- Read-only fields include Direct Remit Reference, Beneficiary Name, Bank Name, Account Number, Amount, Currency, and Transaction Date.
- Direct Remit Reference is the operational transaction identifier.
- A transaction may contain multiple proof-of-payment screenshots.
- No manual amount entry.
- No transfer reference entry.
- Proof uploads consist only of image files.
- A transaction cannot be completed until at least one proof exists.
- Return Transaction requires a predefined Return Reason and may include an optional comment.
- REOS responsibility ends after the Direct Remit Officer downloads proof files.
- Proof cleanup architecture must be prepared, but no automatic deletion scheduler is implemented.

## Allowed Directories

src/features/reos/types

src/features/reos/services

src/features/reos/components

src/features/reos/pages

src/features/reos/routes

## Out of Scope

- Dashboard
- Reports
- Notifications
- Scheduler
- Automatic cleanup
- Persistence
- Authentication changes
- Supabase changes
- Direct Remit upload

## Acceptance Criteria

- Module compiles.
- Production build succeeds.
- Existing User Management continues working.
- Shared Batch Management continues working.
- Branch Assignment continues working.
- No unrelated application modules are modified.
- Processing screen supports speed-focused branch transaction processing.
- Proof uploads accept image files only.
- Completion requires at least one proof.
- Returns require a predefined Return Reason.

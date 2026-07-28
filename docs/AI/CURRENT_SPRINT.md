# CURRENT SPRINT

Version: 1.0

Status: Active

## Module

Sprint 7 - Proof Download

## Authority

This document is the authoritative definition for the active REOS module.

## Business Goal

Allow the Direct Remit Officer to download proof-of-payment files after a Shared Batch has completed processing.

## Direct Remit Officer Scope

Direct Remit Officers may:

- View completed batches.
- Open Batch Download Summary.
- Download all proofs as ZIP.
- Download individual proof images.
- Mark Shared Batch as DOWNLOADED.

Direct Remit Officers may not:

- Edit transactions.
- Upload proofs.
- Delete proofs.
- Modify beneficiary information.

## Operations Manager Scope

Operations Managers may:

- Monitor completed batch proof download status in read-only mode.

## Branch Officer Scope

Branch Officers have no new permissions in this sprint.

## Workflow

COMPLETED

READY_FOR_DOWNLOAD

Batch Download Summary

Download ZIP

Optional Download Individual Proof

Confirm

DOWNLOADED

REOS Workflow Complete

## Lifecycle

Use the existing lifecycle:

- ASSIGNED
- PROCESSING
- COMPLETED
- READY_FOR_DOWNLOAD
- DOWNLOADED

Never use a boolean Downloaded flag.

## Batch Download Summary

Display:

- Shared Batch Reference
- Direct Remit Batch Reference
- Assigned Branch
- Number of Transactions
- Number of Proof Images
- Completed Transactions
- Returned Transactions
- Processing Status
- Download Status
- Completed By
- Completed Time
- Downloaded By
- Downloaded Time

## Actions

Primary action:

- Download ZIP

Secondary action:

- Download Individual Proof

Before marking DOWNLOADED, show:

"This action completes the REOS operational workflow for this batch."

Buttons:

- Cancel
- Confirm

## Allowed Directories

src/features/reos/types

src/features/reos/services

src/features/reos/components

src/features/reos/pages

src/features/reos/routes

src/features/reos/constants

## Out of Scope

- Dashboard
- Reports
- Notifications
- Scheduler
- Persistence
- Supabase
- Authentication
- Direct Remit API Integration

## Acceptance Criteria

- Module compiles.
- Production build succeeds.
- Existing User Management continues working.
- Shared Batch Management continues working.
- Branch Assignment continues working.
- No unrelated application modules are modified.
- Batch Download Summary displays required fields.
- Direct Remit Officer can download all proof images as ZIP.
- Direct Remit Officer can download individual proof images.
- Direct Remit Officer can mark a Shared Batch as DOWNLOADED.
- Operations Manager access remains read-only.
